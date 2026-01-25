
import { GoogleGenAI } from "@google/genai";
import { TestPlan, TestSuite, TestCase, TestType, TestPriority, TestRequirementsAnalysis, TestDataItem, ArtifactScope, ScriptFramework, GenerationConfig, ChecklistItem, QualityReport } from "../types";

// Helper to extract JSON from Markdown code blocks
const extractJson = (text: string): any => {
  try {
    // Attempt to find JSON inside ```json ... ``` or just ``` ... ```
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      return JSON.parse(match[1]);
    }
    // If no code blocks, try parsing the whole text or finding the first { and last }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    }
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse JSON response:", error);
    throw new Error("The AI response could not be parsed as valid JSON.");
  }
};

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeRequirements = async (url: string, knownKeys?: string[]): Promise<TestRequirementsAnalysis> => {
  const ai = getAiClient();
  
  const knownKeysPrompt = knownKeys && knownKeys.length > 0 
    ? `The user has already provided values for field: ${JSON.stringify(knownKeys)}. If you identify these as requirements (e.g. Username or Password), please use EXACTLY these key names in your output so they can be auto-filled.`
    : '';

  const prompt = `
    You are a Senior QA Lead.
    
    Target Website: ${url}
    
    Task:
    1. Analyze the likely functionality of this website (e.g. Login, Search, Checkout, Contact Form).
    2. **CROSS-SITE CONTEXT**: If this website appears to be a landing page that connects to a separate application (e.g., vcam.ai -> dashboard.vcam.ai) or redirects to an auth provider, include requirements for those connected systems as well.
    3. Identify the specific dynamic data inputs that a tester would need to perform comprehensive testing across the entire user journey.
    4. **TEXTBOX & INPUT DETECTION**: You MUST identify ALL visible textboxes, textareas, search inputs, and form fields on the page (e.g. Search Bar, Comment Box, Quantity Input, Filter fields). Add them as requirements.
    5. Return a list of these requirements. 
    6. **SENSITIVITY**: Mark "isSensitive": true ONLY if the field is a Password or Credit Card Number/CVV. Do NOT mark Emails, Usernames, API Keys, or PII as sensitive unless they are explicitly passwords or financial data.
    7. **GROUPING**: Group these requirements logically by the page or feature they belong to (e.g., "Login", "Registration", "Checkout", "Profile").
    8. **INPUT TYPES**:
       - If a field usually has multiple standard options (e.g. "Role" -> Admin, User), provide an "options" array.
       - **SOCIAL LOGIN**: If you identify a "Social Login Provider" field (or similar), YOU MUST ALWAYS include "Email (use provided credentials)" as the first option in the "options" array, followed by others like Google, Facebook, etc.
       - If a field is a simple interaction like a checkbox, toggle, or button click (e.g. "Accept Terms", "Click Submit"), set "inputType": "boolean".
    
    ${knownKeysPrompt}

    Output Format:
    Strict JSON object matching this interface:
    {
      "websiteUrl": "${url}",
      "requirements": [
        { 
          "group": "Page/Feature Name (e.g. Login)",
          "key": "Field Name (e.g. 'Username/Email' or 'Social Login')", 
          "description": "Short explanation of usage", 
          "suggestedValue": "Optional example value",
          "isSensitive": boolean,
          "options": ["Email (use provided credentials)", "Google", "Facebook"], // Example
          "inputType": "text" | "select" | "boolean" // Optional
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Flash is sufficient and fast for this analysis
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // Grounding to know what the site actually is
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from analysis.");
    return extractJson(text);
  } catch (error) {
    console.error("Error analyzing requirements:", error);
    // Fallback if analysis fails - return empty requirements so user can still proceed
    return { websiteUrl: url, requirements: [] };
  }
};

export const generateTestPlan = async (url: string, userTestData: TestDataItem[], artifactScope: ArtifactScope = 'ALL', config?: GenerationConfig): Promise<TestPlan> => {
  const ai = getAiClient();

  // Check if credentials are provided in userTestData to enhance the prompt
  const hasCredentials = userTestData.some(d => 
    /user|login|email|pass|credential/i.test(d.key) && d.value && d.value.length > 0
  );

  const authInstructions = hasCredentials 
    ? `**CRITICAL: LOGIN CREDENTIALS PROVIDED**
       The user has provided login credentials (username, password, etc.) in the 'testData'.
       
       **MANDATORY ACTION**:
       1. You MUST generate a specialized Test Suite named "Authentication Verification" as the **VERY FIRST** suite.
       2. The first Test Case in this suite MUST be "Verify Login with Provided User Credentials".
       3. This test case should explicitly simulate the login flow: entering the provided username/password and verifying successful redirection to a dashboard or protected area.
       4. After verifying login, assume the role of an AUTHENTICATED USER for subsequent suites (e.g., User Profile, Settings, Order History).
       5. **CROSS-DOMAIN JUMPS**: If logging in redirects to a different subdomain (e.g. dashboard.vcam.ai), explicitly include test cases for that domain.`
    : `Note: No specific login credentials were detected. Focus primarily on public-facing functionality. However, if the site is a landing page for an app, verify that the "Login" or "Get Started" buttons correctly redirect to the application domain.`;

  const seoInstructions = config?.includeSEO
    ? `**MANDATORY SEO SUITE**: You MUST generate a dedicated Test Suite named "SEO & Metadata Verification".
       - It must be a separate suite.
       - Include tests for: Meta Title/Description length and relevance, Canonical tags, Robots.txt presence, Sitemap.xml existence, H1-H6 hierarchy, Image Alt text, Open Graph tags, and Core Web Vitals (LCP, CLS, FID) limits.`
    : '';

  const scopeInstructions = {
    'PLAN_ONLY': `Focus strictly on the High-Level Test Strategy. The "summary", "testStrategy", "scope", "risks", and "tools" sections should be detailed. Return an EMPTY array for "suites" and "checklist".`,
    
    'SUITES_CASES': `Skip the high-level executive summary (keep it to 1 sentence). Return an EMPTY array for "checklist". Focus 100% of your effort on generating comprehensive Test Suites with detailed, step-by-step Test Cases (steps, data, expected results).`,
    
    'PLAN_SUITES_CASES': `Generate a comprehensive "Master Test Plan". Include a detailed executive summary, strategy, and full suites with detailed test cases. Return an EMPTY array for "checklist".`,
    
    'PLAN_SUITES_CHECKLIST': `Generate the Test Plan, Test Suites (with cases), AND a Test Checklist. 
      For the "checklist" field, generate a categorized array of critical items to verify. Each item should have an "id" (e.g. CHK-01), "description", "type", "priority", and "category". 
      The checklist serves as a quick manual verification list for Exploratory Testing.`,
    
    'CHECKLIST_ONLY': `Generate a comprehensive "Exploratory Testing Checklist" ONLY. 
      The "checklist" field must be detailed with 20+ items covering critical paths, edge cases, and security verifications. 
      Return an EMPTY array for "suites". Fill out "summary" briefly.`,

    'ALL': `Generate EVERYTHING: Test Plan, detailed Test Suites with Cases, and a comprehensive Test Checklist ("checklist" field) containing critical verification points.`
  };

  // Build Target Feature Prompt
  const targetFeaturePrompt = config?.targetFeatures && config.targetFeatures.length > 0
    ? `**PRIMARY FOCUS AREAS**: The user has explicitly requested to focus the testing on the following features: "${config.targetFeatures.join(', ')}". 
       - At least 80% of the generated test cases MUST be directly related to these features.
       - Create specific Test Suites for each of these features if complexity warrants it.
       - You may include a few integration tests showing how these features interact with others, but the core focus is strictly on these requested areas.`
    : '';

  // Build Allowed Types Prompt
  const allowedTypesPrompt = config?.includedTypes && config.includedTypes.length > 0
    ? `**ALLOWED TEST TYPES**: You are STRICTLY limited to generating test cases of the following types: ${config.includedTypes.join(', ')}. Do NOT generate cases for types not listed here.
       (Exception: If SEO suite is requested, you may generate SEO types for that suite)`
    : '';

  // Prompt engineering for structured output
  const prompt = `
    You are an expert QA Automation Engineer and Software Tester.
    
    Target Website: ${url}
    Requested Artifact Scope: ${artifactScope}
    
    **User Provided Test Data Configuration**:
    ${JSON.stringify(userTestData, null, 2)}

    ${authInstructions}
    
    ${targetFeaturePrompt}

    ${allowedTypesPrompt}

    ${seoInstructions}

    Task:
    1. Research this website using Google Search to understand its core functionality, target audience, and key features.
    2. **CROSS-SITE SCOPE**: Recognize that modern web apps often span multiple subdomains (www, app, dashboard, auth). Your test plan should encompass the entire user journey, even if it leaves the initial URL provided.
    3. Think deeply about potential edge cases, happy paths, and security vulnerabilities.
    4. Generate the artifact based on the Requested Artifact setting.
    
    ${scopeInstructions[artifactScope]}
    
    Requirements:
    - **SCENARIO VARIETY**: You MUST generate a mix of scenarios.
      - **Positive**: Happy path, successful user flows.
      - **Negative**: Error handling, invalid inputs, access denial.
      - **Accessibility**: Verify contrast, screen reader compatibility, keyboard navigation.
    - Assign priorities (Critical, High, Medium, Low).
    - Provide detailed steps and expected results for each case (unless scope is PLAN_ONLY).
    - **CRITICAL**: Use the **User Provided Test Data** in the 'testData' field of your generated test cases. Map the provided values to the relevant tests. 
    - You can also add other inferred test data if needed.
    - **SECURITY**: Ensure sensitive fields are marked correctly in the output.
    - **OBSERVATIONS**: In the 'testDataObservations' field of the suite, list which test data keys were used and which failed or were not applicable.
    - **PRECONDITIONS**: **MANDATORY**: The 'preconditions' field for EVERY test case MUST include "Navigate to ${url}" (or the specific deep-link URL if relevant) as the first precondition.
    - **AUTH ANALYSIS**: Determine if the provided credentials (if any) were likely sufficient to generate authenticated scenarios. Fill the 'authAnalysis' field.
    
    Output Format:
    You MUST return the result as a strict JSON object. Do not include conversational filler outside the JSON code block.
    
    The JSON structure must match this interface:
    {
      "websiteUrl": "${url}",
      "summary": "A brief executive summary of the test coverage and strategy.",
      "testStrategy": "Approach to testing (Manual/Auto/Exploratory)",
      "scope": "What is in-scope and out-of-scope",
      "risks": "Potential project or product risks",
      "tools": "Suggested tools (e.g., Selenium, AXE, Burp Suite)",
      "authAnalysis": {
         "used": boolean, 
         "message": "Short message explaining if the login info worked or why it was skipped."
      },
      "checklist": [
         { "id": "CHK-001", "category": "Homepage", "description": "Verify home page loads under 2s", "priority": "High", "type": "Performance" }
      ],
      "suites": [
        {
          "suiteName": "Name of the suite",
          "description": "What this suite covers",
          "testDataObservations": "Notes on data usage",
          "cases": [
            {
              "id": "TC-001",
              "title": "Concise title",
              "description": "Objective of the test",
              "preconditions": "Start at ${url}...",
              "type": "Functional" | "UI/UX" | "Security" | "Performance" | "Accessibility" | "Edge Case" | "SEO",
              "scenarioType": "Positive" | "Negative" | "Boundary",
              "priority": "Critical" | "High" | "Medium" | "Low",
              "testData": [
                 { "key": "field_name", "value": "test_value", "isSensitive": boolean }
              ],
              "steps": [
                { "stepNumber": 1, "action": "Step action", "expected": "Expected result" }
              ]
            }
          ]
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 32768 }, // Max thinking budget for deep analysis
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response received from Gemini.");
    }

    const parsedData = extractJson(text);
    
    // Extract grounding metadata
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    let sources: { uri: string; title: string }[] = [];
    
    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web && chunk.web.uri) {
          sources.push({ uri: chunk.web.uri, title: chunk.web.title || chunk.web.uri });
        }
      });
    }

    sources = sources.filter((v, i, a) => a.findIndex(t => (t.uri === v.uri)) === i);

    return {
      ...parsedData,
      groundingSources: sources
    };

  } catch (error) {
    console.error("Error generating test plan:", error);
    throw error;
  }
};

