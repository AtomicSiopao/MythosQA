
import { GoogleGenAI } from "@google/genai";
import { TestPlan, TestSuite, TestCase, TestType, TestPriority, TestRequirementsAnalysis, TestDataItem, ArtifactScope } from "../types";

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
    4. Return a list of these requirements. Mark any potentially sensitive fields (Password, Credit Card, API Key, PII) as "isSensitive": true.
    5. **GROUPING**: Group these requirements logically by the page or feature they belong to (e.g., "Login", "Registration", "Checkout", "Profile").
    6. **INPUT TYPES**:
       - If a field usually has multiple standard options (e.g. "Social Login Provider" -> Google, Facebook; "Role" -> Admin, User), provide an "options" array.
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
          "options": ["Option 1", "Option 2"], // Optional array of strings
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

export const generateTestPlan = async (url: string, userTestData: TestDataItem[], artifactScope: ArtifactScope = 'ALL'): Promise<TestPlan> => {
  const ai = getAiClient();

  // Check if credentials are provided in userTestData to enhance the prompt
  const hasCredentials = userTestData.some(d => 
    /user|login|email|pass|credential/i.test(d.key) && d.value && d.value.length > 0
  );

  const authInstructions = hasCredentials 
    ? `**CRITICAL: LOGIN CONTEXT DETECTED**
       The user has provided login credentials (username, password, etc.) in the 'testData'. 
       You MUST assume the role of an AUTHENTICATED USER.
       - Go BEYOND public pages.
       - Generate deep functionality tests for protected areas (e.g., User Profile, Settings, Order History, Dashboard).
       - Create specific test cases that verify the login process itself using the provided data.
       - Create test cases that verify session management.
       - **CROSS-DOMAIN JUMPS**: If logging in redirects to a different subdomain (e.g. dashboard.vcam.ai), explicitly include test cases for that domain.`
    : `Note: No specific login credentials were detected. Focus primarily on public-facing functionality. However, if the site is a landing page for an app, verify that the "Login" or "Get Started" buttons correctly redirect to the application domain.`;

  const scopeInstructions = {
    'ALL': `Generate a comprehensive "Master Test Plan". Include a detailed executive summary covering strategy, risks, scope and tools. THEN, provide a full set of detailed Test Suites and Test Cases with granular steps. This is the complete package.`,
    'TEST_PLAN': `Focus strictly on the High-Level Test Strategy. The "summary", "testStrategy", "scope", "risks", and "tools" sections should be detailed. The "suites" should be high-level logical groups, and the "cases" inside them should be high-level scenarios (one-liners) WITHOUT detailed steps.`,
    'SUITES_AND_CASES': `Skip the high-level executive summary (keep it to 1 sentence). Focus 100% of your effort on generating comprehensive Test Suites with detailed, step-by-step Test Cases (steps, data, expected results).`,
    'CASES_ONLY': `Generate a massive flat list of critical test cases. Group them into a single "Main Suite" or basic logical suites, but minimize the structure. Prioritize quantity and depth of the test steps over the plan hierarchy. Keep the summary empty.`
  };

  // Prompt engineering for structured output
  const prompt = `
    You are an expert QA Automation Engineer and Software Tester.
    
    Target Website: ${url}
    Requested Artifact: ${artifactScope}
    
    **User Provided Test Data Configuration**:
    ${JSON.stringify(userTestData, null, 2)}

    ${authInstructions}

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
    - Provide detailed steps and expected results for each case (unless artifact is TEST_PLAN, then keep high-level).
    - **CRITICAL**: Use the **User Provided Test Data** in the 'testData' field of your generated test cases. Map the provided values to the relevant tests. 
    - You can also add other inferred test data if needed.
    - **SECURITY**: Ensure sensitive fields are marked correctly in the output.
    - **OBSERVATIONS**: In the 'testDataObservations' field of the suite, list which test data keys were used and which failed or were not applicable.
    - **PRECONDITIONS**: **MANDATORY**: The 'preconditions' field for EVERY test case MUST include "Navigate to ${url}" (or the specific deep-link URL if relevant) as the first precondition.
    
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
              "type": "Functional" | "UI/UX" | "Security" | "Performance" | "Accessibility" | "Edge Case",
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

export const generateMoreTestCases = async (url: string, suite: TestSuite, userTestData: TestDataItem[], focusType?: string): Promise<TestCase[]> => {
  const ai = getAiClient();

  const existingIds = suite.cases.map(c => c.id).join(', ');
  const focusInstruction = focusType 
    ? `**CRITICAL FOCUS**: The user explicitly requested ONLY "${focusType}" test cases. Generate 3-5 cases that strictly fall under the category of ${focusType}.`
    : `Generate 3-5 NEW, UNIQUE test cases for this suite that are NOT already covered. Look for "Negative", "Boundary", or "Accessibility" scenarios.`;

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
    - Do NOT duplicate existing cases.
    - Classify each with "scenarioType".
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
        "steps": []
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
      return newCases;
    } else if (newCases.cases && Array.isArray(newCases.cases)) {
      return newCases.cases;
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
      model: 'gemini-3-pro-preview', // Use Pro for larger context generation
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 8000 },
      }
    });

    let text = response.text || '';
    text = text.replace(/^```(javascript|typescript|js|ts)?\n/, '').replace(/```$/, '');
    return text;
  } catch (error) {
    console.error("Error generating suite script:", error);
    throw new Error("Failed to generate suite automation script.");
  }
};
