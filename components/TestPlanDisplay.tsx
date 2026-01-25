
import React, { useState, useEffect, useMemo } from 'react';
import { TestPlan, TestSuite, TestCase, TestPriority, TestType, TestDataItem, SavedSession, GeneratedScript, ChecklistItem, ExportOptions } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { exportToPdf, exportToCsv } from '../services/exportService';
import { generateCypressScript, generateSuiteCypressScript, generateChecklist } from '../services/geminiService';
import TestCaseCard from './TestCaseCard';

interface TestPlanDisplayProps {
  plan: TestPlan;
  onReset: () => void;
  onEditConfig: () => void;
  onGenerateMore: (suiteIndex: number, focusType?: string, count?: number) => void;
  onUpdatePlan: (plan: TestPlan) => void;
  onRegenerateCase: (suiteIndex: number, caseIndex: number, newTestData: TestDataItem[]) => Promise<void>;
  onUpdateTestCase: (suiteIndex: number, caseIndex: number, updatedCase: TestCase) => void;
  onDeleteSuite: (suiteIndex: number) => void;
  onDeleteCase: (suiteIndex: number, caseIndex: number) => void;
  generatingSuiteIndices: number[];
  onSaveSession: (name: string) => void;
  onSaveScript: (script: GeneratedScript) => void;
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
    [TestType.SEO]: 'text-green-600 bg-green-50 dark:text-green-300 dark:bg-green-900/20',
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

// --- Test Case Row Component (Kept separate for cleaner file) ---
interface TestCaseRowProps {
  testCase: TestCase;
  suiteIndex: number;
  caseIndex: number;
  websiteUrl: string;
  onOpenRegenerate: (suiteIndex: number, caseIndex: number, currentData: TestDataItem[]) => void;
  onGenerateScript: (testCase: TestCase) => void;
  onUpdate: (suiteIndex: number, caseIndex: number, updatedCase: TestCase) => void;
  onDelete: (suiteIndex: number, caseIndex: number) => void;
}

const TestCaseRow: React.FC<TestCaseRowProps> = ({ testCase, suiteIndex, caseIndex, websiteUrl, onOpenRegenerate, onGenerateScript, onUpdate, onDelete }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    // Clear new badge on expansion
    if (newExpanded && testCase.isNew) {
      onUpdate(suiteIndex, caseIndex, { ...testCase, isNew: false });
    }
  };

  return (
    <>
      <tr 
        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-800 ${expanded ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}
        onClick={toggleExpand}
      >
        <td className="px-4 py-3 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {testCase.id}
            {testCase.isNew && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 animate-pulse">NEW</span>}
        </td>
        <td className="px-4 py-3 whitespace-nowrap"><PriorityBadge priority={testCase.priority} /></td>
        <td className="px-4 py-3 whitespace-nowrap">
          <TypeBadge type={testCase.type} />
          <ScenarioBadge scenario={testCase.scenarioType} />
        </td>
        <td className="px-4 py-3">
           <input 
              type="text" 
              value={testCase.title}
              onChange={(e) => onUpdate(suiteIndex, caseIndex, { ...testCase, title: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400"
              placeholder="Test Case Title"
           />
        </td>
        <td className="px-4 py-3 text-right whitespace-nowrap">
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(suiteIndex, caseIndex); }}
            className="p-1 mr-2 text-slate-400 hover:text-red-500 transition-colors inline-block"
            title="Delete Case"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <svg className={`w-5 h-5 text-slate-400 transform transition-transform ${expanded ? 'rotate-180' : ''} inline-block`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50 dark:bg-slate-800/30">
          <td colSpan={5} className="px-4 pb-4 pt-2 border-b border-slate-200 dark:border-slate-800">
             <div className="pl-2 border-l-2 border-blue-200 dark:border-blue-800 ml-2">
                <TestCaseCard testCase={testCase} />
                <div className="flex gap-2 mt-2 justify-end">
                     <button
                       onClick={(e) => { e.stopPropagation(); onGenerateScript(testCase); }}
                       className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-purple-600 dark:text-purple-400 px-3 py-1 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center"
                    >
                      Generate Script
                    </button>
                    <button
                       onClick={(e) => { e.stopPropagation(); onOpenRegenerate(suiteIndex, caseIndex, testCase.testData || []); }}
                       className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-blue-600 dark:text-blue-400 px-3 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center"
                    >
                      Regenerate Case
                    </button>
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
  plan, onReset, onEditConfig, onGenerateMore, onUpdatePlan, onRegenerateCase, onUpdateTestCase, onDeleteSuite, onDeleteCase, generatingSuiteIndices, onSaveSession, onSaveScript
}) => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includePlan: true,
    includeSuites: true,
    includeChecklist: true
  });

