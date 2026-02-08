require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

const key = process.env.GEMINI_API_KEY || "";
const logStream = fs.createWriteStream("error_log.txt", { flags: 'w' });

function log(msg) {
    console.log(msg);
    logStream.write(msg + "\n");
}

log(`Key Length: ${key.length}`);
log(`Key First 4: ${key.substring(0, 4)}`);
log(`Key Last 4: ${key.substring(key.length - 4)}`);

const genAI = new GoogleGenerativeAI(key);

async function test() {
    try {
        const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash-001" });
        log("Testing models/gemini-2.0-flash-001...");
        const result = await model.generateContent("Hello");
        const response = await result.response;
        log("Success: " + response.text());
    } catch (e) {
        log("Error Type: " + e.name);
        log("Error Msg: " + e.message);
        if (e.response) {
            log("Error Status: " + e.response.status);
            log("Error StatusText: " + e.response.statusText);
        }
    }

    log("----------------");

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        log("Testing gemini-pro...");
        const result = await model.generateContent("Hello");
        const response = await result.response;
        log("Success: " + response.text());
    } catch (e) {
        log("Error Type: " + e.name);
        log("Error Msg: " + e.message);
    }
}

test();