export const generateImprovementCases = async (url: string, plan: TestPlan, metricCategory: string): Promise<TestSuite> => {
  const ai = getAiClient();

  const prompt = `
    You are a Senior QA Architect.
    
    Context:
    We have generated a test plan for ${url}.
    The Quality Metrics analysis indicates that the "${metricCategory}" coverage is insufficient or could be improved.
    
    Current Plan Summary: ${plan.summary}
    Existing Suites: ${plan.suites.map(s => s.suiteName).join(', ')}
    
    Task:
    Generate a NEW Test Suite specifically containing 3-5 high-value test cases to improve the "${metricCategory}" score.
    
    Requirements:
    - Suite Name: "${metricCategory} Improvements"
    - Cases must be specific to ${metricCategory} (e.g. if Security, generate XSS/Injection tests; if Usability, generate Navigation/Feedback tests).
    - Do NOT duplicate existing scenarios.
    - Provide detailed steps and expected results.
    - Precondition: "Navigate to ${url}".
    
    Output:
    Strict JSON object matching the TestSuite interface.
    {
      "suiteName": "${metricCategory} Improvements",
      "description": "Targeted test cases to improve ${metricCategory} coverage metrics.",
      "cases": [ ... ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 8000 },
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response.");
    return extractJson(text);
  } catch (error) {
    console.error(`Error generating ${metricCategory} improvements:`, error);
    throw error;
  }
};

export const generateChecklist = async (url: string, planContext?: TestPlan, count: number = 20, typeFilter?: string, existingIds?: string[], featureFocus?: string): Promise<ChecklistItem[]> => {
  const ai = getAiClient();

  // If we have a plan, use it as context to generate a better checklist
  const contextPrompt = planContext 
    ? `Context: A test plan has already been generated with suites: ${planContext.suites.map(s => s.suiteName).join(', ')}.`
    : `Context: No existing test plan provided.`;

  const typeInstruction = typeFilter && typeFilter !== 'ALL'
    ? `**STRICT REQUIREMENT**: Generate ONLY checklist items related to "${typeFilter}". Do not include other types.`
    : `Generate a mix of test types (Functional, UI/UX, Security, Performance).`;

  const featureInstruction = featureFocus && featureFocus !== 'ALL'
    ? `**STRICT FEATURE FOCUS**: You must ONLY generate checklist items specifically for the "${featureFocus}" feature/suite. 
       Do not generate items for other parts of the application.
       Set the "category" of ALL returned items to exactly "${featureFocus}".`
    : `Assign a "category" to each item based on the feature or page it tests (e.g., "Login", "Search", "Checkout", "General").`;

  const existingIdsPrompt = existingIds && existingIds.length > 0
    ? `**IMPORTANT**: The following IDs already exist: ${existingIds.join(', ')}. You MUST NOT reuse these IDs. Generate new, unique IDs (e.g. continue the sequence or use a new prefix).`
    : '';

  const prompt = `
    You are a QA Lead.
    
    Task: Generate a comprehensive "Exploratory Testing Checklist" for the website ${url}.
    
    ${contextPrompt}
    
    ${typeInstruction}

    ${featureInstruction}

    ${existingIdsPrompt}
    
    Requirements:
    - Generate EXACTLY ${count} NEW concise, actionable checklist items.
    - These should be "sanity checks" or "quick verifications" a manual tester would do.
    - AUTOMATICALLY assign the correct "type" (Functional, UI/UX, Security, Performance, Accessibility, Edge Case).
    - AUTOMATICALLY assign the correct "priority" (Critical, High, Medium, Low) based on impact.
    - **CATEGORIZATION**: Follow the Feature Focus instruction above. If no specific feature is requested, categorize logically.
    - If there is an existing checklist (not provided here, but assume adding to one), ensure these are unique or cover new ground.
    
    Output:
    Strict JSON array of ChecklistItem objects:
    [
      { "id": "CHK-001", "category": "Feature Name", "description": "...", "priority": "Critical" | "High" | "Medium" | "Low", "type": "Functional" | "UI/UX" | "Security" | "Performance" | "Accessibility" | "Edge Case" }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Flash is sufficient for simple checklists
      contents: prompt
    });

    const text = response.text || '[]';
    return extractJson(text);
  } catch (error) {
    console.error("Error generating checklist:", error);
    throw error;
  }
};

