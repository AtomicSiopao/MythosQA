
import React, { useState, useEffect } from 'react';
import { SavedSession, ScriptFramework, GeneratedScript } from '../types';
import { generateAutomationScript } from '../services/geminiService';

interface ScriptGeneratorProps {
  sessions: SavedSession[];
  onSaveScript: (sessionId: string, script: GeneratedScript) => void;
}

const ScriptGenerator: React.FC<ScriptGeneratorProps> = ({ sessions, onSaveScript }) => {
  // Selection State
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedFramework, setSelectedFramework] = useState<ScriptFramework>('Cypress');
  const [selectedSuites, setSelectedSuites] = useState<string[]>([]);
  
  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [lastGeneratedScriptId, setLastGeneratedScriptId] = useState<string | null>(null);

  // Computed
  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const availableSuites = selectedSession?.plan?.suites.map(s => s.suiteName) || [];

  useEffect(() => {
    // Reset suite selection when session changes
    setSelectedSuites([]);
    setGeneratedCode('');
    setLastGeneratedScriptId(null);
  }, [selectedSessionId]);

  const handleSuiteToggle = (suiteName: string) => {
    if (selectedSuites.includes(suiteName)) {
      setSelectedSuites(selectedSuites.filter(s => s !== suiteName));
    } else {
      setSelectedSuites([...selectedSuites, suiteName]);
    }
  };

  const handleGenerate = async () => {
    if (!selectedSession || !selectedSession.plan) return;

    setIsGenerating(true);
    setGeneratedCode('');

    try {
      const code = await generateAutomationScript(selectedFramework, selectedSession.plan, selectedSuites.length > 0 ? selectedSuites : undefined);
      setGeneratedCode(code);
      
      const newScript: GeneratedScript = {
        id: Date.now().toString(),
        name: `${selectedFramework} - ${selectedSuites.length > 0 ? selectedSuites.length + ' Suites' : 'Full Plan'}`,
        framework: selectedFramework,
        code: code,
        createdAt: Date.now(),
        targetSuiteNames: selectedSuites.length > 0 ? selectedSuites : undefined
      };

      onSaveScript(selectedSession.id, newScript);
      setLastGeneratedScriptId(newScript.id);

    } catch (error) {
      console.error("Script generation failed", error);
      alert("Failed to generate script. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    alert("Copied to clipboard!");
  };

  const handleLoadScript = (script: GeneratedScript) => {
    setGeneratedCode(script.code);
    setLastGeneratedScriptId(script.id);
    setSelectedFramework(script.framework);
    // Try to restore suite selection if possible, or just leave empty implying what was loaded
    if (script.targetSuiteNames) setSelectedSuites(script.targetSuiteNames);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden animate-fade-in">
      <div className="flex-shrink-0 p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <h1 className="text-2xl font-bold mb-2">Generate Test Script</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Create automation scripts for Cypress, Playwright, or Selenium from your saved sessions.</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Configuration */}
        <div className="w-full md:w-1/3 p-6 border-r border-slate-200 dark:border-slate-800 overflow-y-auto bg-slate-50 dark:bg-slate-950">
          
          {/* Session Selector */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Select Source Plan</label>
            <select 
              value={selectedSessionId} 
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">-- Choose a Saved Session --</option>
              {sessions.filter(s => s.plan).map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.plan?.suites.length} Suites)</option>
              ))}
            </select>
          </div>

          {selectedSession && (
            <>
              {/* Framework Selector */}
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Target Framework</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Cypress', 'Playwright', 'Selenium'] as ScriptFramework[]).map(fw => (
                    <button
                      key={fw}
                      onClick={() => setSelectedFramework(fw)}
                      className={`px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
                        selectedFramework === fw 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {fw}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scope Selector */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Scope</label>
                    <button 
                        onClick={() => setSelectedSuites([])} 
                        className="text-[10px] text-blue-500 hover:underline"
                    >
                        Reset (Full Plan)
                    </button>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden max-h-48 overflow-y-auto">
                    {availableSuites.map((suite) => (
                        <label key={suite} className="flex items-center px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0">
                            <input 
                                type="checkbox" 
                                checked={selectedSuites.includes(suite)}
                                onChange={() => handleSuiteToggle(suite)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-xs text-slate-700 dark:text-slate-300 truncate">{suite}</span>
                        </label>
                    ))}
                    {availableSuites.length === 0 && <div className="p-3 text-xs text-slate-400 italic">No suites found in plan.</div>}
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                    {selectedSuites.length === 0 ? "Generating script for the Entire Test Plan." : `Generating script for ${selectedSuites.length} selected suites.`}
                </p>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                    <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Writing Script...
                    </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        Generate Script
                    </>
                )}
              </button>

              {/* History */}
              {selectedSession.generatedScripts && selectedSession.generatedScripts.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                      <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-3">Saved Scripts</h4>
                      <div className="space-y-2">
                          {[...selectedSession.generatedScripts].reverse().map(script => (
                              <div 
                                key={script.id} 
                                onClick={() => handleLoadScript(script)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                    lastGeneratedScriptId === script.id 
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                                }`}
                              >
                                  <div className="flex justify-between items-center mb-1">
                                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{script.framework}</span>
                                      <span className="text-[10px] text-slate-400">{new Date(script.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                      {script.name}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
            </>
          )}
        </div>

        {/* Right Panel: Code View */}
        <div className="flex-1 bg-slate-900 overflow-hidden flex flex-col relative">
           {generatedCode ? (
             <>
                <div className="absolute top-4 right-4 z-10">
                    <button 
                        onClick={handleCopy}
                        className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-1.5 rounded-md shadow-sm border border-slate-600 transition-colors flex items-center gap-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-6">
                    <pre className="font-mono text-sm text-green-400 leading-relaxed whitespace-pre-wrap">
                        {generatedCode}
                    </pre>
                </div>
             </>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                 <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                 </div>
                 <h3 className="text-lg font-medium text-slate-400">Ready to Generate</h3>
                 <p className="max-w-xs mt-2 text-sm opacity-70">Select a saved session and framework from the left panel to create your test automation script.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default ScriptGenerator;
