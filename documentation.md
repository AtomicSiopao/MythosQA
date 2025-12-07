# Mythos QA - Application Documentation

## 1. Overview
**Mythos QA** is an intelligent, AI-powered test artifact creation tool designed to streamline the Quality Assurance process. By simply providing a website URL, Mythos QA analyzes the target application and generates comprehensive Test Plans, Test Suites, Test Cases, and Automation Scripts using Google's advanced Gemini models.

## 2. Key Features

### Core Functionality
- **URL Analysis**: Automatically detects application features, required data inputs, and functionality from a URL.
- **Intelligent Generation**: Uses `gemini-3-pro-preview` with thinking capabilities to generate deep, logical test scenarios (Positive, Negative, Boundary, Accessibility, UI/UX).
- **Test Data Management**: 
  - Auto-detection of required fields (e.g., Username, Password).
  - Support for various data types: Text, Secret (masked), Boolean, Image, Video.
  - Secure handling of sensitive data with masking in the UI.
- **Artifact Management**: 
  - Dashboard views for **Test Plans**, **Test Suites**, and **Test Cases**.
  - Search and filter artifacts across multiple sessions.
- **Session Management**: 
  - Auto-saving of progress.
  - User authentication simulation (Login/Register).
  - Grouping of sessions by domain.

### Automation & Export
- **Script Generation**: Automatically generates runnable test scripts for:
  - **Cypress**
  - **Playwright**
  - **Selenium**
- **Export Options**:
  - **PDF**: Full specification document with strategy, scope, and detailed step tables.
  - **CSV**: Structured data for import into other Test Management tools.

## 3. User Guide

### 3.1 Getting Started
1. **Authentication**: Create an account or sign in (Local simulation).
2. **Dashboard**: The main view allows you to start a new analysis or resume previous sessions from the sidebar.

### 3.2 Generating a Test Plan
1. **Input URL**: Enter the target website URL in the Generator view.
2. **Optional Credentials**: If testing a secured app, provide a Username/Password in the "Add Login Credentials" toggle.
3. **Analysis**: Click "Check URL". The app uses `gemini-2.5-flash` to analyze the site structure.
4. **Configuration**: 
   - Review detected requirements.
   - Add custom test data (e.g., edge case strings, specific files).
   - Select **Artifact Scope** (All, Test Plan Only, Suites & Cases, Cases Only).
5. **Generation**: Click "Generate". The app uses `gemini-3-pro-preview` to build the plan.

### 3.3 Managing Results
- **Test Plan View**: View the Executive Summary, Strategy, and Charts.
- **Suites & Cases**: 
  - Expand suites to see test cases.
  - **Edit**: Click on titles, descriptions, or steps to edit them inline.
  - **Regenerate Case**: Select a specific case to rewrite it with new test data.
  - **Add Cases**: Generate additional cases (Positive, Negative, etc.) for a specific suite.

### 3.4 Script Generation
1. Navigate to the **"Generate Test Script"** view via the Sidebar.
2. Select a **Source Plan** (Saved Session).
3. Choose a **Framework** (Cypress, Playwright, Selenium).
4. Select **Scope** (Full Plan or specific Suites).
5. Click **Generate Script** to get code ready for copy-pasting.

## 4. Technical Architecture

### 4.1 Tech Stack
- **Frontend**: React (v19), TypeScript.
- **Styling**: Tailwind CSS (Dark Mode supported).
- **AI Integration**: Google GenAI SDK (`@google/genai`).
- **Visualization**: Recharts for coverage charts.
- **Export**: `jspdf` (PDF), `file-saver` (CSV/File handling).

### 4.2 Key Components
- **`App.tsx`**: Main controller handling routing, state management, and session persistence.
- **`geminiService.ts`**: The core AI logic layer.
  - `analyzeRequirements`: Uses Flash model to parse HTML/Context.
  - `generateTestPlan`: Uses Pro model with `thinkingBudget` for complex logic.
  - `generateAutomationScript`: Context-aware code generation.
- **`TestPlanDisplay.tsx`**: The main presentation layer for generated artifacts, handling editing and interaction.
- **`ArtifactManager.tsx`**: A dashboard component for viewing flattened lists of Plans, Suites, and Cases.

### 4.3 Data Model
- **`TestPlan`**: Root object containing Strategy, Scope, Risks, and an array of `TestSuites`.
- **`TestSuite`**: Logical grouping of `TestCases`.
- **`TestCase`**: Detailed object with Steps (`action`, `expected`), `testData`, `priority`, and `type`.
- **`SavedSession`**: Persisted state object stored in `localStorage` containing the Plan, Configuration, and Generated Scripts.

## 5. Security & Privacy
- **API Keys**: Requires `process.env.API_KEY` for Google Gemini.
- **Data Masking**: Sensitive fields (marked `isSensitive`) are masked in the UI (e.g., `P••••rd`) and in exports where applicable.
- **Local Storage**: All user data and sessions are stored locally in the browser's `localStorage`. No external database is used.
