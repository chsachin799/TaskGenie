require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const key = process.env.GEMINI_API_KEY;
console.log("Checking Key:", key ? "Present (" + key.substring(0, 5) + "...)" : "MISSING");

const genAI = new GoogleGenerativeAI(key);

async function listModels() {
    try {
        // For some versions of the SDK, listModels might not be direct, 
        // but let's try a simple generation to 'gemini-pro' and 'gemini-1.5-flash' explicitly
        // to see distinct errors.

        console.log("\nAttempting 'gemini-2.5-flash'...");
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent("Test");
            console.log("SUCCESS: gemini-2.5-flash works.");
        } catch (e) {
            console.log("FAILED 'gemini-2.5-flash':", e.message);
        }

        console.log("\nAttempting 'gemini-2.0-flash'...");
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent("Test");
            console.log("SUCCESS: gemini-2.0-flash works.");
        } catch (e) {
            console.log("FAILED 'gemini-2.0-flash':", e.message);
        }

    } catch (err) {
        console.error("Global Error:", err);
    }
}

listModels();
