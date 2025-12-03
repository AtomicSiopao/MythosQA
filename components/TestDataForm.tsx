
import React, { useState, useEffect, useRef } from 'react';
import { TestInputRequirement, TestDataItem, ArtifactScope } from '../types';

interface TestDataFormProps {
  requirements: TestInputRequirement[];
  initialData: TestDataItem[];
  initialScope: ArtifactScope;
  onGenerate: (data: TestDataItem[], artifactScope: ArtifactScope) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const TestDataForm: React.FC<TestDataFormProps> = ({ requirements, initialData, initialScope, onGenerate, onCancel, isLoading }) => {
  // We store form data mapped by original index to handle updates easily, 
  // but we render them grouped.
  const [formData, setFormData] = useState<TestDataItem[]>([]);
  const [customFields, setCustomFields] = useState<TestDataItem[]>([]);
  const [artifactScope, setArtifactScope] = useState<ArtifactScope>('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form with requirements, merging with initialData if present
  useEffect(() => {
    // 1. Map requirements to form fields.
    const mappedRequirements: TestDataItem[] = requirements.map(req => {
      const existing = initialData.find(d => d.key === req.key);
      
      let initialVal = req.suggestedValue || '';
      // Logic for defaults
      if (req.inputType === 'boolean') {
        initialVal = 'true';
      } else if (req.options && req.options.length > 0 && !initialVal) {
        initialVal = req.options[0];
      }

      return {
        key: req.key,
        value: existing ? existing.value : initialVal,
        isSensitive: existing ? existing.isSensitive : req.isSensitive
      };
    });
    setFormData(mappedRequirements);

    // 2. Identify fields in initialData that are NOT part of the new requirements (i.e., Custom Fields)
    const requirementKeys = new Set(requirements.map(r => r.key));
    const extraFields = initialData.filter(d => !requirementKeys.has(d.key));
    setCustomFields(extraFields);

    // 3. Set Scope
    setArtifactScope(initialScope);

  }, [requirements, initialData, initialScope]);

  const handleChange = (index: number, value: string, isCustom: boolean = false) => {
    if (isCustom) {
      const updated = [...customFields];
      updated[index].value = value;
      setCustomFields(updated);
    } else {
      const updated = [...formData];
      updated[index].value = value;
      setFormData(updated);
    }
  };

  const toggleSensitivity = (index: number, isCustom: boolean = false) => {
    if (isCustom) {
       const updated = [...customFields];
       updated[index].isSensitive = !updated[index].isSensitive;
       setCustomFields(updated);
    } else {
       const updated = [...formData];
       updated[index].isSensitive = !updated[index].isSensitive;
       setFormData(updated);
    }
  };

  const addCustomField = () => {
    // New custom fields default to sensitive (masked) for privacy
    setCustomFields([...customFields, { key: '', value: '', isSensitive: true }]);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleCustomKeyChange = (index: number, key: string) => {
    const updated = [...customFields];
    updated[index].key = key;
    setCustomFields(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate([...formData, ...customFields], artifactScope);
  };

  // Handle File Input
  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Add as a custom field with a generic value indicator
      // In a real app with backend, we would upload this. 
      // Here we store the reference name so Gemini knows a file is available.
      setCustomFields([...customFields, { 
        key: `Media: ${file.name}`, 
        value: `[FILE_UPLOADED type=${file.type} size=${(file.size/1024).toFixed(1)}kb]`, 
        isSensitive: false 
      }]);
    }
    // Reset inputs
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Group requirements by 'group' field
  const groupedRequirements = React.useMemo<Record<string, number[]>>(() => {
    const groups: Record<string, number[]> = {};
    requirements.forEach((req, idx) => {
      const groupName = req.group || 'General Requirements';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(idx);
    });
    return groups;
  }, [requirements]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
        <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center transition-colors duration-300">
          <div>
             <h2 className="text-xl font-bold text-slate-800 dark:text-white">Configure Test Data</h2>
             <p className="text-sm text-slate-500 dark:text-slate-400">Provide data for more accurate test generation.</p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
             </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          
          {/* 1. Artifact Selection (MOVED TO TOP) */}
          <div className="space-y-3 pb-6 border-b border-slate-100 dark:border-slate-800">
             <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Output Artifact</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               <label className={`cursor-pointer border p-3 rounded-lg flex items-center gap-3 transition-colors ${artifactScope === 'ALL' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-800 dark:text-blue-300' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
                 <input 
                    type="radio" 
                    name="artifactScope" 
                    value="ALL"
                    checked={artifactScope === 'ALL'}
                    onChange={() => setArtifactScope('ALL')}
                    className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                 />
                 <div>
                   <span className="font-bold text-sm block">All Artifacts</span>
                   <span className="text-xs text-slate-500 dark:text-slate-400 block">Complete Plan + Suites + Cases</span>
                 </div>
               </label>

               <label className={`cursor-pointer border p-3 rounded-lg flex items-center gap-3 transition-colors ${artifactScope === 'TEST_PLAN' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-800 dark:text-blue-300' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
                 <input 
                    type="radio" 
                    name="artifactScope" 
                    value="TEST_PLAN"
                    checked={artifactScope === 'TEST_PLAN'}
                    onChange={() => setArtifactScope('TEST_PLAN')}
                    className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                 />
                 <div>
                   <span className="font-bold text-sm block">Test Plan</span>
                   <span className="text-xs text-slate-500 dark:text-slate-400 block">Strategy & High-level Scope</span>
                 </div>
               </label>

               <label className={`cursor-pointer border p-3 rounded-lg flex items-center gap-3 transition-colors ${artifactScope === 'SUITES_AND_CASES' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-800 dark:text-blue-300' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
                 <input 
                    type="radio" 
                    name="artifactScope" 
                    value="SUITES_AND_CASES"
                    checked={artifactScope === 'SUITES_AND_CASES'}
                    onChange={() => setArtifactScope('SUITES_AND_CASES')}
                    className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                 />
                 <div>
                   <span className="font-bold text-sm block">Suites + Cases</span>
                   <span className="text-xs text-slate-500 dark:text-slate-400 block">Technical Execution Details</span>
                 </div>
               </label>

               <label className={`cursor-pointer border p-3 rounded-lg flex items-center gap-3 transition-colors ${artifactScope === 'CASES_ONLY' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-800 dark:text-blue-300' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
                 <input 
                    type="radio" 
                    name="artifactScope" 
                    value="CASES_ONLY"
                    checked={artifactScope === 'CASES_ONLY'}
                    onChange={() => setArtifactScope('CASES_ONLY')}
                    className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                 />
                 <div>
                   <span className="font-bold text-sm block">Test Cases Only</span>
                   <span className="text-xs text-slate-500 dark:text-slate-400 block">List of Steps</span>
                 </div>
               </label>
             </div>
          </div>

          {/* 2. Detected Requirements Grouped */}
          {formData.length > 0 && Object.entries(groupedRequirements).map(([groupName, indices]) => (
            <div key={groupName} className="space-y-4">
               <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                 {groupName}
               </h3>
               {(indices as number[]).map(idx => {
                  const field = formData[idx];
                  const req = requirements[idx];
                  const isBoolean = req.inputType === 'boolean';
                  const isSelect = req.options && req.options.length > 0;

                  return (
                    <div key={idx} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                       <div className="w-full sm:w-1/3">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 truncate" title={field.key}>{field.key}</label>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{requirements[idx]?.description}</span>
                       </div>
                       <div className="flex-1 w-full relative">
                          {isBoolean ? (
                            <div className="flex items-center">
                                <label className="inline-flex items-center cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={field.value === 'true'} 
                                      onChange={(e) => handleChange(idx, e.target.checked ? 'true' : 'false')}
                                      className="sr-only peer"
                                    />
                                    <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                    <span className="ms-3 text-sm font-medium text-slate-900 dark:text-slate-300">
                                      {field.value === 'true' ? 'Enabled' : 'Disabled'}
                                    </span>
                                </label>
                            </div>
                          ) : isSelect ? (
                            <div className="relative">
                                <select
                                  value={field.value}
                                  onChange={(e) => handleChange(idx, e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none cursor-pointer"
                                >
                                   {req.options?.map((opt, optIdx) => (
                                     <option key={optIdx} value={opt}>{opt}</option>
                                   ))}
                                   {/* If current value is not in options (e.g. custom from previous session), add it */}
                                   {field.value && !req.options?.includes(field.value) && (
                                     <option value={field.value}>{field.value}</option>
                                   )}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700 dark:text-slate-400">
                                   <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                            </div>
                          ) : (
                            // Standard Text Input
                            <div className="relative">
                                <input
                                    type={field.isSensitive ? "password" : "text"}
                                    value={field.value}
                                    onChange={(e) => handleChange(idx, e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100 transition-colors"
                                    placeholder={field.isSensitive ? "Hidden Value" : "Value"}
                                />
                                <button
                                    type="button"
                                    onClick={() => toggleSensitivity(idx)}
                                    className={`absolute right-2 top-2.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 ${field.isSensitive ? 'text-blue-500' : ''}`}
                                    title="Toggle Masking"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                          )}
                       </div>
                    </div>
                  );
               })}
            </div>
          ))}

          {/* 3. Custom Fields */}
          <div className="space-y-4 pt-4">
             <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                 <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Custom Test Data</h3>
                 <div className="flex gap-2">
                    <button type="button" onClick={handleFileClick} className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                        Add Media
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*,video/*" 
                      onChange={handleFileChange}
                    />
                    <button type="button" onClick={addCustomField} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Add Field
                    </button>
                 </div>
             </div>
             
             {customFields.map((field, idx) => (
                <div key={`custom-${idx}`} className="flex flex-col sm:flex-row gap-3 items-center p-3 border border-slate-200 dark:border-slate-700 rounded-lg border-dashed">
                   <div className="w-full sm:w-1/3">
                      <input
                        type="text"
                        value={field.key}
                        onChange={(e) => handleCustomKeyChange(idx, e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="Field Name"
                        readOnly={field.key.startsWith("Media:")} // Prevent editing media keys manually
                      />
                   </div>
                   <div className="flex-1 w-full relative">
                      <input
                        type={field.isSensitive ? "password" : "text"}
                        value={field.value}
                        onChange={(e) => handleChange(idx, e.target.value, true)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors"
                        placeholder={field.isSensitive ? "Hidden Value" : "Value"}
                        readOnly={field.key.startsWith("Media:")} // Prevent editing media values
                      />
                      {!field.key.startsWith("Media:") && (
                        <button
                          type="button"
                          onClick={() => toggleSensitivity(idx, true)}
                          className={`absolute right-2 top-2.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 ${field.isSensitive ? 'text-blue-500' : ''}`}
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                             <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                           </svg>
                        </button>
                      )}
                   </div>
                   <button type="button" onClick={() => removeCustomField(idx)} className="text-red-400 hover:text-red-600 p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                   </button>
                </div>
             ))}
             {customFields.length === 0 && (
                <div className="text-center py-4 text-slate-400 dark:text-slate-500 text-sm bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                   No custom fields added
                </div>
             )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
             <button
               type="button"
               onClick={onCancel}
               className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
               disabled={isLoading}
             >
               Cancel
             </button>
             <button
               type="submit"
               className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all flex items-center disabled:bg-blue-400"
               disabled={isLoading}
             >
               {isLoading ? (
                  <>
                     <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     Generating Plan...
                  </>
               ) : "Generate"}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TestDataForm;
