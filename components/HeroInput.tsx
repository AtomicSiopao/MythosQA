
import React, { useState } from 'react';
import { TestDataItem, SavedSession, TestType, GenerationConfig } from '../types';

interface HeroInputProps {
  onAnalyze: (url: string, initialData?: TestDataItem[], config?: GenerationConfig) => void;
  isLoading: boolean;
  savedSessions?: SavedSession[];
  onLoadSession?: (session: SavedSession) => void;
  onDeleteSession?: (id: string) => void;
}

const HeroInput: React.FC<HeroInputProps> = ({ onAnalyze, isLoading, savedSessions = [], onLoadSession, onDeleteSession }) => {
  const [url, setUrl] = useState('');
  
  // Credentials State
  const [showCredentials, setShowCredentials] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Advanced Config State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isTargetingFeature, setIsTargetingFeature] = useState(false);
  const [includeSEO, setIncludeSEO] = useState(false);
  const [featureInput, setFeatureInput] = useState('');
  const [targetFeatures, setTargetFeatures] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<TestType[]>([
    TestType.FUNCTIONAL, 
    TestType.UI_UX, 
    TestType.SECURITY, 
    TestType.EDGE_CASE,
    TestType.PERFORMANCE,
    TestType.ACCESSIBILITY
  ]);

  // Manifesto Modal State
  const [showManifesto, setShowManifesto] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && !isLoading) {
      const initialData: TestDataItem[] = [];
      if (username.trim()) {
        initialData.push({ key: 'Username/Email', value: username, isSensitive: false });
      }
      if (password.trim()) {
        initialData.push({ key: 'Password', value: password, isSensitive: true });
      }

      // Add any pending feature input if not empty
      let finalTargetFeatures = [...targetFeatures];
      if (featureInput.trim()) {
        finalTargetFeatures.push(featureInput.trim());
      }

      const config: GenerationConfig = {
        targetFeatures: isTargetingFeature ? finalTargetFeatures : undefined,
        includedTypes: selectedTypes,
        includeSEO: includeSEO
      };

      onAnalyze(url, initialData, config);
    }
  };

  const toggleType = (type: TestType) => {
    if (type === TestType.SEO) return; // SEO is handled by main checkbox
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const addFeature = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const trimmed = featureInput.trim();
        if (trimmed && !targetFeatures.includes(trimmed)) {
            setTargetFeatures([...targetFeatures, trimmed]);
            setFeatureInput('');
        }
    }
  };

  const removeFeature = (feature: string) => {
      setTargetFeatures(targetFeatures.filter(f => f !== feature));
  };

  const recentUrls = React.useMemo(() => {
    try {
      const stored = localStorage.getItem('recent_urls');
      return stored ? JSON.parse(stored) as string[] : [];
    } catch {
      return [];
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-full w-full text-center px-4 py-8">
      <div className="mb-8 relative flex flex-col items-center animate-fade-in">
        
        <h1 className="relative text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2 font-mono">
          before<span className="text-yellow-600 dark:text-yellow-500">Each</span>
          <span className="animate-blink inline-block w-4 h-12 ml-1 bg-slate-900 dark:bg-yellow-500 align-middle -mt-2"></span>
        </h1>
        <div className="relative text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto flex items-center justify-center gap-2">
          <p>Before tests. Before bugs. Before blame.</p>
          <button 
            onClick={() => setShowManifesto(true)}
            className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 flex items-center justify-center text-xs hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            aria-label="Why beforeEach?"
          >
            ?
          </button>
        </div>
      </div>

      <div className="w-full max-w-2xl relative z-10 transition-all duration-300">
        <form onSubmit={handleSubmit}>
          <div className="relative group">
            <div className="relative flex flex-col bg-white dark:bg-slate-800 rounded-lg shadow-xl overflow-hidden transition-colors duration-300 border border-slate-200 dark:border-slate-700">
              
              {/* Instruction Text */}
              <div className="px-6 pt-4 pb-4 text-center border-b border-slate-100 dark:border-slate-700">
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                   Provide a URL, configure your test data, and get a comprehensive suite in seconds.
                  </p>
              </div>

              {/* Main URL Input */}
              <div className="flex items-center p-2">
                <div className="pl-4 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <input
                  type="url"
                  className="flex-1 p-4 text-lg text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none bg-transparent"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !url}
                  className={`ml-2 px-8 py-3 rounded-md font-semibold text-white transition-all transform duration-200 
                    ${isLoading || !url 
                      ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-slate-900 to-slate-800 hover:from-black hover:to-slate-900 hover:scale-105 shadow-md border border-slate-700'}`}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Checking...
                    </span>
                  ) : (
                    'Check URL'
                  )}
                </button>
              </div>

              {/* Toggles Bar */}
              <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex flex-col md:flex-row text-xs transition-colors duration-300">
                 <button 
                   type="button" 
                   onClick={() => setShowCredentials(!showCredentials)}
                   className={`flex-1 px-4 py-3 flex items-center justify-center md:justify-start hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium focus:outline-none ${showCredentials ? 'text-blue-600 dark:text-blue-400 bg-slate-100 dark:bg-slate-800' : 'text-slate-500 dark:text-slate-400'}`}
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                   </svg>
                   {showCredentials ? 'Hide Login Credentials' : 'Add Login Credentials'}
                 </button>
                 
                 <div className="hidden md:block w-px bg-slate-200 dark:bg-slate-700"></div>

                 <button 
                   type="button" 
                   onClick={() => setShowAdvanced(!showAdvanced)}
                   className={`flex-1 px-4 py-3 flex items-center justify-center md:justify-start hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium focus:outline-none ${showAdvanced ? 'text-blue-600 dark:text-blue-400 bg-slate-100 dark:bg-slate-800' : 'text-slate-500 dark:text-slate-400'}`}
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                   </svg>
                   {showAdvanced ? 'Hide Advanced Config' : 'Target Features & Test Types'}
                 </button>
              </div>

              {/* Credential Inputs */}
              {showCredentials && (
                <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-t border-slate-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in transition-colors duration-300">
                   <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Username / Email</label>
                      <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="user@example.com"
                      />
                   </div>
                   <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Password</label>
                      <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="••••••••"
                      />
                   </div>
                </div>
              )}

              {/* Advanced Configuration Inputs */}
              {showAdvanced && (
                <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-t border-slate-100 dark:border-slate-700 space-y-4 animate-fade-in transition-colors duration-300 text-left">
                  
                  {/* Options */}
                  <div className="flex flex-col sm:flex-row gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                           <input 
                             type="checkbox" 
                             id="target-feature-check"
                             checked={isTargetingFeature}
                             onChange={(e) => setIsTargetingFeature(e.target.checked)}
                             className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                           />
                           <label htmlFor="target-feature-check" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase cursor-pointer">Target Specific Features</label>
                        </div>
                        {isTargetingFeature && (
                          <div className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 focus-within:ring-1 focus-within:ring-blue-500 animate-fade-in">
                              <div className="flex flex-wrap gap-2 mb-1">
                                  {targetFeatures.map((feat, idx) => (
                                      <span key={idx} className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded flex items-center gap-1">
                                          {feat}
                                          <button type="button" onClick={() => removeFeature(feat)} className="hover:text-blue-900 dark:hover:text-blue-100">×</button>
                                      </span>
                                  ))}
                                  <input 
                                    type="text"
                                    value={featureInput}
                                    onChange={(e) => setFeatureInput(e.target.value)}
                                    onKeyDown={addFeature}
                                    className="flex-1 bg-transparent outline-none text-sm text-slate-900 dark:text-slate-200 min-w-[150px]"
                                    placeholder={targetFeatures.length === 0 ? "e.g. Checkout, Profile (Press Enter)" : "Add another..."}
                                    autoFocus
                                  />
                              </div>
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                         <div className="flex items-center gap-2 mb-2">
                           <input 
                             type="checkbox" 
                             id="seo-check"
                             checked={includeSEO}
                             onChange={(e) => setIncludeSEO(e.target.checked)}
                             className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                           />
                           <label htmlFor="seo-check" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase cursor-pointer flex items-center gap-2">
                             Include SEO Verification Suite
                             <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-1.5 py-0.5 rounded text-[10px]">NEW</span>
                           </label>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 pl-6">
                            Generates a dedicated suite for Meta tags, Sitemap, Robots.txt, Core Web Vitals, and Semantic HTML checks.
                        </p>
                      </div>
                  </div>

                  {/* Test Types Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">Test Types to Include</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.values(TestType).filter(t => t !== TestType.SEO).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleType(type)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            selectedTypes.includes(type)
                              ? 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-300 shadow-sm'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Recent URLs & Quick Access - Reduced prominence now that we have a Sidebar */}
      <div className="mt-8 grid grid-cols-1 gap-8 max-w-2xl w-full">
         {/* Recent URLs */}
         {recentUrls.length > 0 && (
            <div className="text-center">
               <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase mb-2">Recent Searches</p>
               <div className="flex flex-wrap justify-center gap-2">
                 {recentUrls.map((recent, idx) => (
                   <button 
                     key={idx}
                     onClick={() => onAnalyze(recent)}
                     className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all truncate max-w-[200px]"
                     title={recent}
                   >
                     {recent.replace(/(^\w+:|^)\/\//, '').replace('www.', '')}
                   </button>
                 ))}
               </div>
            </div>
         )}
      </div>
      
      <div className="mt-8 flex gap-4 text-sm text-slate-500 dark:text-slate-400">
        <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>Requirement Analysis</span>
        <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>Secure Data Input</span>
        <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-orange-500 mr-2"></span>Full Plan Generation</span>
      </div>
      
       <footer className="py-4 mt-8 transition-colors duration-300 w-full">
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

      {/* Manifesto Dialog */}
      {showManifesto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowManifesto(false)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 md:p-8 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-serif">Why beforeEach Exists</h3>
                <button onClick={() => setShowManifesto(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6 text-slate-600 dark:text-slate-300 text-sm md:text-base leading-loose text-left font-sans">
                <p>Every product team knows this moment.</p>
                
                <div className="pl-4 italic text-slate-500 dark:text-slate-400 border-l-2 border-slate-200 dark:border-slate-700">
                    <p>A feature is “almost done.”</p>
                    <p>Engineering is ready.</p>
                    <p>QA is testing.</p>
                </div>

                <p>And someone asks a simple question:</p>
                
                <p className="font-serif text-xl italic text-slate-800 dark:text-slate-100 py-2">
                  “What was this supposed to do?”
                </p>

                <p>Silence. Then Slack archaeology. Then guesswork.</p>

                <hr className="border-slate-100 dark:border-slate-800 w-1/3 my-2" />

                <p><span className="font-bold text-slate-900 dark:text-white">beforeEach</span> exists to stop that moment from happening.</p>

                <div className="space-y-1">
                    <p>Not by adding process.</p>
                    <p>Not by slowing delivery.</p>
                    <p>But by capturing intent before execution begins.</p>
                </div>

                <p>beforeEach gives teams a lightweight, consistent place to define:</p>
                
                <div className="space-y-1 pl-4 border-l-2 border-yellow-500/50">
                  <p>what’s being built</p>
                  <p>what “done” actually means</p>
                  <p>what needs to be validated</p>
                </div>

                <p className="text-sm italic">—all before the first test, bug, or regression exists.</p>

                <p>For product managers, this means:</p>
                
                <div className="space-y-2 pl-4 text-slate-700 dark:text-slate-200">
                  <p>fewer late-cycle surprises</p>
                  <p>clearer acceptance criteria</p>
                  <p>faster, calmer QA cycles</p>
                  <p>and less time explaining decisions after the fact</p>
                </div>

                <div className="pt-4 space-y-2">
                    <p>Documentation doesn’t fail because teams don’t care.</p>
                    <p className="font-medium text-slate-900 dark:text-white">It fails because it starts too late.</p>
                </div>

                <p className="font-semibold text-slate-900 dark:text-white">beforeEach moves it to where it belongs—at the beginning.</p>

                <div className="font-serif text-2xl text-slate-900 dark:text-white space-y-1 pt-2">
                  <p>Before tests.</p>
                  <p>Before bugs.</p>
                  <p>Before confusion.</p>
                </div>

                <p className="text-slate-500 dark:text-slate-400 italic pt-4 text-xs leading-relaxed border-t border-slate-100 dark:border-slate-800 mt-4">
                  Because when everyone starts from the same baseline,<br/>
                  delivery gets easier… and trust comes back into the process.
                </p>
                <p>
                  - James, Creator of beforeEach
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeroInput;
