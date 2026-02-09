
require('dotenv').config();
const axios = require('axios');

const key = process.env.GEMINI_API_KEY;
if (!key) {
    console.error("No API key found!");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

console.log("Fetching models...");

const fs = require('fs');

axios.get(url)
    .then(response => {
        const models = response.data.models;
        const output = models.map(m => m.name).join('\n');
        fs.writeFileSync('models_list_debug.txt', output);
        console.log("Written to models_list_debug.txt");
    })
    .catch(error => {
        const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        fs.writeFileSync('models_list_debug.txt', "ERROR: " + errorMsg);
        console.error("Written error to models_list_debug.txt");
    });