export const generateQualityMetrics = async (plan: TestPlan): Promise<QualityReport> => {
  const ai = getAiClient();

  const prompt = `
    You are a Software Quality Assurance Architect.
    
    Task: Evaluate the expected software quality of the target application based on the generated Test Plan coverage and requirements.
    Target Website: ${plan.websiteUrl}
    
    Test Plan Context:
    - Summary: ${plan.summary}
    - Suites: ${plan.suites.map(s => `${s.suiteName} (${s.cases.length} cases)`).join(', ')}
    - Risks: ${plan.risks}
    
    Action:
    Analyze the test plan against ISO 25010 Software Quality Standards. 
    Estimate a score (0-100) for each quality attribute based on the *depth of testing proposed* and the *likely complexity* of the application.
    
    Attributes to Evaluate:
    1. Functional Suitability (Completeness, Correctness)
    2. Performance Efficiency (Time behavior, Resource utilization)
    3. Compatibility (Browsers, Devices)
    4. Usability (Learnability, User Error Protection, UI Aesthetics)
    5. Reliability (Availability, Fault Tolerance)
    6. Security (Confidentiality, Integrity)
    7. Maintainability (Modularity, Reusability - inferred)
    8. Portability (Adaptability)
    9. SEO Optimization (Discoverability, Relevance)

    Output:
    Strict JSON object matching the QualityReport interface.
    {
      "overallScore": number, // Average of metrics
      "timestamp": ${Date.now()},
      "executiveSummary": "A detailed paragraph summarizing the overall quality posture and major areas of concern.",
      "metrics": [
        { 
          "category": "Functional Suitability", 
          "score": number, 
          "reasoning": "Why this score? Refrence specific suites or missing coverage.", 
          "improvements": ["Specific suggestion 1", "Specific suggestion 2"] 
        },
        ... (repeat for all 9 categories)
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Pro for analysis
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 8000 },
      }
    });

    const text = response.text || '';
    return extractJson(text);
  } catch (error) {
    console.error("Error generating quality metrics:", error);
    throw error;
  }
};

export const generateMoreTestCases = async (url: string, suite: TestSuite, userTestData: TestDataItem[], focusType?: string, count: number = 3): Promise<TestCase[]> => {
  const ai = getAiClient();

  const existingIds = suite.cases.map(c => c.id).join(', ');
  const focusInstruction = focusType 
    ? `**CRITICAL FOCUS**: The user explicitly requested ONLY "${focusType}" test cases. Generate EXACTLY ${count} cases that strictly fall under the category of ${focusType}.`
    : `Generate EXACTLY ${count} NEW, UNIQUE test cases for this suite that are NOT already covered. Look for "Negative", "Boundary", or "Accessibility" scenarios.`;

  const prompt = `
    You are an expert QA Engineer.
    
    Context:
    We have an existing test suite named "${suite.suiteName}" for the website ${url}.
    Description: ${suite.description}
    
    Existing Test Case IDs in this suite: ${existingIds}
    
    User Test Data:
    ${JSON.stringify(userTestData, null, 2)}

    Task:
    ${focusInstruction}
    
    Requirements:
    - Generate EXACTLY ${count} test cases.
    - **STRICT RELEVANCE**: All generated cases MUST be strictly related to the feature "${suite.suiteName}".
      - Do NOT generate generic tests (e.g. "Check footer", "Verify broken links") unless they specifically relate to this feature.
      - If the suite is "Login", do NOT generate "Search" tests.
      - If the suite is "SEO", do NOT generate functional checkout tests.
    - Do NOT duplicate existing cases.
    - Classify each with "scenarioType".
    - **STEPS**: You MUST generate detailed test steps (action, expected) for every test case. Do not return empty steps.
    - **PRECONDITIONS**: Must include "Navigate to ${url}" (or relevant page).
    - **ID PATTERN**: You MUST follow the ID pattern of the existing cases. If existing IDs are "AUTH-001", "AUTH-002", then your new cases MUST be "AUTH-003", "AUTH-004", etc. Do NOT use generic IDs like "TC-NEW-001" unless the existing ones are also generic.
    
    Output:
    Strict JSON array of TestCase objects.
    [
      {
        "id": "MATCHING-PATTERN-XXX",
        "title": "...",
        "description": "...",
        "preconditions": "Navigate to ${url}...",
        "type": "...",
        "scenarioType": "Positive" | "Negative" | "Boundary",
        "priority": "...",
        "testData": [],
        "steps": [
           { "stepNumber": 1, "action": "Click Login button", "expected": "Login modal appears" },
           { "stepNumber": 2, "action": "Enter invalid credentials", "expected": "Error message displayed" }
        ]
      }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 16000 },
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response.");
    const newCases = extractJson(text);
    
    // Ensure it's an array
    if (Array.isArray(newCases)) {
      return newCases.slice(0, count);
    } else if (newCases.cases && Array.isArray(newCases.cases)) {
      return newCases.cases.slice(0, count);
    }
    return [];
  } catch (error) {
    console.error("Error generating more cases:", error);
    throw error;
  }
};

