import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  phase: 'ANALYZING' | 'GENERATING';
}

const analysisSteps = [
  "Connecting to Gemini...",
  "Browsing website context...",
  "Identifying key features...",
  "Detecting required data fields..."
];

const generationSteps = [
  "Applying test data configurations...",
  "Thinking about edge cases (Gemini 3 Pro)...",
  "Designing functional test suites...",
  "Creating security vectors...",
  "Finalizing test plan..."
];

const LoadingScreen: React.FC<LoadingScreenProps> = ({ phase }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = phase === 'ANALYZING' ? analysisSteps : generationSteps;

  useEffect(() => {
    setCurrentStep(0);
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [phase, steps.length]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in">
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
        <div className="absolute inset-4 bg-white dark:bg-slate-800 rounded-full shadow-lg flex items-center justify-center">
            {phase === 'ANALYZING' ? (
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            )}
        </div>
      </div>
      
      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
        {phase === 'ANALYZING' ? 'Analyzing URL' : 'Generating Plan'}
      </h2>
      <div className="h-6 overflow-hidden relative w-full max-w-md text-center">
         <p className="text-slate-500 dark:text-slate-400 animate-pulse transition-all duration-500 key-{currentStep}">
           {steps[currentStep]}
         </p>
      </div>
      
      <div className="mt-8 flex gap-2">
         {[0, 1, 2].map((i) => (
             <div key={i} className={`w-2 h-2 rounded-full animate-bounce ${phase === 'ANALYZING' ? 'bg-blue-400' : 'bg-purple-400'}`} style={{ animationDelay: `${i * 150}ms`}}></div>
         ))}
      </div>
    </div>
  );
};

export default LoadingScreen;