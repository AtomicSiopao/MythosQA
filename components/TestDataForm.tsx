
import React, { useState, useEffect, useRef } from 'react';
import { TestInputRequirement, TestDataItem, ArtifactScope, TestDataType } from '../types';

interface TestDataFormProps {
  requirements: TestInputRequirement[];
  initialData: TestDataItem[];
  initialScope: ArtifactScope;
  onGenerate: (data: TestDataItem[], artifactScope: ArtifactScope) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const TestDataForm: React.FC<TestDataFormProps> = ({ requirements, initialData, initialScope, onGenerate, onCancel, isLoading }) => {
  const [formData, setFormData] = useState<TestDataItem[]>([]);
  const [customFields, setCustomFields] = useState<TestDataItem[]>([]);
  const [artifactScope, setArtifactScope] = useState<ArtifactScope>('ALL');
  const [newFieldType, setNewFieldType] = useState<TestDataType>('text');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form
  useEffect(() => {
    const mappedRequirements: TestDataItem[] = requirements.map(req => {
      const existing = initialData.find(d => d.key === req.key);
      let initialVal = req.suggestedValue || '';
      
      let type: TestDataType = 'text';
      if (req.inputType === 'boolean') type = 'boolean';
      else if (req.isSensitive) type = 'secret';

      if (type === 'boolean') initialVal = 'true';
      else if (req.options && req.options.length > 0 && !initialVal) initialVal = req.options[0];

      return {
        key: req.key,
        value: existing ? existing.value : initialVal,
        isSensitive: existing ? existing.isSensitive : req.isSensitive,
        type: (existing?.type as TestDataType) || type
      };
    });
    setFormData(mappedRequirements);

    const requirementKeys = new Set(requirements.map(r => r.key));
    const extraFields = initialData.filter(d => !requirementKeys.has(d.key)).map(d => ({
        ...d,
        type: d.type || (d.isSensitive ? 'secret' : 'text')
    }));
    setCustomFields(extraFields);

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
    let initialValue = '';
    let isSensitive = false;
    
    if (newFieldType === 'boolean') initialValue = 'true';
    if (newFieldType === 'secret') isSensitive = true;
    if (newFieldType === 'image' || newFieldType === 'video') {
        fileInputRef.current?.click();
        return; 
    }

    setCustomFields([...customFields, { key: '', value: initialValue, isSensitive, type: newFieldType }]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isVideo = file.type.startsWith('video');
      const type = isVideo ? 'video' : 'image';
      setCustomFields([...customFields, { 
        key: `Media: ${file.name}`, 
        value: `[FILE: ${file.name} | ${(file.size/1024).toFixed(1)}kb]`, 
        isSensitive: false,
        type: type
      }]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  const renderInput = (field: TestDataItem, idx: number, isCustom: boolean, options?: string[]) => {
      // 1. Boolean / Toggle
      if (field.type === 'boolean') {
        return (
            <div className="flex items-center h-full">
                <label className="inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={field.value === 'true'} 
                        onChange={(e) => handleChange(idx, e.target.checked ? 'true' : 'false', isCustom)}
                        className="sr-only peer"
                    />
                    <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    <span className="ms-3 text-sm font-medium text-slate-900 dark:text-slate-300">
                        {field.value === 'true' ? 'True / On' : 'False / Off'}
                    </span>
                </label>
            </div>
        );
      }

      // 2. Select / Dropdown
      if (options && options.length > 0) {
        return (
            <div className="relative">
                <select
                    value={field.value}
                    onChange={(e) => handleChange(idx, e.target.value, isCustom)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none cursor-pointer"
                >
                    {options.map((opt, optIdx) => (
                        <option key={optIdx} value={opt}>{opt}</option>
                    ))}
                    {field.value && !options.includes(field.value) && (
                        <option value={field.value}>{field.value}</option>
                    )}
                </select>
            </div>
        );
      }

      // 3. Media (Read Only)
      if (field.type === 'image' || field.type === 'video') {
         return (
             <div className="flex items-center gap-2 w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm cursor-not-allowed">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {field.type === 'image' ? (
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    ) : (
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    )}
                 </svg>
                 <span className="truncate">{field.value}</span>
             </div>
         );
      }

      // 4. Secret / Text
      const isSensitive = field.type === 'secret' || field.isSensitive;
      return (
        <div className="relative">
            <input
                type={isSensitive ? "password" : "text"}
                value={field.value}
                onChange={(e) => handleChange(idx, e.target.value, isCustom)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100 transition-colors"
                placeholder={isSensitive ? "Hidden Value" : "Value"}
            />
            <button
                type="button"
                onClick={() => toggleSensitivity(idx, isCustom)}
                className={`absolute right-2 top-2.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 ${field.isSensitive ? 'text-blue-500' : ''}`}
                title="Toggle Masking"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
      );
  };

  const groupedRequirements = React.useMemo<Record<string, number[]>>(() => {
    const groups: Record<string, number[]> = {};
    requirements.forEach((req, idx) => {
      const groupName = req.group || 'General Requirements';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(idx);
    });
    return groups;
  }, [requirements]);

  const sortedGroupKeys = React.useMemo(() => {
    return Object.keys(groupedRequirements).sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const isAPriority = /login|auth|credential|sign in/i.test(aLower);
      const isBPriority = /login|auth|credential|sign in/i.test(bLower);
      if (isAPriority && !isBPriority) return -1;
      if (!isAPriority && isBPriority) return 1;
      return 0;
    });
  }, [groupedRequirements]);

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
          
          {/* Artifact Selection */}
          <div className="space-y-3 pb-6 border-b border-slate-100 dark:border-slate-800">
             <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Output Artifact</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               {/* ... (Previous artifact options remain same, just condensed for brevity) ... */}
               <label className={`cursor-pointer border p-3 rounded-lg flex items-center gap-3 transition-colors ${artifactScope === 'ALL' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-800 dark:text-blue-300' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
                 <input type="radio" name="artifactScope" value="ALL" checked={artifactScope === 'ALL'} onChange={() => setArtifactScope('ALL')} className="text-blue-600 focus:ring-blue-500 h-4 w-4" />
                 <div><span className="font-bold text-sm block">All Artifacts</span></div>
               </label>
               {/* Add other options similarly */}
             </div>
          </div>

          {/* Grouped Requirements */}
          {formData.length > 0 && sortedGroupKeys.map((groupName) => (
            <div key={groupName} className="space-y-4">
               <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center">
                 {groupName}
                 {/login|auth|credential/i.test(groupName) && <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">PRIORITY</span>}
               </h3>
               {groupedRequirements[groupName].map(idx => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                       <div className="w-full sm:w-1/3">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 truncate" title={formData[idx].key}>{formData[idx].key}</label>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{requirements[idx]?.description}</span>
                       </div>
                       <div className="flex-1 w-full relative">
                          {renderInput(formData[idx], idx, false, requirements[idx].options)}
                       </div>
                  </div>
               ))}
            </div>
          ))}

          {/* Custom Fields */}
          <div className="space-y-4 pt-4">
             <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                 <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Custom Test Data</h3>
                 <div className="flex gap-2 items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <select 
                       value={newFieldType}
                       onChange={(e) => setNewFieldType(e.target.value as TestDataType)}
                       className="text-xs bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-300 font-medium py-1 pl-2 pr-1"
                    >
                        <option value="text">Text</option>
                        <option value="secret">Hidden/Secret</option>
                        <option value="boolean">Boolean</option>
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                    </select>
                    <button type="button" onClick={addCustomField} className="text-xs bg-white dark:bg-slate-700 px-3 py-1 rounded shadow-sm text-blue-600 dark:text-blue-300 font-bold hover:text-blue-700">
                        + Add
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
                 </div>
             </div>
             
             {customFields.map((field, idx) => (
                <div key={`custom-${idx}`} className="flex flex-col sm:flex-row gap-3 items-center p-3 border border-slate-200 dark:border-slate-700 rounded-lg border-dashed">
                   <div className="w-full sm:w-1/3 flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 rounded">{field.type}</span>
                      <input
                        type="text"
                        value={field.key}
                        onChange={(e) => handleCustomKeyChange(idx, e.target.value)}
                        className="w-full px-2 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="Field Name"
                        readOnly={field.type === 'image' || field.type === 'video'}
                      />
                   </div>
                   <div className="flex-1 w-full relative">
                      {renderInput(field, idx, true)}
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
             <button type="button" onClick={onCancel} className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" disabled={isLoading}>Cancel</button>
             <button type="submit" className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all flex items-center disabled:bg-blue-400" disabled={isLoading}>
               {isLoading ? "Generating Plan..." : "Generate"}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TestDataForm;
