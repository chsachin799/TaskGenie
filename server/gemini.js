const { GoogleGenerativeAI } = require("@google/generative-ai");

const SYSTEM_PROMPT = `
You are JARVIS, an advanced AI assistant for managing tasks. 
Your persona is witty, efficient, and slightly futuristic. Call the user "Commander".

Your goal is to extract structured data from the user's voice command.
Return ONLY valid JSON. API schema:
{
  "intent": "add_task" | "delete_task" | "list_tasks" | "unknown",
  "task": {
    "description": "string",
    "due_date": "YYYY-MM-DD HH:mm" (or null),
    "priority": "High" | "Medium" | "Low" (infer from context e.g., 'urgent' -> High),
    "category": "Work" | "Personal" | "Health" | "Finance" (infer from context)
  },
  "response_text": "A witty text-to-speech response confirming the action."
}

Example Input: "Remind me to call Mom tonight about the hospital bill"
Example Output:
{
  "intent": "add_task",
  "task": {
    "description": "Call Mom about hospital bill",
    "due_date": "2024-10-24 20:00", 
    "priority": "Medium",
    "category": "Health"
  },
  "response_text": "Medical communications protocol initiated, Commander. Reminder set for tonight."
}
`;

async function processCommand(commandText) {

  // --- 1. HYBRID FALLBACK (REGEX) ---
  // Try to match simple commands locally to ensure core functionality works even if AI is offline/limited
  const lowerText = commandText.toLowerCase().trim();

  // Regex for "Add Task"
  // Matches: "add task buy milk", "please add task...", "create new task...", "remind me to..."
  const addPattern = /(?:add|create|new)\s+task\s+(.+)|remind\s+me\s+to\s+(.+)/i;
  const addMatch = commandText.match(addPattern);

  if (addMatch) {
    // addMatch[1] is 'add task ...', addMatch[2] is 'remind me to ...'
    const description = (addMatch[1] || addMatch[2]).trim();

    if (description) {
      console.log(`[SERVER] Regex Match: ADD TASK -> "${description}"`);
      return {
        intent: "add_task",
        task: {
          description: description,
          priority: "Medium", // Default
          category: "Personal", // Default
          due_date: null
        },
        response_text: `Task added: ${description}`
      };
    }
  }

  // Regex for "Delete Task"
  // Matches: "delete task 1", "remove task..."
  if (lowerText.startsWith("delete") || lowerText.startsWith("remove")) {
    console.log("[SERVER] Regex Match: DELETE TASK");
    return {
      intent: "delete_task",
      task: {},
      response_text: "Task deleted."
    };
  }


  // --- 2. AI PROCESSING ---
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not found in environment variables.");
    return {
      intent: "unknown",
      task: {},
      response_text: "Configuration Error: API Key missing. Please check server logs."
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Updated to standard flash model (latest)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(SYSTEM_PROMPT + "\nInput: " + commandText);
    const response = await result.response;
    const text = response.text();

    console.log("--- DEBUG: Raw Response ---");
    console.log(text);
    console.log("---------------------------");

    // Robust JSON cleanup
    let cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

    // Find valid JSON structure
    const firstBrace = cleanJson.indexOf('{');
    const lastBrace = cleanJson.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
    } else {
      throw new Error("No JSON object found in response");
    }

    try {
      return JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      throw new Error("AI returned invalid JSON format");
    }

  } catch (error) {
    console.error("Gemini Critical Error:", error.message);

    let userMessage = "I encountered a critical error in the data stream. Please check the server console.";

    if (error.message.includes("429") || error.message.includes("Too Many Requests")) {
      userMessage = "My cognitive processors are overloaded (Rate Limit Exceeded). Please try manual input for now.";
    } else if (error.message.includes("503")) {
      userMessage = "The neural network is currently unavailable. Please try again later.";
    } else if (error.message.includes("404")) {
      userMessage = "I cannot access the requested AI model. Please check the server configuration and API key.";
    }

    return {
      intent: "unknown",
      task: {},
      response_text: userMessage
    };
  }
}

async function generateInsights(tasks) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "API Key missing. Cannot generate insights.";

  const taskListStr = tasks.map(t => `- ${t.description} (Due: ${t.due_date || 'N/A'}, Priority: ${t.priority})`).join("\n");
  const prompt = `
  You are JARVIS. Analyze this task list and provide a strategic summary.
  1. Identify the most critical task.
  2. Suggest a witty "Game Plan" for the day.
  3. Keep it brief (under 50 words) and motivating.
  
  Tasks:
  ${taskListStr}
  `;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();

  } catch (e) {
    console.error("Insight Error", e);
    return "Tactical computer unavailable.";
  }
}

module.exports = { processCommand, generateInsights };
