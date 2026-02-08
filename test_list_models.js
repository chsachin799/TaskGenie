require('dotenv').config();

async function list() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.log("No Key");
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    try {
        const response = await fetch(url);
        const data = await response.json();

        const fs = require('fs');
        fs.writeFileSync('models.json', JSON.stringify(data, null, 2));
        console.log("Models written to models.json");

    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

list();
