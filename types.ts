
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
  EDGE_CASE = 'Edge Case'
}

export type ArtifactScope = 'ALL' | 'TEST_PLAN' | 'SUITES_AND_CASES' | 'CASES_ONLY';

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
}

export interface TestSuite {
  suiteName: string;
  description: string;
  cases: TestCase[];
  testDataObservations?: string;
}

export interface TestPlan {
  websiteUrl: string;
  summary: string;
  testStrategy?: string;
  scope?: string;
  risks?: string;
  tools?: string;
  suites: TestSuite[];
  groundingSources?: { uri: string; title: string }[];
  authAnalysis?: {
    used: boolean;
    message: string;
  };
}

export interface GenerateOptions {
  url: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: number;
}

export type ScriptFramework = 'Cypress' | 'Playwright' | 'Selenium';

export interface GeneratedScript {
  id: string;
  name: string;
  framework: ScriptFramework;
  code: string;
  createdAt: number;
  targetSuiteNames?: string[]; // If specific suites were selected, otherwise implies full plan
}

export interface SavedSession {
  id: string;
  userId: string; // Owner of the session
  name: string;
  timestamp: number;
  url: string;
  plan: TestPlan | null;
  testData: TestDataItem[];
  requirements: TestRequirementsAnalysis | null;
  artifactScope: ArtifactScope;
  generatedScripts?: GeneratedScript[];
}
