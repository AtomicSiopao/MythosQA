
export enum TestPriority {
  CRITICAL = 'Critical',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export enum TestType {
  FUNCTIONAL = 'Functional',
  UI_UX = 'UI/UX',
  SECURITY = 'Security',
  PERFORMANCE = 'Performance',
  ACCESSIBILITY = 'Accessibility',
  EDGE_CASE = 'Edge Case',
  SEO = 'SEO'
}

export type ArtifactScope = 
  | 'PLAN_ONLY' 
  | 'SUITES_CASES' 
  | 'PLAN_SUITES_CASES' 
  | 'PLAN_SUITES_CHECKLIST' 
  | 'CHECKLIST_ONLY'
  | 'ALL';

export interface TestStep {
  stepNumber: number;
  action: string;
  expected: string;
}

export type TestDataType = 'text' | 'secret' | 'boolean' | 'image' | 'video';

export interface TestDataItem {
  key: string;
  value: string;
  isSensitive: boolean;
  type?: TestDataType;
}

export interface TestInputRequirement {
  group?: string;
  key: string;
  description: string;
  suggestedValue?: string;
  isSensitive: boolean;
  options?: string[];
  inputType?: 'text' | 'select' | 'boolean';
}

export interface TestRequirementsAnalysis {
  websiteUrl: string;
  requirements: TestInputRequirement[];
}

export interface TestCase {
  id: string;
  title: string;
  description: string;
  preconditions?: string;
  type: TestType;
  scenarioType?: 'Positive' | 'Negative' | 'Boundary';
  priority: TestPriority;
  testData?: TestDataItem[];
  steps: TestStep[];
  isNew?: boolean; // Highlight newly added cases
}

export interface TestSuite {
  suiteName: string;
  description: string;
  cases: TestCase[];
  testDataObservations?: string;
}

export interface ChecklistItem {
  id: string;
  description: string;
  type: TestType;
  priority: TestPriority;
  isChecked?: boolean;
  isNew?: boolean; // Highlight newly added items
  category?: string; // Grouping category (e.g., "Login", "SEO", "Checkout")
}

export interface GenerationConfig {
  targetFeatures?: string[]; 
  includedTypes: TestType[];
  includeSEO?: boolean;
}

export interface TestPlan {
  websiteUrl: string;
  summary: string;
  testStrategy?: string;
  scope?: string;
  risks?: string;
  tools?: string;
  suites: TestSuite[];
  checklist?: ChecklistItem[]; 
  groundingSources?: { uri: string; title: string }[];
  authAnalysis?: {
    used: boolean;
    message: string;
  };
}

export interface GenerateOptions {
  url: string;
}

export interface ExportOptions {
  includePlan: boolean;
  includeSuites: boolean;
  includeChecklist: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: number;
  role: 'USER' | 'ADMIN';
}

export type ScriptFramework = 'Cypress' | 'Playwright' | 'Selenium';

export interface GeneratedScript {
  id: string;
  name: string;
  framework: ScriptFramework;
  code: string;
  createdAt: number;
  targetSuiteNames?: string[]; 
}

// --- SQM Types ---
export interface QualityMetric {
  category: string; // e.g., Reliability, Usability
  score: number; // 0-100
  reasoning: string;
  improvements: string[];
}

export interface QualityReport {
  overallScore: number;
  timestamp: number;
  executiveSummary: string;
  metrics: QualityMetric[];
}

export interface SavedSession {
  id: string;
  userId: string;
  name: string;
  timestamp: number;
  url: string;
  plan: TestPlan | null;
  testData: TestDataItem[];
  requirements: TestRequirementsAnalysis | null;
  artifactScope: ArtifactScope;
  generationConfig?: GenerationConfig;
  generatedScripts?: GeneratedScript[];
  qualityReport?: QualityReport; // Persist the SQM report
}

export interface SystemError {
  id: string;
  timestamp: number;
  code: string;
  message: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  region: string;
  userAffected?: string;
  userEmail?: string;
}
