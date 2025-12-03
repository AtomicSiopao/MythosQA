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
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-160px)] w-full text-center px-4 py-8">
      <div className="mb-8 relative flex flex-col items-center animate-fade-in">
        
        {/* Golden M Logo */}
        <div className="relative mb-6 w-24 h-24 bg-black rounded-xl shadow-2xl flex items-center justify-center border-2 border-slate-800 ring-4 ring-yellow-500/20">
           <span className="font-serif text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-700 drop-shadow-sm transform translate-y-1">
             M
           </span>
        </div>

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

      {/* Sessions and History */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
         
         {/* Saved Plans */}
         {savedSessions.length > 0 && (
            <div className="text-left">
               <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase mb-2">Saved Plans</p>
               <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden max-h-60 overflow-y-auto">
                 {savedSessions.map((session) => (
                   <div key={session.id} className="group flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <button 
                        onClick={() => onLoadSession && onLoadSession(session)}
                        className="flex-1 text-left truncate"
                      >
                         <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{session.name}</h4>
                         <span className="text-xs text-slate-400">{new Date(session.timestamp).toLocaleDateString()} • {session.url}</span>
                      </button>
                      <button 
                         onClick={() => onDeleteSession && onDeleteSession(session.id)}
                         className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                         title="Delete Session"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                   </div>
                 ))}
               </div>
            </div>
         )}

         {/* Recent URLs */}
         {recentUrls.length > 0 && (
            <div className={`text-left ${savedSessions.length === 0 ? 'md:col-span-2 md:text-center' : ''}`}>
               <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase mb-2">Recent Searches</p>
               <div className={`flex flex-wrap gap-2 ${savedSessions.length === 0 ? 'md:justify-center' : ''}`}>
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
    </div>
  );
};

export default HeroInput;