export const regenerateTestCase = async (url: string, originalCase: TestCase, newTestData: TestDataItem[]): Promise<TestCase> => {
  const ai = getAiClient();

  const prompt = `
    You are an expert QA Engineer.
    
    Task: Update an existing test case with NEW test data provided by the user.
    Target Website: ${url}
    
    Original Test Case:
    ${JSON.stringify(originalCase, null, 2)}
    
    **NEW Test Data to Apply**:
    ${JSON.stringify(newTestData, null, 2)}
    
    Instructions:
    1. Rewrite the test case to explicitly use the NEW test data.
    2. Update steps, action, and expected results to reflect this new data (e.g. if a valid login is provided, the expected result should be successful login).
    3. Ensure the 'testData' field in the response contains the new data.
    4. **MANDATORY**: Ensure 'preconditions' starts with "Navigate to ${url}".
    
    Output:
    Strict JSON object matching the TestCase interface.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Use Pro for intelligent rewriting
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 4000 },
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response.");
    const updatedCase = extractJson(text);
    
    // Return the case (handle if it wrapped in an object or array)
    if (updatedCase.id) return updatedCase;
    if (updatedCase.cases && updatedCase.cases[0]) return updatedCase.cases[0];
    if (Array.isArray(updatedCase) && updatedCase[0]) return updatedCase[0];
    
    return updatedCase;
  } catch (error) {
    console.error("Error regenerating test case:", error);
    throw error;
  }
};

export const generateCypressScript = async (url: string, testCase: TestCase): Promise<string> => {
  const ai = getAiClient();

  const prompt = `
    You are an expert QA Automation Engineer specialized in Cypress.
    
    Task: Write a complete, runnable Cypress test script (JavaScript/TypeScript) for the following test case.
    Target Website: ${url}
    
    Test Case:
    ID: ${testCase.id}
    Title: ${testCase.title}
    Description: ${testCase.description}
    Preconditions: ${testCase.preconditions}
    Test Data: ${JSON.stringify(testCase.testData)}
    Steps: ${JSON.stringify(testCase.steps)}
    
    Instructions:
    - Write robust selectors (prioritize data-testid, id, name, then class).
    - Handle asynchronous waits properly (use cy.intercept where helpful for stability).
    - Include comments explaining the steps.
    - If user credentials are provided in Test Data, assume they are valid and use them.
    - Wrap the test in a 'describe' and 'it' block.
    - Just return the code, do not include markdown formatting if possible, or wrap in \`\`\`javascript.
    
    Output:
    The pure code string.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Flash is fine for code gen of known logic
      contents: prompt
    });

    let text = response.text || '';
    // Clean up markdown code blocks if present
    text = text.replace(/^```(javascript|typescript|js|ts)?\n/, '').replace(/```$/, '');
    return text;
  } catch (error) {
    console.error("Error generating cypress script:", error);
    throw new Error("Failed to generate automation script.");
  }
};

export const generateSuiteCypressScript = async (url: string, suite: TestSuite): Promise<string> => {
  const ai = getAiClient();

  // Filter for cases that have steps
  const casesWithSteps = suite.cases.filter(c => c.steps && c.steps.length > 0);

  if (casesWithSteps.length === 0) {
    return `// No test cases with steps found in suite: ${suite.suiteName}`;
  }

  const prompt = `
    You are an expert QA Automation Engineer specialized in Cypress.
    
    Task: Write a SINGLE, comprehensive Cypress test file (.spec.ts) covering ALL the test cases in the provided Test Suite.
    Target Website: ${url}
    
    Suite Name: ${suite.suiteName}
    Description: ${suite.description}
    
    Test Cases to Include:
    ${JSON.stringify(casesWithSteps.map(c => ({
      id: c.id,
      title: c.title,
      testData: c.testData,
      steps: c.steps
    })), null, 2)}
    
    Instructions:
    - Structure the file with one main 'describe("${suite.suiteName}", ...)' block.
    - Inside, create an 'it("TC-ID: Title", ...)' block for EACH test case.
    - Use 'beforeEach' to handle common navigation (e.g. cy.visit('${url}')).
    - Write robust selectors.
    - Handle sensitive data: If test data says "isSensitive", do not hardcode the value if possible, or use a placeholder like Cypress.env('...') if appropriate, but for this output, standard string values are acceptable if they are just test data.
    - Keep the code clean and commented.
    - Just return the code, do not include markdown formatting if possible.
    
    Output:
    The pure code string.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Switched from 3-pro for reliability on structured code generation
      contents: prompt
    });

    let text = response.text || '';
    if (!text) {
       console.error("Empty response for suite generation");
       return "// Failed to generate script content. AI returned empty response.";
    }
    text = text.replace(/^```(javascript|typescript|js|ts)?\n/, '').replace(/```$/, '');
    return text;
  } catch (error) {
    console.error("Error generating suite script:", error);
    throw new Error("Failed to generate suite automation script.");
  }
};

export const generateAutomationScript = async (
  framework: ScriptFramework,
  plan: TestPlan,
  suitesToInclude?: string[] // If empty/null, include all
): Promise<string> => {
  const ai = getAiClient();

  const suites = suitesToInclude && suitesToInclude.length > 0
    ? plan.suites.filter(s => suitesToInclude.includes(s.suiteName))
    : plan.suites;

  const totalCases = suites.reduce((acc, s) => acc + s.cases.length, 0);

  const prompt = `
    You are an expert QA Automation Engineer specialized in ${framework}.

    Task: Write a complete, robust automation script using ${framework} for the provided Test Plan data.
    Target Website: ${plan.websiteUrl}
    Context:
    - Total Suites: ${suites.length}
    - Total Test Cases: ${totalCases}

    Suites and Cases Data:
    ${JSON.stringify(suites.map(s => ({
      name: s.suiteName,
      cases: s.cases.map(c => ({
        id: c.id,
        title: c.title,
        steps: c.steps,
        testData: c.testData
      }))
    })), null, 2)}

    Framework Specific Instructions:
    ${framework === 'Cypress' ? '- Use `cy.visit`, `cy.get`, `cy.intercept`. Use Mocha describe/it blocks.' : ''}
    ${framework === 'Playwright' ? '- Use `await page.goto`, `await page.locator`. Use Playwright test/expect structure.' : ''}
    ${framework === 'Selenium' ? '- Use Python or JavaScript Selenium WebDriver syntax (Prefer JavaScript/Node.js). Use typical driver.findElement, etc.' : ''}

    General Instructions:
    - Create a single file structure (or class-based if appropriate for Selenium).
    - Handle authentication if credentials are present in test data.
    - Use placeholders for sensitive data.
    - Add comments for clarity.
    - JUST RETURN THE CODE. No markdown blocks if possible, or clean them.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 16000 },
      }
    });

    let text = response.text || '';
    text = text.replace(/^```(javascript|typescript|js|ts|python)?\n/, '').replace(/```$/, '');
    return text;
  } catch (error) {
    console.error("Error generating automation script:", error);
    throw new Error(`Failed to generate ${framework} script.`);
  }
};
