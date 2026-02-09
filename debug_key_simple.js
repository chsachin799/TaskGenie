
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const key = process.env.GEMINI_API_KEY;
console.log("Checking Key:", key ? "Present (" + key.substring(0, 5) + "...)" : "MISSING");

const genAI = new GoogleGenerativeAI(key);

async function testModel(modelName) {
    console.log(`\nTesting model: ${modelName}`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello, can you hear me?");
        const response = await result.response;
        console.log(`SUCCESS: ${modelName} responded: ${response.text().substring(0, 50)}...`);
    } catch (e) {
        console.error(`FAILED: ${modelName}`);
        console.error("Error Message:", e.message);
        // Log more details if available
        if (e.response) {
            console.error("Error Response:", JSON.stringify(e.response, null, 2));
        }
    }
}

async function runTests() {
    await testModel("gemini-1.5-flash");
    await testModel("gemini-pro");
}

runTests();
