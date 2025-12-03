import React, { useState, useEffect } from 'react';
import HeroInput from './components/HeroInput';
import TestPlanDisplay from './components/TestPlanDisplay';
import LoadingScreen from './components/LoadingScreen';
import TestDataForm from './components/TestDataForm';
import { TestPlan, TestRequirementsAnalysis, TestDataItem, ArtifactScope, TestSuite, TestCase, SavedSession } from './types';
import { generateTestPlan, analyzeRequirements, generateMoreTestCases, regenerateTestCase } from './services/geminiService';

type AppState = 'IDLE' | 'ANALYZING' | 'CONFIGURING' | 'GENERATING' | 'DISPLAY';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>('IDLE');
  const [url, setUrl] = useState('');
  const [requirements, setRequirements] = useState<TestRequirementsAnalysis | null>(null);
  const [testData, setTestData] = useState<TestDataItem[]>([]);
  const [artifactScope, setArtifactScope] = useState<ArtifactScope>('ALL');
  const [testPlan, setTestPlan] = useState<TestPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [generatingMoreSuiteIndex, setGeneratingMoreSuiteIndex] = useState<number | null>(null);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);

  useEffect(() => {
    // Check system preference on mount
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
    // Load saved sessions
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

  const updateHistory = (newUrl: string) => {
    try {
      const stored = localStorage.getItem('recent_urls');
      let urls: string[] = stored ? JSON.parse(stored) : [];
      urls = [newUrl, ...urls.filter(u => u !== newUrl)].slice(0, 5);
      localStorage.setItem('recent_urls', JSON.stringify(urls));
    } catch (e) {
      console.error("Failed to update history", e);
    }
  };

  const handleAnalyze = async (inputUrl: string, initialCredentialData?: TestDataItem[]) => {
    setState('ANALYZING');
    setUrl(inputUrl);
    setError(null);
    updateHistory(inputUrl);
    
    // Set initial test data (credentials) immediately
    const initialData = initialCredentialData || [];
    setTestData(initialData);

    try {
      // Pass the keys of the initial data so Gemini knows what we already have
      const existingKeys = initialData.map(d => d.key);
      const result = await analyzeRequirements(inputUrl, existingKeys);
      setRequirements(result);
      setState('CONFIGURING');
    } catch (err: any) {
      setError(err.message || "Failed to analyze website requirements.");
      setState('IDLE');
    }
  };

  const handleGenerate = async (data: TestDataItem[], scope: ArtifactScope) => {
    setTestData(data); // Save data for re-runs
    setArtifactScope(scope); // Save scope for re-runs
    setState('GENERATING');
    setError(null);
    try {
      const plan = await generateTestPlan(url, data, scope);
      setTestPlan(plan);
      setState('DISPLAY');
    } catch (err: any) {
      setError(err.message || "Failed to generate test plan.");
      setState('CONFIGURING'); // Go back to config on fail
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
  };

  const handleEditConfig = () => {
    setState('CONFIGURING');
  };

  const handleGenerateMore = async (suiteIndex: number, focusType?: string) => {
    if (!testPlan) return;
    setGeneratingMoreSuiteIndex(suiteIndex);
    const suite = testPlan.suites[suiteIndex];
    
    try {
      const newCases = await generateMoreTestCases(url, suite, testData, focusType);
      const updatedPlan = { ...testPlan };
      updatedPlan.suites[suiteIndex].cases = [...updatedPlan.suites[suiteIndex].cases, ...newCases];
      setTestPlan(updatedPlan);
    } catch (e) {
      console.error(e);
      alert("Failed to generate more cases.");
    } finally {
      setGeneratingMoreSuiteIndex(null);
    }
  };

  const handleRegenerateCase = async (suiteIndex: number, caseIndex: number, newTestData: TestDataItem[]) => {
    if (!testPlan) return;
    
    const suite = testPlan.suites[suiteIndex];
    const originalCase = suite.cases[caseIndex];
    
    try {
       const updatedCase = await regenerateTestCase(url, originalCase, newTestData);
       
       // Update State
       const updatedPlan = { ...testPlan };
       updatedPlan.suites[suiteIndex].cases[caseIndex] = updatedCase;
       setTestPlan(updatedPlan);
    } catch (e) {
      console.error(e);
      throw e; // Let the component handle the error display
    }
  };

  const handleUpdatePlan = (updatedPlan: TestPlan) => {
    setTestPlan(updatedPlan);
  };

  // --- Session Management ---

  const handleSaveSession = (name: string) => {
    if (!testPlan) return;
    const newSession: SavedSession = {
      id: Date.now().toString(),
      name: name || `Plan for ${new URL(url).hostname}`,
      timestamp: Date.now(),
      url,
      plan: testPlan,
      testData,
      requirements,
      artifactScope
    };

    const updatedSessions = [newSession, ...savedSessions];
    setSavedSessions(updatedSessions);
    localStorage.setItem('mythos_saved_sessions', JSON.stringify(updatedSessions));
  };

  const handleLoadSession = (session: SavedSession) => {
    setUrl(session.url);
    setTestPlan(session.plan);
    setTestData(session.testData);
    setRequirements(session.requirements);
    setArtifactScope(session.artifactScope);
    setState('DISPLAY');
  };

  const handleDeleteSession = (sessionId: string) => {
    const updatedSessions = savedSessions.filter(s => s.id !== sessionId);
    setSavedSessions(updatedSessions);
    localStorage.setItem('mythos_saved_sessions', JSON.stringify(updatedSessions));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-300 flex flex-col">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-300 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={handleReset}>
                <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105 border border-slate-800">
                    <span className="font-serif text-xl font-bold text-yellow-500">M</span>
                </div>
                <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-white">Mythos<span className="text-yellow-600 dark:text-yellow-500">QA</span></span>
            </div>
            <div className="flex items-center gap-4">
               <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Toggle Dark Mode"
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
               <div className="hidden sm:block text-sm font-medium text-slate-500 dark:text-slate-400">
                   AI-Powered QA
               </div>
            </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col">
        {error && (
          <div className="max-w-4xl mx-auto mt-6 px-4 animate-fade-in flex-shrink-0 w-full">
             <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded shadow-sm flex items-start">
                <svg className="w-6 h-6 text-red-500 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                   <h3 className="text-red-800 dark:text-red-200 font-bold">Error Occurred</h3>
                   <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
                   <button 
                     onClick={() => setError(null)}
                     className="mt-2 text-sm font-semibold text-red-800 dark:text-red-200 hover:text-red-900 underline"
                   >
                     Dismiss
                   </button>
                </div>
             </div>
          </div>
        )}

        {state === 'IDLE' && (
          <HeroInput 
            onAnalyze={handleAnalyze} 
            isLoading={false} 
            savedSessions={savedSessions}
            onLoadSession={handleLoadSession}
            onDeleteSession={handleDeleteSession}
          />
        )}

        {state === 'ANALYZING' && (
          <LoadingScreen phase="ANALYZING" />
        )}

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

        {state === 'GENERATING' && (
           <LoadingScreen phase="GENERATING" />
        )}

        {state === 'DISPLAY' && testPlan && (
          <TestPlanDisplay 
            plan={testPlan} 
            onReset={handleReset}
            onEditConfig={handleEditConfig}
            onGenerateMore={handleGenerateMore}
            onUpdatePlan={handleUpdatePlan}
            onRegenerateCase={handleRegenerateCase}
            generatingMoreSuiteIndex={generatingMoreSuiteIndex}
            onSaveSession={handleSaveSession}
          />
        )}
      </main>

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 mt-auto transition-colors duration-300 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 dark:text-slate-600 text-sm flex flex-col items-center justify-center gap-2">
          <p>© {new Date().getFullYear()} Mythos QA. Generated content may be inaccurate.</p>
          <a href="https://github.com/AtomicSiopao/" target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
               <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"></path>
            </svg>
            AtomicSiopao
          </a>
        </div>
      </footer>
    </div>
  );
};

export default App;
