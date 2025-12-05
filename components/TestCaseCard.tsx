
import React, { useState } from 'react';
import { TestCase, TestPriority, TestType, TestDataItem } from '../types';

interface TestCaseCardProps {
  testCase: TestCase;
}

const getPartiallyMaskedValue = (key: string, value: string) => {
  if (!value) return '';
  const lowerKey = key.toLowerCase();
  
  // Strict masking for passwords
  if (lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey.includes('token')) {
    return '••••••••'; 
  }
  
  // Partial masking for Credit Cards (Show last 4)
  if (lowerKey.includes('card') || lowerKey.includes('cc')) {
    return `•••• ${value.slice(-4)}`;
  }

  // General partial masking for others (Show first 1, last 2)
  if (value.length > 5) {
    return `${value.slice(0, 1)}••••${value.slice(-2)}`;
  }

  return '••••••';
};

const TestDataRow: React.FC<{ item: TestDataItem }> = ({ item }) => {
  const [isVisible, setIsVisible] = useState(!item.isSensitive);

  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0 text-sm group">
      <span className="font-medium text-slate-600 dark:text-slate-300 w-1/3 truncate pr-2" title={item.key}>{item.key}</span>
      <div className="flex items-center w-2/3 justify-between bg-slate-50 dark:bg-slate-800 rounded px-2 py-1">
        <span className={`font-mono text-slate-800 dark:text-slate-200 break-all ${!isVisible ? 'tracking-widest' : ''}`}>
          {isVisible ? item.value : getPartiallyMaskedValue(item.key, item.value)}
        </span>
        
        {item.isSensitive && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsVisible(!isVisible);
            }}
            className="ml-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none transition-colors p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
            title={isVisible ? "Hide sensitive data" : "Show sensitive data"}
            aria-label={isVisible ? "Hide sensitive data" : "Show sensitive data"}
          >
            {isVisible ? (
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
               </svg>
            ) : (
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
               </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

const TestCaseCard: React.FC<TestCaseCardProps> = ({ testCase }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPriorityColor = (p: TestPriority) => {
    switch (p) {
      case TestPriority.CRITICAL: return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
      case TestPriority.HIGH: return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
      case TestPriority.MEDIUM: return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
      case TestPriority.LOW: return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getTypeColor = (t: TestType) => {
    switch (t) {
      case TestType.SECURITY: return 'text-purple-600 bg-purple-50 dark:text-purple-300 dark:bg-purple-900/20';
      case TestType.EDGE_CASE: return 'text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/20';
      case TestType.PERFORMANCE: return 'text-pink-600 bg-pink-50 dark:text-pink-300 dark:bg-pink-900/20';
      default: return 'text-slate-600 bg-slate-50 dark:text-slate-300 dark:bg-slate-800';
    }
  };

  const maskSensitiveText = (text: string) => {
    if (!testCase.testData) return text;
    let masked = text;
    testCase.testData.forEach(item => {
      if (item.isSensitive && item.value && item.value.length > 0) {
        // Only mask if the value is reasonably specific to avoid accidental masking of common words
        if (item.value.length >= 3) {
          const replacement = getPartiallyMaskedValue(item.key, item.value);
          masked = masked.split(item.value).join(replacement);
        }
      }
    });
    return masked;
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-3 overflow-hidden bg-white dark:bg-slate-900 hover:shadow-sm transition-shadow">
      <div 
        className="p-4 cursor-pointer flex items-start justify-between bg-white dark:bg-slate-900"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-xs text-slate-400 dark:text-slate-500 font-medium">{testCase.id}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getPriorityColor(testCase.priority)}`}>
              {testCase.priority}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(testCase.type)}`}>
              {testCase.type}
            </span>
          </div>
          <h4 className="text-slate-900 dark:text-slate-100 font-medium leading-snug">{testCase.title}</h4>
        </div>
        <div className="ml-4 text-slate-400">
           <svg 
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="mt-3">
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{testCase.description}</p>
            
            {testCase.preconditions && (
              <div className="mb-3 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Preconditions:</span>
                <span className="text-slate-600 dark:text-slate-400 ml-2">{testCase.preconditions}</span>
              </div>
            )}

            {testCase.testData && testCase.testData.length > 0 && (
              <div className="mb-4">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Test Data</span>
                <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 px-3">
                  {testCase.testData.map((item, idx) => (
                    <TestDataRow key={idx} item={item} />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 mt-4">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">STEPS</span>
              <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-400 w-12">#</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-400 w-1/2">Action</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-400 w-1/2">Expected Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {testCase.steps.map((step, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="px-3 py-2 text-slate-400 dark:text-slate-500 font-mono text-xs">{idx + 1}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{maskSensitiveText(step.action)}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{step.expected}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestCaseCard;
