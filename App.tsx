
import React, { useState, useEffect, useMemo } from 'react';
import HeroInput from './components/HeroInput';
import TestPlanDisplay from './components/TestPlanDisplay';
import LoadingScreen from './components/LoadingScreen';
import TestDataForm from './components/TestDataForm';
import Sidebar from './components/Sidebar';
import AuthScreen from './components/AuthScreen';
import ArtifactManager from './components/ArtifactManager';
import ScriptGenerator from './components/ScriptGenerator';
import AdminDashboard from './components/AdminDashboard';
import { TestPlan, TestRequirementsAnalysis, TestDataItem, ArtifactScope, TestSuite, TestCase, SavedSession, User, GeneratedScript } from './types';
import { generateTestPlan, analyzeRequirements, generateMoreTestCases, regenerateTestCase } from './services/geminiService';

type GeneratorState = 'IDLE' | 'ANALYZING' | 'CONFIGURING' | 'GENERATING' | 'DISPLAY';
type AppView = 'GENERATOR' | 'PLANS' | 'SUITES' | 'CASES' | 'SCRIPTS' | 'ADMIN';

const App: React.FC = () => {
  // Global App State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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
  const [testPlan, setTestPlan] = useState<TestPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Changed to array to support multiple concurrent generations
  const [generatingSuiteIndices, setGeneratingSuiteIndices] = useState<number[]>([]);
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Initialize
  useEffect(() => {
    // Dark mode
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }

    // Load User
    try {
      const storedUser = localStorage.getItem('mythos_current_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        // If restoring session and user is admin, default to admin view if not set
        if (user.role === 'ADMIN') {
           // We don't force it on refresh to allow navigation, but handleLogin forces it
        }
      }
    } catch (e) {
      console.error("Failed to load user", e);
    }

    // Load Sessions
    try {
      const storedSessions = localStorage.getItem('mythos_saved_sessions');
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

  // --- Auth Handlers ---
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('mythos_current_user', JSON.stringify(user));
    
    // REDIRECT ADMIN TO DASHBOARD
    if (user.role === 'ADMIN') {
      setCurrentView('ADMIN');
    } else {
      setCurrentView('GENERATOR');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('mythos_current_user');
    handleReset(); // Reset generator state
  };

  // --- Session Data Handlers ---
  const userSessions = useMemo(() => {
    if (!currentUser) return [];
    // If Admin, show ALL sessions (optional feature for admin, but let's stick to personal for now to avoid clutter)
    // Actually, typical SAAS admin dashboard manages users, but personal workspace shows own. 
    // Let's keep it strictly own sessions for consistency unless we implement a "View User" feature.
    return savedSessions.filter(s => s.userId === currentUser.id || !s.userId); 
  }, [savedSessions, currentUser]);

  const persistSessionUpdate = (updatedSession: SavedSession) => {
    if (!currentUser) return;
    
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
      localStorage.setItem('mythos_saved_sessions', JSON.stringify(newSessions));
      return newSessions;
    });
  };

  const deleteSession = (sessionId: string) => {
    const updatedSessions = savedSessions.filter(s => s.id !== sessionId);
    setSavedSessions(updatedSessions);
    localStorage.setItem('mythos_saved_sessions', JSON.stringify(updatedSessions));
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

  const handleAnalyze = async (inputUrl: string, initialCredentialData?: TestDataItem[]) => {
    if (!currentUser) return;
    setState('ANALYZING');
    setUrl(inputUrl);
    setError(null);
    
    const initialData = initialCredentialData || [];
    setTestData(initialData);

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
      artifactScope: 'ALL'
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

  const handleGenerate = async (data: TestDataItem[], scope: ArtifactScope) => {
    setTestData(data);
    setArtifactScope(scope);
    setState('GENERATING');
    setError(null);
    try {
      const plan = await generateTestPlan(url, data, scope);
      setTestPlan(plan);
      setState('DISPLAY');

      if (currentSessionId) {
        const currentSession = userSessions.find(s => s.id === currentSessionId);
        if (currentSession) {
          persistSessionUpdate({
            ...currentSession,
            testData: data,
            artifactScope: scope,
            plan: plan,
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
    
    // Add this index to active generations
    setGeneratingSuiteIndices(prev => [...prev, suiteIndex]);
    
    const suite = testPlan.suites[suiteIndex];
    try {
      const newCases = await generateMoreTestCases(url, suite, testData, focusType, count);
      
      // Update state securely with functional update to avoid race conditions with multiple generations
      setTestPlan(prevPlan => {
        if (!prevPlan) return null;
        const updatedPlan = { ...prevPlan };
        // Create a new array for suites to ensure immutability
        updatedPlan.suites = [...prevPlan.suites];
        // Append new cases
        updatedPlan.suites[suiteIndex] = {
           ...updatedPlan.suites[suiteIndex],
           cases: [...updatedPlan.suites[suiteIndex].cases, ...newCases]
        };
        
        // Persist
        const currentSession = userSessions.find(s => s.id === currentSessionId);
        if (currentSession) persistSessionUpdate({ ...currentSession, plan: updatedPlan });
        
        return updatedPlan;
      });

    } catch (e) {
      console.error(e);
      alert("Failed to generate more cases.");
    } finally {
      // Remove this index from active generations
      setGeneratingSuiteIndices(prev => prev.filter(i => i !== suiteIndex));
    }
  };

  const handleRegenerateCase = async (suiteIndex: number, caseIndex: number, newTestData: TestDataItem[]) => {
    if (!testPlan || !currentSessionId) return;
    const suite = testPlan.suites[suiteIndex];
    const originalCase = suite.cases[caseIndex];
    try {
       const updatedCase = await regenerateTestCase(url, originalCase, newTestData);
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

    if (session.plan) {
      setTestPlan(session.plan);
      setState('DISPLAY');
    } else if (session.requirements) {
      setState('CONFIGURING');
    } else {
      setState('IDLE');
      handleAnalyze(session.url, session.testData);
    }
    setCurrentView('GENERATOR');
  };

  const handleSaveSessionName = (name: string) => {
    if (!currentSessionId || !currentUser) return;
    const currentSession = userSessions.find(s => s.id === currentSessionId);
    if (currentSession) {
      persistSessionUpdate({ ...currentSession, name: name });
    }
  };

  // If not logged in, show Auth
  if (!currentUser) {
    return <AuthScreen onLogin={handleLogin} />;
  }

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
        onLogout={handleLogout}
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

                  <div className="flex items-center gap-2 cursor-pointer group" onClick={handleReset}>
                      <div className="w-9 h-9 bg-black rounded-lg flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105 border border-slate-800">
                          <span className="font-serif text-lg font-bold text-yellow-500">M</span>
                      </div>
                      <span className="font-bold text-lg tracking-tight text-slate-800 dark:text-white hidden sm:inline">Mythos<span className="text-yellow-600 dark:text-yellow-500">QA</span></span>
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
          ) : currentView === 'ADMIN' ? (
            <AdminDashboard currentUser={currentUser} />
          ) : (
            <ArtifactManager 
               sessions={userSessions} 
               viewMode={currentView as any} // Cast for compatibility with Manager view types
               onUpdateSession={persistSessionUpdate}
               onNavigateToSession={handleLoadSession}
            />
          )}

          {/* Footer - Only show on IDLE generator or Manager/Script Views */}
          {(currentView !== 'GENERATOR' || state !== 'IDLE') && (
             <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 mt-auto transition-colors duration-300 flex-shrink-0">
              <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 dark:text-slate-600 text-sm flex flex-col items-center justify-center gap-2">
                <p>© {new Date().getFullYear()} Mythos QA. Generated content may be inaccurate.</p>
                <a href="https://github.com/AtomicSiopao/" target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
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
