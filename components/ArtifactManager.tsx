
import React, { useState, useMemo } from 'react';
import { SavedSession, TestPlan, TestSuite, TestCase, TestPriority, TestType } from '../types';

interface ArtifactManagerProps {
  sessions: SavedSession[];
  viewMode: 'PLANS' | 'SUITES' | 'CASES';
  onUpdateSession: (updatedSession: SavedSession) => void;
  onNavigateToSession: (session: SavedSession) => void;
}

const ArtifactManager: React.FC<ArtifactManagerProps> = ({ sessions, viewMode, onUpdateSession, onNavigateToSession }) => {
  const [filterText, setFilterText] = useState('');

  // --- PLANS VIEW ---
  const filteredPlans = useMemo(() => {
    return sessions.filter(s => 
      s.plan && (
        s.name.toLowerCase().includes(filterText.toLowerCase()) || 
        s.url.toLowerCase().includes(filterText.toLowerCase())
      )
    );
  }, [sessions, filterText]);

  // --- SUITES VIEW ---
  const allSuites = useMemo(() => {
    const suites: { session: SavedSession, suite: TestSuite, suiteIndex: number }[] = [];
    sessions.forEach(session => {
      if (session.plan) {
        session.plan.suites.forEach((suite, idx) => {
          if (suite.suiteName.toLowerCase().includes(filterText.toLowerCase()) || session.name.toLowerCase().includes(filterText.toLowerCase())) {
            suites.push({ session, suite, suiteIndex: idx });
          }
        });
      }
    });
    return suites;
  }, [sessions, filterText]);

  // --- CASES VIEW ---
  const allCases = useMemo(() => {
    const cases: { session: SavedSession, suiteIndex: number, caseIndex: number, testCase: TestCase, suiteName: string }[] = [];
    sessions.forEach(session => {
      if (session.plan) {
        session.plan.suites.forEach((suite, sIdx) => {
          suite.cases.forEach((tc, cIdx) => {
             if (
               tc.title.toLowerCase().includes(filterText.toLowerCase()) || 
               tc.id.toLowerCase().includes(filterText.toLowerCase()) ||
               session.name.toLowerCase().includes(filterText.toLowerCase())
             ) {
               cases.push({ session, suiteIndex: sIdx, caseIndex: cIdx, testCase: tc, suiteName: suite.suiteName });
             }
          });
        });
      }
    });
    return cases;
  }, [sessions, filterText]);

  // Helper to update a test case title/desc directly from the manager
  const updateTestCase = (item: typeof allCases[0], updates: Partial<TestCase>) => {
    const newSession = { ...item.session };
    if (!newSession.plan) return;
    
    // Deep clone to avoid mutation issues
    newSession.plan = { ...newSession.plan, suites: [...newSession.plan.suites] };
    newSession.plan.suites[item.suiteIndex] = { ...newSession.plan.suites[item.suiteIndex], cases: [...newSession.plan.suites[item.suiteIndex].cases] };
    
    const originalCase = newSession.plan.suites[item.suiteIndex].cases[item.caseIndex];
    newSession.plan.suites[item.suiteIndex].cases[item.caseIndex] = { ...originalCase, ...updates };
    
    onUpdateSession(newSession);
  };

  const getPriorityColor = (p: TestPriority) => {
    switch (p) {
      case TestPriority.CRITICAL: return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case TestPriority.HIGH: return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      case TestPriority.MEDIUM: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case TestPriority.LOW: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6 h-full flex flex-col animate-fade-in bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div>
           <h1 className="text-2xl font-bold">
             {viewMode === 'PLANS' && 'Test Plans'}
             {viewMode === 'SUITES' && 'Test Suites'}
             {viewMode === 'CASES' && 'Test Cases'}
           </h1>
           <p className="text-slate-500 dark:text-slate-400 text-sm">
             {viewMode === 'PLANS' && 'Manage high-level test plans and strategies'}
             {viewMode === 'SUITES' && 'Organize suites across all your projects'}
             {viewMode === 'CASES' && 'Granular view of all test cases'}
           </p>
        </div>
        <div className="relative w-full sm:w-64">
           <input 
             type="text" 
             placeholder="Search artifacts..." 
             value={filterText}
             onChange={(e) => setFilterText(e.target.value)}
             className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
           />
           <svg className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
           </svg>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        
        {/* === PLANS LIST === */}
        {viewMode === 'PLANS' && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
             {filteredPlans.map(session => (
               <div key={session.id} className="group p-5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-md flex flex-col bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex justify-between items-start mb-3">
                     <h3 className="font-bold text-lg truncate w-full text-slate-800 dark:text-white" title={session.name}>{session.name}</h3>
                     <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">
                       {session.artifactScope.replace('_', ' ')}
                     </span>
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-4 flex-1 line-clamp-3">
                     {session.plan?.summary || 'No summary available.'}
                  </div>
                  <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                     <span className="text-slate-400">Suites: {session.plan?.suites.length || 0}</span>
                     <button 
                       onClick={() => onNavigateToSession(session)}
                       className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                     >
                       Open Plan →
                     </button>
                  </div>
               </div>
             ))}
             {filteredPlans.length === 0 && (
               <div className="col-span-full text-center py-10 text-slate-400">No test plans found.</div>
             )}
           </div>
        )}

        {/* === SUITES LIST === */}
        {viewMode === 'SUITES' && (
           <table className="w-full text-left text-sm">
             <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-medium">
               <tr>
                 <th className="px-6 py-4">Suite Name</th>
                 <th className="px-6 py-4">Project / Plan</th>
                 <th className="px-6 py-4">Case Count</th>
                 <th className="px-6 py-4 text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
               {allSuites.map((item, idx) => (
                 <tr key={`${item.session.id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-100">{item.suite.suiteName}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{item.session.name}</td>
                    <td className="px-6 py-4">
                       <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded text-xs font-mono">{item.suite.cases.length}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button 
                          onClick={() => onNavigateToSession(item.session)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs font-medium"
                       >
                         View Context
                       </button>
                    </td>
                 </tr>
               ))}
               {allSuites.length === 0 && (
                 <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No suites found.</td></tr>
               )}
             </tbody>
           </table>
        )}

        {/* === CASES LIST === */}
        {viewMode === 'CASES' && (
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
               <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-medium">
                 <tr>
                   <th className="px-4 py-3 w-32">ID</th>
                   <th className="px-4 py-3">Title</th>
                   <th className="px-4 py-3 w-32">Priority</th>
                   <th className="px-4 py-3 w-40">Suite</th>
                   <th className="px-4 py-3 w-40">Project</th>
                   <th className="px-4 py-3 w-20"></th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                 {allCases.map((item, idx) => (
                   <tr key={`${item.session.id}-${item.suiteIndex}-${item.caseIndex}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.testCase.id}</td>
                      <td className="px-4 py-3">
                         <input 
                           type="text" 
                           className="bg-transparent w-full focus:outline-none focus:border-b border-blue-500 truncate text-slate-800 dark:text-slate-200"
                           value={item.testCase.title}
                           onChange={(e) => updateTestCase(item, { title: e.target.value })}
                         />
                      </td>
                      <td className="px-4 py-3">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getPriorityColor(item.testCase.priority)}`}>
                           {item.testCase.priority}
                         </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[150px]" title={item.suiteName}>{item.suiteName}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[150px]" title={item.session.name}>{item.session.name}</td>
                      <td className="px-4 py-3 text-right">
                         <button 
                            onClick={() => onNavigateToSession(item.session)}
                            className="text-slate-300 hover:text-blue-500 transition-colors"
                            title="Go to Plan"
                         >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                         </button>
                      </td>
                   </tr>
                 ))}
                 {allCases.length === 0 && (
                   <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No cases found.</td></tr>
                 )}
               </tbody>
             </table>
           </div>
        )}

      </div>
    </div>
  );
};

export default ArtifactManager;
