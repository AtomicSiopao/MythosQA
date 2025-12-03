import React, { useState } from 'react';
import { TestPlan, TestSuite, TestCase, TestPriority, TestType, TestDataItem, SavedSession } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { exportToPdf, exportToCsv } from '../services/exportService';
import { generateCypressScript, generateSuiteCypressScript } from '../services/geminiService';

interface TestPlanDisplayProps {
  plan: TestPlan;
  onReset: () => void;
  onEditConfig: () => void;
  onGenerateMore: (suiteIndex: number, focusType?: string) => void;
  onUpdatePlan: (plan: TestPlan) => void;
  onRegenerateCase: (suiteIndex: number, caseIndex: number, newTestData: TestDataItem[]) => Promise<void>;
  generatingMoreSuiteIndex: number | null;
  onSaveSession: (name: string) => void;
}

const COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#6366f1'];

const PriorityBadge: React.FC<{ priority: TestPriority }> = ({ priority }) => {
  const colors = {
    [TestPriority.CRITICAL]: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
    [TestPriority.HIGH]: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
    [TestPriority.MEDIUM]: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    [TestPriority.LOW]: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };
  return <span className={`px-2 py-1 rounded text-xs font-semibold border ${colors[priority]}`}>{priority}</span>;
};

const TypeBadge: React.FC<{ type: TestType }> = ({ type }) => {
  const colors = {
    [TestType.FUNCTIONAL]: 'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800',
    [TestType.UI_UX]: 'text-pink-600 bg-pink-50 dark:text-pink-300 dark:bg-pink-900/20',
    [TestType.SECURITY]: 'text-purple-600 bg-purple-50 dark:text-purple-300 dark:bg-purple-900/20',
    [TestType.PERFORMANCE]: 'text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/20',
    [TestType.ACCESSIBILITY]: 'text-teal-600 bg-teal-50 dark:text-teal-300 dark:bg-teal-900/20',
    [TestType.EDGE_CASE]: 'text-indigo-600 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-900/20',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[type] || 'text-slate-600'}`}>{type}</span>;
};

const ScenarioBadge: React.FC<{ scenario?: 'Positive' | 'Negative' | 'Boundary' }> = ({ scenario }) => {
  if (!scenario) return null;
  const colors = {
    'Positive': 'text-green-600 bg-green-50 dark:text-green-300 dark:bg-green-900/20',
    'Negative': 'text-rose-600 bg-rose-50 dark:text-rose-300 dark:bg-rose-900/20',
    'Boundary': 'text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/20'
  };
  return <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium border border-transparent ${colors[scenario]}`}>{scenario}</span>;
};

interface TestCaseRowProps {
  testCase: TestCase;
  suiteIndex: number;
  caseIndex: number;
  websiteUrl: string;
  onOpenRegenerate: (suiteIndex: number, caseIndex: number, currentData: TestDataItem[]) => void;
  onGenerateScript: (testCase: TestCase) => void;
}

