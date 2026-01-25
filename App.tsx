
import React, { useState, useEffect, useMemo } from 'react';
import HeroInput from './components/HeroInput';
import TestPlanDisplay from './components/TestPlanDisplay';
import LoadingScreen from './components/LoadingScreen';
import TestDataForm from './components/TestDataForm';
import Sidebar from './components/Sidebar';
import ArtifactManager from './components/ArtifactManager';
import ScriptGenerator from './components/ScriptGenerator';
import QualityMetricsReport from './components/QualityMetricsReport';
import { TestPlan, TestRequirementsAnalysis, TestDataItem, ArtifactScope, SavedSession, User, GeneratedScript, GenerationConfig, TestCase } from './types';
import { generateTestPlan, analyzeRequirements, generateMoreTestCases, regenerateTestCase } from './services/geminiService';

type GeneratorState = 'IDLE' | 'ANALYZING' | 'CONFIGURING' | 'GENERATING' | 'DISPLAY';
type AppView = 'GENERATOR' | 'PLANS' | 'SUITES' | 'CASES' | 'CHECKLISTS' | 'SCRIPTS' | 'METRICS';

const App: React.FC = () => {
  // Global App State - Default to Guest
  const [currentUser] = useState<User>({
    id: 'guest_user',
    name: 'Guest Tester',
    email: 'guest@beforeeach.ai',
    role: 'USER',
    createdAt: Date.now()
  });
  
  const [currentView, setCurrentView] = useState<AppView>('GENERATOR');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Data State
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);

  // Generator State
  const [state, setState] = useState<GeneratorState>('IDLE');
  const [url, setUrl] = useState('');
  const [requirements, setRequirements] = useState<TestRequirementsAnalysis | null>(null);
  const [testData, setTestData] = useState<TestDataItem[]>([]);
  const [artifactScope, setArtifactScope] = useState<ArtifactScope>('ALL');
  const [generationConfig, setGenerationConfig] = useState<GenerationConfig | undefined>(undefined);
  const [testPlan, setTestPlan] = useState<TestPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [generatingSuiteIndices, setGeneratingSuiteIndices] = useState<number[]>([]);
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Initialize
  useEffect(() => {
    // Dark mode
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }

    // Load Sessions
    try {
      const storedSessions = localStorage.getItem('beforeeach_saved_sessions');
      if (storedSessions) {
        setSavedSessions(JSON.parse(storedSessions));
      }
    } catch (e) {
      console.error("Failed to load saved sessions", e);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // --- Session Data Handlers ---
  const userSessions = useMemo(() => {
    return savedSessions; // Show all sessions since auth is removed
  }, [savedSessions]);

  const currentSession = useMemo(() => {
    return userSessions.find(s => s.id === currentSessionId) || null;
  }, [userSessions, currentSessionId]);

  const persistSessionUpdate = (updatedSession: SavedSession) => {
    // Ensure ownership
    const sessionToSave = { ...updatedSession, userId: currentUser.id };

    setSavedSessions(prev => {
      const exists = prev.findIndex(s => s.id === sessionToSave.id);
      let newSessions;
      if (exists >= 0) {
        newSessions = [...prev];
        newSessions[exists] = sessionToSave;
      } else {
        newSessions = [sessionToSave, ...prev];
      }
      localStorage.setItem('beforeeach_saved_sessions', JSON.stringify(newSessions));
      return newSessions;
    });
  };

  const deleteSession = (sessionId: string) => {
    const updatedSessions = savedSessions.filter(s => s.id !== sessionId);
    setSavedSessions(updatedSessions);
    localStorage.setItem('beforeeach_saved_sessions', JSON.stringify(updatedSessions));
    if (currentSessionId === sessionId) {
      handleReset();
    }
  };

  const handleRenameSessionById = (id: string, newName: string) => {
    const session = savedSessions.find(s => s.id === id);
    if (session) {
      persistSessionUpdate({ ...session, name: newName });
    }
  };

  // --- Generator Logic ---

  const handleAnalyze = async (inputUrl: string, initialCredentialData?: TestDataItem[], config?: GenerationConfig) => {
    setState('ANALYZING');
    setUrl(inputUrl);
    setError(null);
    
    const initialData = initialCredentialData || [];
    setTestData(initialData);
    setGenerationConfig(config);

    // Auto Save Start
    const newSessionId = Date.now().toString();
    setCurrentSessionId(newSessionId);
    
    let hostname = inputUrl;
    try { hostname = new URL(inputUrl).hostname; } catch (e) { /* ignore */ }

    const newSession: SavedSession = {
      id: newSessionId,
      userId: currentUser.id,
      name: hostname,
      timestamp: Date.now(),
      url: inputUrl,
      plan: null,
      testData: initialData,
      requirements: null,
      artifactScope: 'ALL',
      generationConfig: config
    };
    persistSessionUpdate(newSession);

    try {
      const existingKeys = initialData.map(d => d.key);
      const result = await analyzeRequirements(inputUrl, existingKeys);
      setRequirements(result);
      setState('CONFIGURING');
      persistSessionUpdate({ ...newSession, requirements: result });
    } catch (err: any) {
      setError(err.message || "Failed to analyze website requirements.");
      setState('IDLE');
    }
  };

  const handleGenerate = async (data: TestDataItem[], scope: ArtifactScope, config?: GenerationConfig) => {
    setTestData(data);
    setArtifactScope(scope);
    if(config) setGenerationConfig(config);
    
    setState('GENERATING');
    setError(null);
    try {
      const plan = await generateTestPlan(url, data, scope, config || generationConfig);
      setTestPlan(plan);
      setState('DISPLAY');

      if (currentSessionId) {
        const session = userSessions.find(s => s.id === currentSessionId);
        if (session) {
          persistSessionUpdate({
            ...session,
            testData: data,
            artifactScope: scope,
            plan: plan,
            generationConfig: config || generationConfig,
            timestamp: Date.now()
          });
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate test plan.");
      setState('CONFIGURING');
    }
  };

  const handleGenerateMore = async (suiteIndex: number, focusType?: string, count: number = 3) => {
    if (!testPlan || !currentSessionId) return;
    
    setGeneratingSuiteIndices(prev => [...prev, suiteIndex]);
    
    const suite = testPlan.suites[suiteIndex];
    try {
      let newCases = await generateMoreTestCases(url, suite, testData, focusType, count);
      
      // Mark as new for highlighting
      newCases = newCases.map(c => ({ ...c, isNew: true }));

      setTestPlan(prevPlan => {
        if (!prevPlan) return null;
        const updatedPlan = { ...prevPlan };
        updatedPlan.suites = [...prevPlan.suites];
        updatedPlan.suites[suiteIndex] = {
           ...updatedPlan.suites[suiteIndex],
           cases: [...updatedPlan.suites[suiteIndex].cases, ...newCases]
        };
        
        const currentSession = userSessions.find(s => s.id === currentSessionId);
        if (currentSession) persistSessionUpdate({ ...currentSession, plan: updatedPlan });
        
        return updatedPlan;
      });

    } catch (e) {
      console.error(e);
      alert("Failed to generate more cases.");
    } finally {
      setGeneratingSuiteIndices(prev => prev.filter(i => i !== suiteIndex));
    }
  };

  const handleRegenerateCase = async (suiteIndex: number, caseIndex: number, newTestData: TestDataItem[]) => {
    if (!testPlan || !currentSessionId) return;
    const suite = testPlan.suites[suiteIndex];
    const originalCase = suite.cases[caseIndex];
    try {
       const updatedCase = await regenerateTestCase(url, originalCase, newTestData);
       // Preserve isNew status if it was new
       updatedCase.isNew = originalCase.isNew;
       
       const updatedPlan = { ...testPlan };
       updatedPlan.suites[suiteIndex].cases[caseIndex] = updatedCase;
       setTestPlan(updatedPlan);
       
       const currentSession = userSessions.find(s => s.id === currentSessionId);
       if (currentSession) persistSessionUpdate({ ...currentSession, plan: updatedPlan });
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleUpdateTestCase = (suiteIndex: number, caseIndex: number, updatedCase: TestCase) => {
    if (!testPlan || !currentSessionId) return;
    const newPlan = { ...testPlan };
    newPlan.suites[suiteIndex].cases[caseIndex] = updatedCase;
    setTestPlan(newPlan);
    
    const currentSession = userSessions.find(s => s.id === currentSessionId);
    if (currentSession) persistSessionUpdate({ ...currentSession, plan: newPlan });
  };

  const handleUpdatePlan = (updatedPlan: TestPlan) => {
    setTestPlan(updatedPlan);
    if (currentSessionId) {
      const currentSession = userSessions.find(s => s.id === currentSessionId);
      if (currentSession) persistSessionUpdate({ ...currentSession, plan: updatedPlan });
    }
  };

  const handleDeleteSuite = (suiteIndex: number) => {
    if (!testPlan || !currentSessionId) return;
    const newPlan = { ...testPlan };
    newPlan.suites = newPlan.suites.filter((_, idx) => idx !== suiteIndex);
    setTestPlan(newPlan);
    
    const currentSession = userSessions.find(s => s.id === currentSessionId);
    if (currentSession) persistSessionUpdate({ ...currentSession, plan: newPlan });
  };

  const handleDeleteCase = (suiteIndex: number, caseIndex: number) => {
    if (!testPlan || !currentSessionId) return;
    const newPlan = { ...testPlan };
    newPlan.suites[suiteIndex] = {
      ...newPlan.suites[suiteIndex],
      cases: newPlan.suites[suiteIndex].cases.filter((_, idx) => idx !== caseIndex)
    };
    setTestPlan(newPlan);
    
    const currentSession = userSessions.find(s => s.id === currentSessionId);
    if (currentSession) persistSessionUpdate({ ...currentSession, plan: newPlan });
  };

  const handleSaveScript = (sessionId: string, script: GeneratedScript) => {
    const session = userSessions.find(s => s.id === sessionId);
    if (session) {
      const updatedScripts = [...(session.generatedScripts || []), script];
      persistSessionUpdate({
        ...session,
        generatedScripts: updatedScripts
      });
    }
  };

  const handleReset = () => {
    setState('IDLE');
    setUrl('');
    setRequirements(null);
    setTestData([]);
    setArtifactScope('ALL');
    setGenerationConfig(undefined);
    setTestPlan(null);
    setError(null);
    setCurrentSessionId(null);
    setCurrentView('GENERATOR');
  };

  const handleLoadSession = (session: SavedSession) => {
    setCurrentSessionId(session.id);
    setUrl(session.url);
    setTestData(session.testData);
    setRequirements(session.requirements);
    setArtifactScope(session.artifactScope);
    setGenerationConfig(session.generationConfig);

    if (session.plan) {
      setTestPlan(session.plan);
      setState('DISPLAY');
    } else if (session.requirements) {
      setState('CONFIGURING');
    } else {
      setState('IDLE');
      handleAnalyze(session.url, session.testData, session.generationConfig);
    }
    setCurrentView('GENERATOR');
  };

  const handleSaveSessionName = (name: string) => {
    if (!currentSessionId) return;
    const currentSession = userSessions.find(s => s.id === currentSessionId);
    if (currentSession) {
      persistSessionUpdate({ ...currentSession, name: name });
    }
  };

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-300 flex overflow-hidden">
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
        savedSessions={userSessions}
        onLoadSession={handleLoadSession}
        onDeleteSession={deleteSession}
        onRenameSession={handleRenameSessionById}
        onNewSession={handleReset}
        currentUser={currentUser}
        currentView={currentView}
        onChangeView={(view) => setCurrentView(view)}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 relative">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-300 flex-shrink-0">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 -ml-2 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none transition-colors"
                    aria-label="Toggle Sidebar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <div className="font-bold text-xl tracking-tighter text-slate-800 dark:text-white cursor-pointer font-mono" onClick={handleReset}>
                    before<span className="text-yellow-600 dark:text-yellow-500">Each</span>
                    <span className="animate-blink inline-block w-2.5 h-5 ml-1 bg-slate-900 dark:bg-yellow-500 align-middle"></span>
                  </div>
              </div>

              <div className="flex items-center gap-4">
                <button 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    {isDarkMode ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    )}
                </button>
              </div>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto flex flex-col ${state === 'IDLE' && currentView === 'GENERATOR' ? 'justify-center' : ''}`}>
          
          {/* Main Content Router */}
          {currentView === 'GENERATOR' ? (
            <>
              {error && (
                <div className="max-w-4xl mx-auto mt-6 px-4 animate-fade-in flex-shrink-0 w-full mb-4">
                  <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded shadow-sm flex items-start">
                      <div className="flex-1">
                        <h3 className="text-red-800 dark:text-red-200 font-bold">Error Occurred</h3>
                        <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
                        <button onClick={() => setError(null)} className="mt-2 text-sm font-semibold underline">Dismiss</button>
                      </div>
                  </div>
                </div>
              )}

              {state === 'IDLE' && (
                <HeroInput 
                  onAnalyze={handleAnalyze} 
                  isLoading={false} 
                  savedSessions={userSessions}
                  onLoadSession={handleLoadSession}
                  onDeleteSession={deleteSession}
                />
              )}

              {state === 'ANALYZING' && <LoadingScreen phase="ANALYZING" />}

              {state === 'CONFIGURING' && requirements && (
                <TestDataForm 
                  requirements={requirements.requirements} 
                  initialData={testData}
                  initialScope={artifactScope}
                  initialConfig={generationConfig}
                  onGenerate={handleGenerate}
                  onCancel={testPlan ? () => setState('DISPLAY') : handleReset}
                  isLoading={false}
                />
              )}

              {state === 'GENERATING' && <LoadingScreen phase="GENERATING" />}

              {state === 'DISPLAY' && testPlan && (
                <TestPlanDisplay 
                  plan={testPlan} 
                  onReset={handleReset}
                  onEditConfig={() => setState('CONFIGURING')}
                  onGenerateMore={handleGenerateMore}
                  onUpdatePlan={handleUpdatePlan}
                  onRegenerateCase={handleRegenerateCase}
                  onUpdateTestCase={handleUpdateTestCase}
                  onDeleteSuite={handleDeleteSuite}
                  onDeleteCase={handleDeleteCase}
                  generatingSuiteIndices={generatingSuiteIndices}
                  onSaveSession={handleSaveSessionName}
                  onSaveScript={(script) => currentSessionId && handleSaveScript(currentSessionId, script)}
                />
              )}
            </>
          ) : currentView === 'SCRIPTS' ? (
            <ScriptGenerator 
               sessions={userSessions}
               onSaveScript={handleSaveScript}
            />
          ) : currentView === 'METRICS' ? (
            <QualityMetricsReport 
               session={currentSession}
               onUpdateSession={persistSessionUpdate}
               onChangeView={setCurrentView}
            />
          ) : (
            <ArtifactManager 
               sessions={userSessions} 
               viewMode={currentView as any}
               onUpdateSession={persistSessionUpdate}
               onNavigateToSession={handleLoadSession}
            />
          )}

          {/* Footer */}
          {(currentView !== 'GENERATOR' || state !== 'IDLE') && (
             <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 mt-8 transition-colors duration-300 flex-shrink-0">
              <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 dark:text-slate-600 text-xs flex flex-row items-center justify-center gap-4">
                <p>© {new Date().getFullYear()} beforeEach. Generated content may be inaccurate.</p>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <a href="https://github.com/AtomicSiopao/" target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"></path>
                  </svg>
                  AtomicSiopao
                </a>
              </div>
            </footer>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
