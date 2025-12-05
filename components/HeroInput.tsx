
import React, { useState } from 'react';
import { TestDataItem, SavedSession } from '../types';

interface HeroInputProps {
  onAnalyze: (url: string, initialData?: TestDataItem[]) => void;
  isLoading: boolean;
  savedSessions?: SavedSession[];
  onLoadSession?: (session: SavedSession) => void;
  onDeleteSession?: (id: string) => void;
}

const HeroInput: React.FC<HeroInputProps> = ({ onAnalyze, isLoading, savedSessions = [], onLoadSession, onDeleteSession }) => {
  const [url, setUrl] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

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
      onAnalyze(url, initialData);
    }
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
        
        <h1 className="relative text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
          Mythos<span className="text-yellow-600 dark:text-yellow-500">QA</span>
        </h1>
        <div className="relative text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          <p>Intelligent test artifact creation</p>
        </div>
      </div>

      <div className="w-full max-w-2xl relative z-10 transition-all duration-300">
        <form onSubmit={handleSubmit}>
          <div className="relative group">
            <div className="relative flex flex-col bg-white dark:bg-slate-800 rounded-lg shadow-xl overflow-hidden transition-colors duration-300 border border-slate-200 dark:border-slate-700">
              
              {/* Instruction Text - Integrated inside the card with separator */}
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

              {/* Credential Toggle */}
              <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 px-4 py-2 flex items-center justify-between text-xs transition-colors duration-300">
                 <button 
                   type="button" 
                   onClick={() => setShowCredentials(!showCredentials)}
                   className="flex items-center text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium focus:outline-none"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-1 transition-transform ${showCredentials ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                   </svg>
                   {showCredentials ? 'Hide Login Credentials' : 'Add Login Credentials (Optional)'}
                 </button>
              </div>

              {/* Credential Inputs */}
              {showCredentials && (
                <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 border-t border-slate-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in transition-colors duration-300">
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
      
       <footer className="mt-auto py-8 transition-colors duration-300 w-full">
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

export default HeroInput;