  const [filter, setFilter] = useState<FilterType>('ALL');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DEFAULT');
  const [activeAddCasesSuite, setActiveAddCasesSuite] = useState<number | null>(null);
  const [activeScriptSuite, setActiveScriptSuite] = useState<number | null>(null);
  const [addCaseCount, setAddCaseCount] = useState<number>(3);

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

  // Checklist State
  const [checklistScore, setChecklistScore] = useState({ current: 0, total: 0 });
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false);
  const [isGenerateChecklistModalOpen, setIsGenerateChecklistModalOpen] = useState(false);
  const [newChecklistCount, setNewChecklistCount] = useState(5);
  const [newChecklistType, setNewChecklistType] = useState('ALL');
  const [newChecklistFeature, setNewChecklistFeature] = useState<string>('ALL');
  const [collapsedChecklistGroups, setCollapsedChecklistGroups] = useState<Record<string, boolean>>({});

  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistText, setEditingChecklistText] = useState('');

  useEffect(() => {
    if (plan.checklist) {
      let current = 0;
      let total = 0;
      plan.checklist.forEach(item => {
        let weight = 1;
        if (item.priority === TestPriority.CRITICAL) weight = 10;
        else if (item.priority === TestPriority.HIGH) weight = 5;
        else if (item.priority === TestPriority.MEDIUM) weight = 2;
        
        total += weight;
        if (item.isChecked) current += weight;
      });
      setChecklistScore({ current, total });
    }
  }, [plan.checklist]);

  const toggleChecklistItem = (id: string) => {
    if (!plan.checklist) return;
    const updatedChecklist = plan.checklist.map(item => 
      item.id === id ? { ...item, isChecked: !item.isChecked, isNew: false } : item
    );
    onUpdatePlan({ ...plan, checklist: updatedChecklist });
  };

  const deleteChecklistItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!plan.checklist) return;
    onUpdatePlan({ 
      ...plan, 
      checklist: plan.checklist.filter(i => i.id !== id) 
    });
  };

  const startEditChecklist = (id: string, text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChecklistId(id);
    setEditingChecklistText(text);
    
    // Clear new status when editing starts
    if (!plan.checklist) return;
    const updatedChecklist = plan.checklist.map(item => 
        item.id === id ? { ...item, isNew: false } : item
    );
    onUpdatePlan({ ...plan, checklist: updatedChecklist });
  };

  const saveEditChecklist = (id: string) => {
    if (!plan.checklist) return;
    const updatedChecklist = plan.checklist.map(item => 
      item.id === id ? { ...item, description: editingChecklistText } : item
    );
    onUpdatePlan({ ...plan, checklist: updatedChecklist });
    setEditingChecklistId(null);
  };

  const handleGenerateChecklist = async () => {
    setIsGeneratingChecklist(true);
    setIsGenerateChecklistModalOpen(false);
    try {
      const currentList = plan.checklist || [];
      const currentIds = currentList.map(i => i.id);
      
      const featureFocus = newChecklistFeature === 'ALL' ? undefined : newChecklistFeature;

      const newItems = await generateChecklist(
        plan.websiteUrl, 
        plan, 
        newChecklistCount, 
        newChecklistType, 
        currentIds,
        featureFocus
      );
      
      // Additional client-side deduplication just in case
      const currentIdSet = new Set(currentIds);
      const uniqueNewItems = newItems.map(item => {
          let uniqueId = item.id;
          if (currentIdSet.has(uniqueId)) {
              uniqueId = `${uniqueId}-${Math.floor(Math.random() * 1000)}`;
          }
          return { ...item, id: uniqueId, isNew: true }; // Mark as new for highlighting
      });

      onUpdatePlan({ ...plan, checklist: [...currentList, ...uniqueNewItems] });
    } catch (e) {
      console.error(e);
      alert("Failed to generate checklist items. Please try again.");
    } finally {
      setIsGeneratingChecklist(false);
    }
  };

  // Grouping Logic
  const groupedChecklist = useMemo(() => {
    if (!plan.checklist) return {};
    const groups: Record<string, ChecklistItem[]> = {};
    
    plan.checklist.forEach(item => {
        const cat = item.category || 'General';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(item);
    });
    
    return groups;
  }, [plan.checklist]);

  const toggleGroup = (category: string) => {
      setCollapsedChecklistGroups(prev => ({
          ...prev,
          [category]: !prev[category]
      }));
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
    let processed = cases;
    switch (filter) {
      case 'POSITIVE': processed = cases.filter(c => c.scenarioType === 'Positive'); break;
      case 'NEGATIVE': processed = cases.filter(c => c.scenarioType === 'Negative'); break;
      case 'ACCESSIBILITY': processed = cases.filter(c => c.type === TestType.ACCESSIBILITY); break;
    }

    if (sortOrder !== 'DEFAULT') {
       processed = [...processed].sort((a, b) => {
         const weightA = priorityWeight[a.priority] || 0;
         const weightB = priorityWeight[b.priority] || 0;
         return sortOrder === 'PRIORITY_DESC' ? weightB - weightA : weightA - weightB;
       });
    }
    return processed;
  };

  const toggleSort = () => {
    setSortOrder(prev => {
      if (prev === 'DEFAULT') return 'PRIORITY_DESC';
      if (prev === 'PRIORITY_DESC') return 'PRIORITY_ASC';
      return 'DEFAULT';
    });
  };

  // ... [Handlers for Regenerate, Script, Add Cases] ...
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
  const handleAddModalField = () => setModalTestData([...modalTestData, { key: '', value: '', isSensitive: true }]);
  const handleRemoveModalField = (idx: number) => setModalTestData(modalTestData.filter((_, i) => i !== idx));
  
  const confirmRegenerate = async () => {
    if (!selectedCaseInfo) return;
    setIsRegenerating(true);
    try {
      await onRegenerateCase(selectedCaseInfo.suiteIdx, selectedCaseInfo.caseIdx, modalTestData);
      setIsRegenerateModalOpen(false);
    } catch (e) { console.error(e); alert("Failed to regenerate case."); } 
    finally { setIsRegenerating(false); }
  };

  const handleGenerateScript = async (testCase: TestCase) => {
     setScriptTitle(`Automation Script: ${testCase.id}`);
     setScriptContent('');
     setIsGeneratingScript(true);
     setIsScriptModalOpen(true);
     try {
       const script = await generateCypressScript(plan.websiteUrl, testCase);
       setScriptContent(script);
       onSaveScript({ id: Date.now().toString(), name: `Cypress - Case ${testCase.id}`, framework: 'Cypress', code: script, createdAt: Date.now() });
     } catch (e) { setScriptContent('Error generating script.'); } 
     finally { setIsGeneratingScript(false); }
  };

  const handleGenerateSuiteScript = async (suite: TestSuite) => {
    setScriptTitle(`Suite Automation Script: ${suite.suiteName}`);
    setScriptContent('');
    setIsGeneratingScript(true);
    setIsScriptModalOpen(true);
    try {
      const script = await generateSuiteCypressScript(plan.websiteUrl, suite);
      setScriptContent(script);
      onSaveScript({ id: Date.now().toString(), name: `Cypress - Suite ${suite.suiteName}`, framework: 'Cypress', code: script, createdAt: Date.now(), targetSuiteNames: [suite.suiteName] });
    } catch (e) { setScriptContent('Error generating suite script.'); } 
    finally { setIsGeneratingScript(false); }
  };

  const copyScriptToClipboard = () => { navigator.clipboard.writeText(scriptContent); alert("Script copied!"); };
  const handleAddCasesClick = (suiteIdx: number, type?: string) => { onGenerateMore(suiteIdx, type, addCaseCount); setActiveAddCasesSuite(null); };

  const handleExport = (type: 'PDF' | 'CSV') => {
    if (type === 'PDF') {
      exportToPdf(plan, exportOptions);
    } else {
      exportToCsv(plan, exportOptions);
    }
    setIsExportOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in" onClick={() => { setIsExportOpen(false); setActiveAddCasesSuite(null); setActiveScriptSuite(null); }}>
      {/* Header and Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Test Plan Summary</h2>
           <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mt-1">
            <span className="flex items-center gap-2">
              <span className="mr-1">Target:</span>
              <a href={plan.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-mono">
                {plan.websiteUrl}
              </a>
            </span>
             {plan.authAnalysis && (
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${plan.authAnalysis.used ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                  {plan.authAnalysis.used ? 'Authenticated' : 'Public Access'}
                </span>
             )}
          </div>
        </div>
        <div className="flex gap-2 relative">
           <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsExportOpen(!isExportOpen); }}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors flex items-center shadow-sm"
              >
                <span>Export</span>
                <svg className={`ml-2 h-4 w-4 transition-transform ${isExportOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isExportOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-20 border border-slate-100 dark:border-slate-700 animate-fade-in origin-top-right p-3" onClick={e => e.stopPropagation()}>
                   <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Includes</div>
                   <div className="space-y-2 mb-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={exportOptions.includePlan} onChange={e => setExportOptions({...exportOptions, includePlan: e.target.checked})} className="rounded text-blue-600"/>
                        <span className="text-sm text-slate-700 dark:text-slate-200">Test Plan Summary</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={exportOptions.includeSuites} onChange={e => setExportOptions({...exportOptions, includeSuites: e.target.checked})} className="rounded text-blue-600"/>
                        <span className="text-sm text-slate-700 dark:text-slate-200">Test Suites & Cases</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={exportOptions.includeChecklist} onChange={e => setExportOptions({...exportOptions, includeChecklist: e.target.checked})} className="rounded text-blue-600"/>
                        <span className="text-sm text-slate-700 dark:text-slate-200">Exploratory Checklist</span>
                      </label>
                   </div>
                   <div className="flex flex-col gap-1">
                      <button onClick={() => handleExport('PDF')} className="flex w-full items-center justify-center px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Download PDF</button>
                      <button onClick={() => handleExport('CSV')} className="flex w-full items-center justify-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors">Download CSV</button>
                   </div>
                </div>
              )}
           </div>
          <button onClick={onReset} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700">New URL</button>
        </div>
      </div>

      {/* Executive Summary & Charts */}
       <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-12">
         <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Executive Summary</h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">{plan.summary}</p>
         </div>
         {totalCases > 0 && (
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
         )}
      </div>

      {/* --- CHECKLIST SECTION --- */}
      <div className="mb-12">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white">Exploratory Checklist</h3>
                      <p className="text-xs text-slate-500">Manual verification tracking.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                          <div className="text-2xl font-black text-slate-800 dark:text-white">{checklistScore.current} <span className="text-sm font-normal text-slate-400">/ {checklistScore.total}</span></div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quality Score</div>
                      </div>
                      <div className="relative">
                        <button 
                            onClick={() => setIsGenerateChecklistModalOpen(true)} 
                            disabled={isGeneratingChecklist}
                            className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                        >
                            {isGeneratingChecklist ? 'Generating...' : 'Generate'}
                        </button>
                        {isGenerateChecklistModalOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-20 border border-slate-100 dark:border-slate-700 animate-fade-in origin-top-right p-3" onClick={e => e.stopPropagation()}>
                                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Generate Items</div>
                                <div className="mb-2">
                                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Feature Context</label>
                                    <select 
                                        value={newChecklistFeature}
                                        onChange={e => setNewChecklistFeature(e.target.value)}
                                        className="w-full border border-slate-200 dark:border-slate-700 rounded p-1 text-sm bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white mb-2"
                                    >
                                        <option value="ALL">General / Global</option>
                                        {plan.suites.map((suite, idx) => (
                                            <option key={idx} value={suite.suiteName}>{suite.suiteName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mb-2">
                                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Count</label>
                                    <input 
                                        type="number" 
                                        min="1" max="20" 
                                        value={newChecklistCount}
                                        onChange={e => setNewChecklistCount(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                                        className="w-full border border-slate-200 dark:border-slate-700 rounded p-1 text-sm bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Test Type Focus</label>
                                    <select 
                                        value={newChecklistType}
                                        onChange={e => setNewChecklistType(e.target.value)}
                                        className="w-full border border-slate-200 dark:border-slate-700 rounded p-1 text-sm bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
                                    >
                                        <option value="ALL">Mix (All Types)</option>
                                        <option value={TestType.FUNCTIONAL}>Functional</option>
                                        <option value={TestType.UI_UX}>UI/UX</option>
                                        <option value={TestType.SECURITY}>Security</option>
                                        <option value={TestType.PERFORMANCE}>Performance</option>
                                        <option value={TestType.ACCESSIBILITY}>Accessibility</option>
                                        <option value={TestType.EDGE_CASE}>Edge Case</option>
                                        <option value={TestType.SEO}>SEO</option>
                                    </select>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setIsGenerateChecklistModalOpen(false)} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                                    <button onClick={handleGenerateChecklist} className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">Generate</button>
                                </div>
                            </div>
                        )}
                      </div>
                  </div>
              </div>
              
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto">
                  {Object.entries(groupedChecklist).map(([category, items]) => (
                      <div key={category} className="bg-slate-50/30 dark:bg-slate-900/30">
                          <div 
                            className="px-6 py-2 bg-slate-100/50 dark:bg-slate-800/50 border-y border-slate-100 dark:border-slate-700 cursor-pointer flex items-center justify-between group"
                            onClick={() => toggleGroup(category)}
                          >
                              <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                  {category} 
                                  <span className="bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full text-[10px]">{items.length}</span>
                              </h4>
                              <svg 
                                className={`w-4 h-4 text-slate-400 transition-transform ${collapsedChecklistGroups[category] ? '-rotate-90' : ''}`} 
                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                              >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                          </div>
                          
                          {!collapsedChecklistGroups[category] && (
                              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {items.map((item, index) => (
                                      <div 
                                          key={`${item.id}-${index}`} 
                                          onClick={() => toggleChecklistItem(item.id)}
                                          className={`px-6 py-3 flex items-center justify-between cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 group ${item.isChecked ? 'bg-slate-50/50 dark:bg-slate-900/30' : ''}`}
                                      >
                                          {/* Checkbox */}
                                          <div className={`mr-4 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${item.isChecked ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
                                              {item.isChecked && (
                                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                  </svg>
                                              )}
                                          </div>

                                          {/* ID Column */}
                                          <div className="w-20 text-xs text-slate-400 font-mono flex-shrink-0">
                                              {item.id}
                                              {item.isNew && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 animate-pulse">NEW</span>}
                                          </div>

                                          {/* Type Column */}
                                          <div className="w-32 flex-shrink-0">
                                              <TypeBadge type={item.type || TestType.FUNCTIONAL} />
                                          </div>

                                          {/* Description Column */}
                                          <div className="flex-1 pr-4">
                                              {editingChecklistId === item.id ? (
                                                <input 
                                                  type="text"
                                                  autoFocus
                                                  value={editingChecklistText}
                                                  onChange={(e) => setEditingChecklistText(e.target.value)}
                                                  onBlur={() => saveEditChecklist(item.id)}
                                                  onKeyDown={(e) => e.key === 'Enter' && saveEditChecklist(item.id)}
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="w-full bg-white dark:bg-slate-900 border border-blue-500 rounded px-2 py-1 text-sm outline-none text-slate-800 dark:text-white"
                                                />
                                              ) : (
                                                <div className={`text-sm font-medium transition-all ${item.isChecked ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                                    {item.description}
                                                </div>
                                              )}
                                          </div>
                                          
                                          {/* Priority & Actions Column */}
                                          <div className="w-24 text-right flex items-center justify-end gap-3">
                                              <PriorityBadge priority={item.priority} />
                                              
                                              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 bg-white dark:bg-slate-900 shadow-sm rounded border border-slate-200 dark:border-slate-700 p-1">
                                                <button 
                                                  onClick={(e) => startEditChecklist(item.id, item.description, e)}
                                                  className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                                                  title="Edit"
                                                >
                                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                  </svg>
                                                </button>
                                                <button 
                                                  onClick={(e) => deleteChecklistItem(item.id, e)}
                                                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                  title="Delete"
                                                >
                                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                  </svg>
                                                </button>
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  ))}
                  
                  {(!plan.checklist || plan.checklist.length === 0) && (
                    <div className="p-8 text-center text-slate-400 italic text-sm">
                      No checklist items. Generate one or add items manually.
                    </div>
                  )}
              </div>
          </div>
      </div>

      {/* Filter Tabs & Sort */}
      {plan.suites.length > 0 && (
      <>
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
          
          const isGeneratingThisSuite = generatingSuiteIndices.includes(idx);

          return (
            <div key={idx} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300 relative">
               <div className="bg-slate-100 dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between rounded-t-lg">
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white">{suite.suiteName}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{suite.description}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-2 sm:mt-0 relative">
                    
                    <button 
                       onClick={() => { if(window.confirm('Delete this suite and all its cases?')) onDeleteSuite(idx); }}
                       className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                       title="Delete Suite"
                    >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                       </svg>
                    </button>

                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setActiveScriptSuite(activeScriptSuite === idx ? null : idx); }}
                            className="px-3 py-1 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-900/20 rounded hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors flex items-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                            Generate Script
                        </button>
                        
                        {activeScriptSuite === idx && (
                            <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-900 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20 border border-slate-100 dark:border-slate-700 animate-fade-in origin-top-right p-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => { handleGenerateSuiteScript(suite); setActiveScriptSuite(null); }}
                                    className="block w-full text-left px-2 py-1.5 rounded text-xs text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                                >
                                    Cypress
                                </button>
                            </div>
                        )}
                    </div>

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
                            </button>
                        )}
                        
                        {activeAddCasesSuite === idx && !isGeneratingThisSuite && (
                           <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20 border border-slate-100 dark:border-slate-700 animate-fade-in origin-top-right p-2" onClick={(e) => e.stopPropagation()}>
                                <div className="mb-2 px-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                                   <label className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold mb-1 block">Count to Generate</label>
                                   <input 
                                     type="number" 
                                     min="1" 
                                     max="10" 
                                     value={addCaseCount}
                                     onChange={(e) => setAddCaseCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                                     className="w-full text-xs p-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                   />
                                </div>
                              <div className="space-y-1">
                                 <button onClick={() => handleAddCasesClick(idx)} className="block w-full text-left px-2 py-1.5 rounded text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Any / Random</button>
                                 <button onClick={() => handleAddCasesClick(idx, 'Positive')} className="block w-full text-left px-2 py-1.5 rounded text-xs text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20">Positive Flow</button>
                                 <button onClick={() => handleAddCasesClick(idx, 'Negative')} className="block w-full text-left px-2 py-1.5 rounded text-xs text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">Negative Flow</button>
                                 <button onClick={() => handleAddCasesClick(idx, 'UI/UX')} className="block w-full text-left px-2 py-1.5 rounded text-xs text-pink-700 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20">UI/UX</button>
                                 <button onClick={() => handleAddCasesClick(idx, 'Accessibility')} className="block w-full text-left px-2 py-1.5 rounded text-xs text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20">Accessibility</button>
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
                       <th className="px-4 py-3 w-20"></th>
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
                          onUpdate={onUpdateTestCase}
                          onDelete={onDeleteCase}
                        />
                      ))}
                   </tbody>
                 </table>
               </div>
            </div>
          );
        })}
      </div>
      </>
      )}
      
      {/* Script Generation Modal */}
      {isScriptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setIsScriptModalOpen(false)}>
           <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[85vh] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
               <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    {scriptTitle}
                  </h3>
                  <button onClick={() => setIsScriptModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
               </div>
               
               <div className="flex-1 overflow-auto bg-slate-900 p-6 relative">
                  {isGeneratingScript ? (
                     <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p>Generating script code...</p>
                     </div>
                  ) : (
                    <>
                       <div className="absolute top-4 right-4 z-10">
                            <button onClick={copyScriptToClipboard} className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-1.5 rounded-md shadow-sm border border-slate-600 transition-colors flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copy
                            </button>
                        </div>
                        <pre className="font-mono text-sm text-green-400 leading-relaxed whitespace-pre-wrap">{scriptContent}</pre>
                    </>
                  )}
               </div>
           </div>
        </div>
      )}

      {/* Regenerate Modal (unchanged logic, just re-rendered for context) */}
      {isRegenerateModalOpen && selectedCaseInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setIsRegenerateModalOpen(false)}>
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden" onClick={e => e.stopPropagation()}>
               <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Regenerate Test Case</h3>
                  <button onClick={() => setIsRegenerateModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
               </div>
               <div className="p-6 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-3">
                     {modalTestData.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                           <input className="w-1/3 px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white" value={item.key} onChange={(e) => handleModalDataChange(idx, 'key', e.target.value)} placeholder="Field Name" />
                           <div className="flex-1 relative">
                              <input className="w-full px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white pr-8" value={item.value} onChange={(e) => handleModalDataChange(idx, 'value', e.target.value)} placeholder="Value" type={item.isSensitive ? 'password' : 'text'} />
                               <button type="button" onClick={() => handleModalDataChange(idx, 'isSensitive', !item.isSensitive)} className={`absolute right-2 top-1.5 text-slate-400 ${item.isSensitive ? 'text-blue-500' : ''}`}>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                               </button>
                           </div>
                           <button onClick={() => handleRemoveModalField(idx)} className="text-red-400 p-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                        </div>
                     ))}
                     <button onClick={handleAddModalField} className="text-xs text-blue-500 font-bold hover:underline">+ Add Field</button>
                  </div>
               </div>
               <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-3">
                  <button onClick={() => setIsRegenerateModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">Cancel</button>
                  <button onClick={confirmRegenerate} disabled={isRegenerating} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm flex items-center disabled:opacity-50">{isRegenerating ? 'Rewriting...' : 'Regenerate'}</button>
               </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default TestPlanDisplay;
