
import React, { useState, useEffect } from 'react';
import { QualityReport, SavedSession } from '../types';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, Legend } from 'recharts';
import { generateQualityMetrics, generateImprovementCases } from '../services/geminiService';

interface QualityMetricsReportProps {
  session: SavedSession | null;
  onUpdateSession: (session: SavedSession) => void;
  onChangeView: (view: any) => void;
}

const ALL_CATEGORIES = [
  "Functional Suitability",
  "Performance Efficiency",
  "Compatibility",
  "Usability",
  "Reliability",
  "Security",
  "Maintainability",
  "Portability",
  "SEO Optimization"
];

const METRIC_FORMULAS: Record<string, string> = {
  "Functional Suitability": "Score = (Coverage / Complexity) * 100",
  "Performance Efficiency": "Score = (Optimized Paths / Total Paths) * 100",
  "Compatibility": "Score = (Device Support / Required Support) * 100",
  "Usability": "Score = (UI Guidelines Compliance * UX Flows) / 100",
  "Reliability": "Score = (Error Handling Coverage + Recovery Scenarios) / 2",
  "Security": "Score = (Vulnerability Coverage / Threat Model) * 100",
  "Maintainability": "Score = (Modularity + Reusability) / 2",
  "Portability": "Score = (Environment Adaptability / Platform Constraints) * 100",
  "SEO Optimization": "Score = (Meta & Tech SEO Coverage / Discoverability) * 100"
};

const QualityMetricsReport: React.FC<QualityMetricsReportProps> = ({ session, onUpdateSession, onChangeView }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingImprovement, setGeneratingImprovement] = useState<string | null>(null);
  const [generatedSuiteName, setGeneratedSuiteName] = useState<string | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(ALL_CATEGORIES);
  const report = session?.qualityReport;

  const handleGenerateReport = async () => {
    if (!session || !session.plan) return;
    setIsGenerating(true);
    try {
      const newReport = await generateQualityMetrics(session.plan);
      onUpdateSession({ ...session, qualityReport: newReport });
    } catch (e) {
      console.error(e);
      alert("Failed to generate quality metrics. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateImprovement = async (category: string) => {
    if (!session || !session.plan) return;
    setGeneratingImprovement(category);
    setGeneratedSuiteName(null);
    try {
      const newSuite = await generateImprovementCases(session.url, session.plan, category);
      
      // Mark cases as new for highlighting
      newSuite.cases = newSuite.cases.map(c => ({ ...c, isNew: true }));

      const updatedPlan = { ...session.plan };
      updatedPlan.suites = [...updatedPlan.suites, newSuite];
      
      onUpdateSession({ ...session, plan: updatedPlan });
      setGeneratedSuiteName(newSuite.suiteName);
    } catch (e) {
      console.error(e);
      alert(`Failed to generate improvements for ${category}.`);
    } finally {
      setGeneratingImprovement(null);
    }
  };

  const toggleMetric = (category: string) => {
    setSelectedMetrics(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const visibleMetrics = report?.metrics.filter(m => selectedMetrics.includes(m.category)) || [];

  const chartData = visibleMetrics.map(m => ({
    subject: m.category,
    A: m.score,
    fullMark: 100,
  }));

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 75) return 'text-blue-600 dark:text-blue-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (!session || !session.plan) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-950 animate-fade-in">
        <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
           </svg>
        </div>
        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">No Test Plan Selected</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mt-2">
          Please select a generated Test Plan session from the sidebar to analyze its software quality metrics.
        </p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-950 animate-fade-in">
         <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-10">
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4">Software Quality Metrics</h1>
            <p className="text-slate-600 dark:text-slate-300 mb-8 text-lg">
                Generate a comprehensive analysis of your test plan against <span className="font-bold">ISO 25010</span> standards.
                This report evaluates Functional Suitability, Performance, Compatibility, Usability, Reliability, Security, Maintainability, Portability, and SEO based on your coverage.
            </p>
            
            <button 
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto gap-3"
            >
                {isGenerating ? (
                    <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing Quality Standards...
                    </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Generate Quality Report
                    </>
                )}
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 animate-fade-in">
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Software Quality Metrics</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Based on analysis of {session.name} • Generated {new Date(report.timestamp).toLocaleDateString()}
                    </p>
                </div>
                <button 
                    onClick={handleGenerateReport}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {isGenerating ? 'Regenerating...' : 'Regenerate Analysis'}
                </button>
            </div>

            {/* Success Toast for Generation */}
            {generatedSuiteName && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-800 rounded-full text-green-600 dark:text-green-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-green-800 dark:text-green-300">Improvements Generated!</h4>
                            <p className="text-xs text-green-700 dark:text-green-400">Added new suite: "{generatedSuiteName}"</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => onChangeView('SUITES')}
                        className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700 transition-colors shadow-sm"
                    >
                        View Generated Cases →
                    </button>
                </div>
            )}

            {/* Config & Chart Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Metric Selection */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Metrics to Display</h3>
                    <div className="space-y-2">
                        {ALL_CATEGORIES.map(category => (
                            <label key={category} className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                                <span className="text-sm text-slate-700 dark:text-slate-300">{category}</span>
                                <input 
                                    type="checkbox" 
                                    checked={selectedMetrics.includes(category)}
                                    onChange={() => toggleMetric(category)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                            </label>
                        ))}
                    </div>
                </div>

                {/* Radar Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center">
                    <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Quality Analysis Radar</h3>
                    {visibleMetrics.length > 2 ? (
                        <div className="w-full h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                                    <PolarGrid stroke="#94a3b8" opacity={0.2} />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name="Score" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#fff', borderRadius: '8px' }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="text-slate-400 text-sm h-64 flex items-center">Select at least 3 metrics to view chart</div>
                    )}
                </div>
            </div>

            {/* Executive Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-8 mb-8 border border-blue-100 dark:border-blue-900/30">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3">Executive Analysis</h3>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm md:text-base">
                    {report.executiveSummary}
                </p>
                <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800/30">
                    <div className="text-xs font-bold text-slate-500 uppercase">Overall Quality Score</div>
                    <div className={`text-3xl font-black ${getScoreColor(report.overallScore)}`}>
                        {report.overallScore} <span className="text-sm font-normal text-slate-400">/ 100</span>
                    </div>
                </div>
            </div>

            {/* Detailed Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {visibleMetrics.map((metric, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-md transition-shadow relative group">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                {metric.category}
                                <div className="relative group/tooltip">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                                        {METRIC_FORMULAS[metric.category] || "AI-Evaluated"}
                                    </div>
                                </div>
                            </h4>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${getScoreColor(metric.score)} bg-slate-100 dark:bg-slate-800`}>
                                {metric.score} / 100
                            </span>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 h-20 overflow-y-auto">
                                {metric.reasoning}
                            </p>
                            
                            {metric.improvements.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Recommended Improvements</h5>
                                    <ul className="space-y-1 mb-4">
                                        {metric.improvements.map((imp, i) => (
                                            <li key={i} className="flex items-start text-xs text-slate-700 dark:text-slate-300">
                                                <svg className="w-3 h-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                {imp}
                                            </li>
                                        ))}
                                    </ul>
                                    {metric.score < 90 && (
                                        <button 
                                            onClick={() => handleGenerateImprovement(metric.category)}
                                            disabled={generatingImprovement === metric.category}
                                            className="w-full text-xs py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 rounded transition-colors flex items-center justify-center gap-2"
                                        >
                                            {generatingImprovement === metric.category ? (
                                                <>
                                                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Generate Fix Cases
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default QualityMetricsReport;