const TestCaseRow: React.FC<TestCaseRowProps> = ({ testCase, suiteIndex, caseIndex, websiteUrl, onOpenRegenerate, onGenerateScript }) => {
  const [expanded, setExpanded] = useState(false);

  const maskSensitiveText = (text: string) => {
    if (!testCase.testData) return text;
    let masked = text;
    testCase.testData.forEach(item => {
      if (item.isSensitive && item.value && item.value.length > 0) {
        if (item.value.length >= 3) {
           masked = masked.split(item.value).join('••••••');
        }
      }
    });
    return masked;
  };

  return (
    <>
      <tr 
        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-800 ${expanded ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">{testCase.id}</td>
        <td className="px-4 py-3 whitespace-nowrap"><PriorityBadge priority={testCase.priority} /></td>
        <td className="px-4 py-3 whitespace-nowrap">
          <TypeBadge type={testCase.type} />
          <ScenarioBadge scenario={testCase.scenarioType} />
        </td>
        <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">{testCase.title}</td>
        <td className="px-4 py-3 text-right">
          <svg className={`w-5 h-5 text-slate-400 transform transition-transform ${expanded ? 'rotate-180' : ''} inline-block`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50 dark:bg-slate-800/30">
          <td colSpan={5} className="px-4 pb-4 pt-2 border-b border-slate-200 dark:border-slate-800">
             <div className="pl-2 border-l-2 border-blue-200 dark:border-blue-800 ml-2 space-y-4">
                <div className="flex justify-between items-start">
                  <p className="text-sm text-slate-600 dark:text-slate-300">{testCase.description}</p>
                  <div className="flex gap-2">
                     <button
                       onClick={(e) => {
                         e.stopPropagation();
                         onGenerateScript(testCase);
                       }}
                       className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-purple-600 dark:text-purple-400 px-3 py-1 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      Generate Script
                    </button>
                    <button
                       onClick={(e) => {
                         e.stopPropagation();
                         onOpenRegenerate(suiteIndex, caseIndex, testCase.testData || []);
                       }}
                       className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-blue-600 dark:text-blue-400 px-3 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Regenerate Case
                    </button>
                  </div>
                </div>
                
                {testCase.preconditions && (
                   <div className="text-xs">
                     <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Preconditions:</span>
                     <span className="text-slate-600 dark:text-slate-400 ml-2">{testCase.preconditions}</span>
                   </div>
                )}

                {/* Test Data Display */}
                {testCase.testData && testCase.testData.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Test Data Input</span>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                       {testCase.testData.map((d, i) => (
                         <div key={i} className="flex justify-between border-b border-slate-100 dark:border-slate-800 last:border-0 pb-1">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">{d.key}:</span>
                            <span className="font-mono text-slate-800 dark:text-slate-200">{d.isSensitive ? '••••••' : d.value}</span>
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                {/* Steps Table */}
                <div>
                   <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">STEPS</span>
                   <table className="min-w-full mt-2 text-sm bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 overflow-hidden">
                     <thead className="bg-slate-100 dark:bg-slate-800">
                       <tr>
                         <th className="px-3 py-2 text-left w-12 text-slate-500 dark:text-slate-400">#</th>
                         <th className="px-3 py-2 text-left text-slate-500 dark:text-slate-400">Action</th>
                         <th className="px-3 py-2 text-left text-slate-500 dark:text-slate-400">Expected</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                       {testCase.steps.map((step, idx) => (
                         <tr key={idx}>
                           <td className="px-3 py-2 text-slate-400 dark:text-slate-500 font-mono text-xs">{step.stepNumber}</td>
                           <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{maskSensitiveText(step.action)}</td>
                           <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{step.expected}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </div>
             </div>
          </td>
        </tr>
      )}
    </>
  );
};

type FilterType = 'ALL' | 'POSITIVE' | 'NEGATIVE' | 'ACCESSIBILITY';
type SortOrder = 'DEFAULT' | 'PRIORITY_ASC' | 'PRIORITY_DESC';

const TestPlanDisplay: React.FC<TestPlanDisplayProps> = ({ 
  plan, onReset, onEditConfig, onGenerateMore, onUpdatePlan, onRegenerateCase, generatingMoreSuiteIndex, onSaveSession 
}) => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DEFAULT');
  const [activeAddCasesSuite, setActiveAddCasesSuite] = useState<number | null>(null);

  // Regenerate Modal State
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [selectedCaseInfo, setSelectedCaseInfo] = useState<{suiteIdx: number, caseIdx: number} | null>(null);
  const [modalTestData, setModalTestData] = useState<TestDataItem[]>([]);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Script Modal State
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [scriptContent, setScriptContent] = useState('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptTitle, setScriptTitle] = useState('Automation Script');

  const handleSaveClick = () => {
    const name = prompt("Enter a name for this session:", `Plan for ${new URL(plan.websiteUrl).hostname}`);
    if (name) {
      onSaveSession(name);
      alert("Session saved successfully!");
    }
  };

  const getStats = () => {
    let stats: Record<string, number> = {};
    plan.suites.forEach(suite => {
      suite.cases.forEach(c => {
        stats[c.type] = (stats[c.type] || 0) + 1;
      });
    });
    return Object.keys(stats).map(key => ({ name: key, value: stats[key] }));
  };

  const chartData = getStats();
  const totalCases = plan.suites.reduce((acc, suite) => acc + suite.cases.length, 0);

  // Sort Logic
  const priorityWeight = {
    [TestPriority.CRITICAL]: 4,
    [TestPriority.HIGH]: 3,
    [TestPriority.MEDIUM]: 2,
    [TestPriority.LOW]: 1
  };

  const getProcessedCases = (cases: TestCase[]) => {
    // Filter
    let processed = cases;
    switch (filter) {
      case 'POSITIVE':
        processed = cases.filter(c => c.scenarioType === 'Positive');
        break;
      case 'NEGATIVE':
        processed = cases.filter(c => c.scenarioType === 'Negative');
        break;
      case 'ACCESSIBILITY':
        processed = cases.filter(c => c.type === TestType.ACCESSIBILITY);
        break;
    }

    // Sort
    if (sortOrder !== 'DEFAULT') {
       processed = [...processed].sort((a, b) => {
         const weightA = priorityWeight[a.priority] || 0;
         const weightB = priorityWeight[b.priority] || 0;
         return sortOrder === 'PRIORITY_DESC' 
           ? weightB - weightA 
           : weightA - weightB;
       });
    }

    return processed;
  };

  const toggleSort = () => {
    setSortOrder(prev => {
      if (prev === 'DEFAULT') return 'PRIORITY_DESC'; // Critical First
      if (prev === 'PRIORITY_DESC') return 'PRIORITY_ASC'; // Low First
      return 'DEFAULT';
    });
  };

  // ... Regenerate Logic ...
  const handleOpenRegenerate = (suiteIdx: number, caseIdx: number, currentData: TestDataItem[]) => {
    setSelectedCaseInfo({ suiteIdx, caseIdx });
    setModalTestData(currentData.length ? JSON.parse(JSON.stringify(currentData)) : [{ key: 'Data Field', value: '', isSensitive: false }]);
    setIsRegenerateModalOpen(true);
  };
  const handleModalDataChange = (idx: number, field: string, value: any) => {
    const newData = [...modalTestData];
    newData[idx] = { ...newData[idx], [field]: value };
    setModalTestData(newData);
  };
  const handleAddModalField = () => {
    setModalTestData([...modalTestData, { key: '', value: '', isSensitive: true }]);
  };
  const handleRemoveModalField = (idx: number) => {
    setModalTestData(modalTestData.filter((_, i) => i !== idx));
  };
  const confirmRegenerate = async () => {
    if (!selectedCaseInfo) return;
    setIsRegenerating(true);
    try {
      await onRegenerateCase(selectedCaseInfo.suiteIdx, selectedCaseInfo.caseIdx, modalTestData);
      setIsRegenerateModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Failed to regenerate case.");
    } finally {
      setIsRegenerating(false);
    }
  };

  // ... Script Logic ...
  const handleGenerateScript = async (testCase: TestCase) => {
     setScriptTitle('Automation Script');
     setScriptContent('');
     setIsGeneratingScript(true);
     setIsScriptModalOpen(true);
     try {
       const script = await generateCypressScript(plan.websiteUrl, testCase);
       setScriptContent(script);
     } catch (e) {
       setScriptContent('Error generating script. Please try again.');
     } finally {
       setIsGeneratingScript(false);
     }
  };

  const handleGenerateSuiteScript = async (suite: TestSuite) => {
    setScriptTitle(`Suite Automation Script: ${suite.suiteName}`);
    setScriptContent('');
    setIsGeneratingScript(true);
    setIsScriptModalOpen(true);
    try {
      const script = await generateSuiteCypressScript(plan.websiteUrl, suite);
      setScriptContent(script);
    } catch (e) {
      setScriptContent('Error generating suite script. Please try again.');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const copyScriptToClipboard = () => {
    navigator.clipboard.writeText(scriptContent);
    alert("Script copied to clipboard!");
  };

  // ... Add Cases Logic ...
  const handleAddCasesClick = (suiteIdx: number, type?: string) => {
     onGenerateMore(suiteIdx, type);
     setActiveAddCasesSuite(null); // Close dropdown
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in" onClick={() => { setIsExportOpen(false); setActiveAddCasesSuite(null); }}>
      {/* ... Header and Summary (existing code structure) ... */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Test Plan Summary</h2>
           <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm mt-1">
            <span className="mr-2">Target:</span>
            <a href={plan.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-mono">
              {plan.websiteUrl}
            </a>
          </div>
        </div>
        <div className="flex gap-2 relative">
           <button 
              onClick={handleSaveClick}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center shadow-sm"
              title="Save this session"
           >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save Session
           </button>

           {/* Export Dropdown */}
           <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsExportOpen(!isExportOpen); }}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors flex items-center shadow-sm"
              >
                <span>Export Report</span>
                <svg className={`ml-2 h-4 w-4 transition-transform ${isExportOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isExportOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-20 border border-slate-100 dark:border-slate-700 animate-fade-in origin-top-right">
                   <div className="py-1">
                      <button onClick={() => exportToPdf(plan)} className="flex w-full items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                        Export as PDF
                      </button>
                      <button onClick={() => exportToCsv(plan)} className="flex w-full items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                        Export as CSV
                      </button>
                   </div>
                </div>
              )}
           </div>

          <button 
            onClick={onReset}
            className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
          >
            New URL
          </button>
        </div>
      </div>

      {/* Charts Overview */}
       <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-12">
         <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Executive Summary</h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">{plan.summary}</p>
         </div>
         <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center items-center transition-colors duration-300">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 w-full text-left">Coverage by Type</h3>
            <div className="grid grid-cols-2 w-full h-full items-center">
                <div className="h-40 flex-shrink-0 flex justify-center">
                    <div className="h-40 w-40">
                        <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={chartData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} fill="#8884d8" paddingAngle={5} dataKey="value">
                            {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                        </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="flex-1 pl-4">
                   <div className="grid grid-cols-1 gap-y-1">
                      {chartData.map((entry, index) => (
                        <div key={index} className="flex items-center text-xs">
                           <span className="w-2 h-2 rounded-full mr-1.5 flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                           <span className="text-slate-600 dark:text-slate-300 truncate">{entry.name}: <span className="font-bold">{entry.value}</span></span>
                        </div>
                      ))}
                   </div>
                   <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-lg font-bold text-slate-800 dark:text-white">
                      {totalCases} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Total Cases</span>
                   </div>
                </div>
            </div>
         </div>
      </div>

      {/* Filter Tabs & Sort */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center border-b border-slate-200 dark:border-slate-800">
        <div className="flex space-x-4 mb-2 sm:mb-0">
          {[
            { id: 'ALL', label: 'All Cases' },
            { id: 'POSITIVE', label: 'Positive' },
            { id: 'NEGATIVE', label: 'Negative' },
            { id: 'ACCESSIBILITY', label: 'Accessibility' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as FilterType)}
              className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
                filter === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <button 
          onClick={toggleSort}
          className="mb-2 sm:mb-0 text-xs flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
        >
          <span>Sort Priority:</span>
          <span className="uppercase">{sortOrder === 'DEFAULT' ? 'Default' : (sortOrder === 'PRIORITY_DESC' ? 'High → Low' : 'Low → High')}</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      {/* Tabular Data: Suites and Cases */}
      <div className="space-y-8">
        {plan.suites.map((suite, idx) => {
          const processedCases = getProcessedCases(suite.cases);
          if (processedCases.length === 0 && filter !== 'ALL') return null;
          
          const isGeneratingThisSuite = generatingMoreSuiteIndex === idx;

          return (
            <div key={idx} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors duration-300">
               <div className="bg-slate-100 dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white">{suite.suiteName}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{suite.description}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-2 sm:mt-0 relative">
                    {/* Generate Suite Script Button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleGenerateSuiteScript(suite); }}
                        className="px-3 py-1 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-900/20 rounded hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        Generate Suite Script
                    </button>

                    <span className="px-3 py-1 bg-white dark:bg-slate-700 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 shadow-sm">
                       {processedCases.length} cases
                    </span>
                    
                    {/* Add Cases Dropdown */}
                    <div className="relative">
                        {isGeneratingThisSuite ? (
                           <button 
                             disabled
                             className="px-3 py-1 text-xs font-medium text-blue-400 dark:text-blue-300 border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 rounded cursor-not-allowed flex items-center"
                           >
                             <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                             </svg>
                             Generating...
                           </button>
                        ) : (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setActiveAddCasesSuite(activeAddCasesSuite === idx ? null : idx); }}
                              className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center"
                            >
                              + Add Test Cases
                              <svg className={`ml-1 h-3 w-3 transform transition-transform ${activeAddCasesSuite === idx ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                        )}
                        
                        {activeAddCasesSuite === idx && !isGeneratingThisSuite && (
                           <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-900 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20 border border-slate-100 dark:border-slate-700 animate-fade-in origin-top-right">
                              <div className="py-1">
                                 <button onClick={(e) => { e.stopPropagation(); handleAddCasesClick(idx); }} className="block w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                                   Any / Random
                                 </button>
                                 <button onClick={(e) => { e.stopPropagation(); handleAddCasesClick(idx, 'Positive'); }} className="block w-full text-left px-4 py-2 text-xs text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20">
                                   Positive Flow
                                 </button>
                                 <button onClick={(e) => { e.stopPropagation(); handleAddCasesClick(idx, 'Negative'); }} className="block w-full text-left px-4 py-2 text-xs text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                                   Negative Flow
                                 </button>
                                 <button onClick={(e) => { e.stopPropagation(); handleAddCasesClick(idx, 'UI/UX'); }} className="block w-full text-left px-4 py-2 text-xs text-pink-700 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20">
                                   UI/UX
                                 </button>
                                 <button onClick={(e) => { e.stopPropagation(); handleAddCasesClick(idx, 'Accessibility'); }} className="block w-full text-left px-4 py-2 text-xs text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20">
                                   Accessibility
                                 </button>
                              </div>
                           </div>
                        )}
                    </div>
                  </div>
               </div>
               
               <div className="overflow-x-auto">
                 <table className="min-w-full text-left">
                   <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                     <tr>
                       <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-24">ID</th>
                       <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-24">Priority</th>
                       <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-32">Type</th>
                       <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Title</th>
                       <th className="px-4 py-3 w-10"></th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {processedCases.map((tc, cIdx) => (
                        <TestCaseRow 
                          key={tc.id} 
                          testCase={tc} 
                          suiteIndex={idx}
                          caseIndex={cIdx}
                          websiteUrl={plan.websiteUrl}
                          onOpenRegenerate={handleOpenRegenerate}
                          onGenerateScript={handleGenerateScript}
                        />
                      ))}
                      {processedCases.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500 text-sm italic">
                            No cases found matching filter "{filter}".
                          </td>
                        </tr>
                      )}
                   </tbody>
                 </table>
               </div>
            </div>
          );
        })}
      </div>

      {/* Regenerate Modal */}
      {isRegenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in">
             {/* ... (Existing modal content) ... */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Regenerate Test Case</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Provide new data to rewrite this test case.</p>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                {modalTestData.map((data, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <input 
                      type="text" 
                      placeholder="Key" 
                      value={data.key}
                      onChange={(e) => handleModalDataChange(idx, 'key', e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                    <input 
                      type="text" 
                      placeholder="Value" 
                      value={data.value}
                      onChange={(e) => handleModalDataChange(idx, 'value', e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                     <button
                        onClick={() => handleRemoveModalField(idx)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                       </svg>
                     </button>
                  </div>
                ))}
                
                <button 
                  onClick={handleAddModalField}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                >
                  + Add Data Field
                </button>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => setIsRegenerateModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
                disabled={isRegenerating}
              >
                Cancel
              </button>
              <button 
                onClick={confirmRegenerate}
                disabled={isRegenerating}
                className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition-colors flex items-center"
              >
                {isRegenerating ? 'Regenerating...' : 'Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Script Generation Modal */}
      {isScriptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">{scriptTitle}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Cypress Automation Code</p>
              </div>
              <button 
                onClick={() => setIsScriptModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
              </button>
            </div>
            
            <div className="p-0 flex-1 overflow-auto bg-slate-900">
               {isGeneratingScript ? (
                 <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                    <svg className="animate-spin h-8 w-8 text-blue-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                    <p>Generating script...</p>
                 </div>
               ) : (
                 <pre className="p-4 text-xs sm:text-sm font-mono text-green-400 whitespace-pre-wrap">{scriptContent}</pre>
               )}
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button 
                onClick={copyScriptToClipboard}
                disabled={isGeneratingScript || !scriptContent}
                className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition-colors flex items-center"
              >
                Copy Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestPlanDisplay;
