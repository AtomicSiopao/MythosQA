
import React, { useMemo } from 'react';
import { SavedSession } from '../types';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  savedSessions: SavedSession[];
  onLoadSession: (session: SavedSession) => void;
  onDeleteSession: (id: string) => void;
  onNewSession: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  toggleSidebar, 
  savedSessions, 
  onLoadSession, 
  onDeleteSession,
  onNewSession
}) => {
  const groupedSessions = useMemo(() => {
    const groups: Record<string, SavedSession[]> = {};
    savedSessions.forEach(session => {
      let domain = session.url;
      try {
        // Try to get hostname, fallback to url
        const urlObj = new URL(session.url.startsWith('http') ? session.url : `https://${session.url}`);
        domain = urlObj.hostname.replace('www.', '');
      } catch (e) {
        domain = session.url;
      }
      if (!groups[domain]) groups[domain] = [];
      groups[domain].push(session);
    });
    return groups;
  }, [savedSessions]);

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={toggleSidebar}
        aria-hidden="true"
      />
      
      {/* Sidebar Content */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-50 
          bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
          transition-all duration-300 ease-in-out
          flex flex-col
          ${isOpen ? 'w-64 translate-x-0 shadow-xl lg:shadow-none' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:opacity-0 lg:border-r-0'}
        `}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 min-w-[16rem]">
          <h2 className="font-bold text-slate-800 dark:text-slate-100">Test Artifacts</h2>
          <button 
             onClick={onNewSession}
             className="p-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
             title="New Session"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-w-[16rem]">
           {Object.keys(groupedSessions).length === 0 && (
              <div className="text-center mt-10 text-slate-400 dark:text-slate-500 text-sm">
                 <p className="mb-2">No saved sessions</p>
                 <button onClick={() => { onNewSession(); if(window.innerWidth < 1024) toggleSidebar(); }} className="text-blue-600 dark:text-blue-400 hover:underline text-xs">
                   Create your first artifact
                 </button>
              </div>
           )}

           {Object.entries(groupedSessions).map(([domain, sessions]) => (
             <div key={domain} className="mb-6">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 truncate px-2" title={domain}>
                  {domain}
                </h3>
                <ul className="space-y-1">
                  {[...(sessions as SavedSession[])].sort((a,b) => b.timestamp - a.timestamp).map(session => (
                    <li key={session.id} className="group flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg pr-2 pl-2 py-1.5 transition-colors">
                       <button 
                         onClick={() => { onLoadSession(session); if(window.innerWidth < 1024) toggleSidebar(); }}
                         className="flex-1 text-left truncate text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white"
                         title={`${session.name} (${new Date(session.timestamp).toLocaleDateString()})`}
                       >
                         <div className="font-medium truncate text-sm">{session.name}</div>
                         <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center">
                            <span>{new Date(session.timestamp).toLocaleDateString()}</span>
                            {session.artifactScope !== 'ALL' && (
                                <span className="ml-1 px-1 rounded bg-slate-100 dark:bg-slate-700 text-[9px]">{session.artifactScope.replace('_', ' ')}</span>
                            )}
                         </div>
                       </button>
                       <button 
                         onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                         className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-all rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                         title="Delete Artifact"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                         </svg>
                       </button>
                    </li>
                  ))}
                </ul>
             </div>
           ))}
        </div>
        
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 min-w-[16rem]">
            <div className="text-xs text-slate-400 dark:text-slate-600 text-center">
                Artifacts are saved locally
            </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
