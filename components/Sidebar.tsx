
import React, { useMemo, useState } from 'react';
import { SavedSession, User } from '../types';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  savedSessions: SavedSession[];
  onLoadSession: (session: SavedSession) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newName: string) => void;
  onNewSession: () => void;
  currentUser: User | null;
  currentView: string;
  onChangeView: (view: any) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  toggleSidebar, 
  savedSessions, 
  onLoadSession, 
  onDeleteSession,
  onRenameSession,
  onNewSession,
  currentUser,
  currentView,
  onChangeView,
  onLogout
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const groupedSessions = useMemo(() => {
    const groups: Record<string, SavedSession[]> = {};
    savedSessions.forEach(session => {
      let domain = session.url;
      try {
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

  const startEditing = (e: React.MouseEvent, session: SavedSession) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditName(session.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEditing = (id: string) => {
    if (editName.trim()) {
      onRenameSession(id, editName.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      saveEditing(id);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  if (!currentUser) return null;

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
        <div className="h-16 flex items-center px-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 min-w-[16rem] gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${currentUser.role === 'ADMIN' ? 'bg-purple-600' : 'bg-slate-400'}`}>
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 truncate">
            <div className="flex items-center gap-2">
               <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{currentUser.name}</h2>
               {currentUser.role === 'ADMIN' && <span className="text-[9px] bg-purple-100 text-purple-700 px-1 rounded font-bold border border-purple-200">ADMIN</span>}
            </div>
            <p className="text-[10px] text-slate-500 truncate">{currentUser.email}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-w-[16rem]">
           
           {/* Navigation Links */}
           <div className="p-3 space-y-1 border-b border-slate-100 dark:border-slate-800">
              
              {/* ADMIN DASHBOARD LINK */}
              {currentUser.role === 'ADMIN' && (
                <button 
                  onClick={() => { onChangeView('ADMIN'); if(window.innerWidth < 1024) toggleSidebar(); }}
                  className={`w-full text-left px-3 py-2 mb-2 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${currentView === 'ADMIN' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Admin Dashboard
                </button>
              )}

              <button 
                onClick={() => { onChangeView('GENERATOR'); if(window.innerWidth < 1024) toggleSidebar(); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${currentView === 'GENERATOR' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                Generator
              </button>
              
              <div className="pt-2 pb-1 px-3 text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                Artifacts
              </div>
              
              <button 
                onClick={() => { onChangeView('PLANS'); if(window.innerWidth < 1024) toggleSidebar(); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${currentView === 'PLANS' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Test Plans
              </button>
              <button 
                onClick={() => { onChangeView('SUITES'); if(window.innerWidth < 1024) toggleSidebar(); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${currentView === 'SUITES' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                 </svg>
                Test Suites
              </button>
              <button 
                onClick={() => { onChangeView('CASES'); if(window.innerWidth < 1024) toggleSidebar(); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${currentView === 'CASES' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                 </svg>
                Test Cases
              </button>

              <div className="pt-2 pb-1 px-3 text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                Scripts
              </div>

              <button 
                onClick={() => { onChangeView('SCRIPTS'); if(window.innerWidth < 1024) toggleSidebar(); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${currentView === 'SCRIPTS' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                 </svg>
                Generate Test Script
              </button>
           </div>

           <div className="p-4">
               <div className="flex items-center justify-between mb-2">
                 <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                   Saved Sessions
                 </h3>
                 <button 
                   onClick={onNewSession}
                   className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                 >
                   + New
                 </button>
               </div>
               
               {Object.keys(groupedSessions).length === 0 && (
                  <div className="text-center py-4 text-slate-400 dark:text-slate-500 text-xs italic">
                     No saved sessions
                  </div>
               )}
    
               {Object.entries(groupedSessions).map(([domain, sessions]) => (
                 <div key={domain} className="mb-4">
                    <h4 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 truncate px-2" title={domain}>
                      {domain}
                    </h4>
                    <ul className="space-y-0.5">
                      {[...(sessions as SavedSession[])].sort((a,b) => b.timestamp - a.timestamp).map(session => (
                        <li key={session.id} className="group flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md pr-1 pl-2 py-1 transition-colors">
                           
                           {editingId === session.id ? (
                              <input 
                                autoFocus
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onBlur={() => saveEditing(session.id)}
                                onKeyDown={(e) => handleKeyDown(e, session.id)}
                                className="flex-1 text-xs px-1 py-0.5 bg-white dark:bg-slate-900 border border-blue-500 rounded outline-none text-slate-900 dark:text-white"
                              />
                           ) : (
                              <button 
                                onClick={() => { onLoadSession(session); if(window.innerWidth < 1024) toggleSidebar(); }}
                                className="flex-1 text-left truncate text-xs text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white"
                                title={`${session.name}`}
                              >
                                <div className="font-medium truncate">{session.name}</div>
                              </button>
                           )}

                           <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => startEditing(e, session)}
                                className="p-1 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400"
                                title="Rename"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                                className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400"
                                title="Delete"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                           </div>
                        </li>
                      ))}
                    </ul>
                 </div>
               ))}
           </div>
        </div>
        
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 min-w-[16rem]">
            <button 
              onClick={onLogout}
              className="w-full flex items-center justify-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
               </svg>
               Sign Out
            </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
