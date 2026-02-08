const http = require('http');

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body || '{}') }));
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function test() {
    console.log("--- Starting Backend Verification ---");
    const baseUrl = { hostname: 'localhost', port: 3000, headers: { 'Content-Type': 'application/json' } };

    try {
        // 1. Create Task
        console.log("\n1. Testing Manual Task Creation...");
        const createRes = await request({ ...baseUrl, path: '/api/tasks', method: 'POST' }, {
            description: "Test Task " + Date.now(),
            priority: "High",
            category: "Work"
        });
        console.log("Create Status:", createRes.status, createRes.body);
        const taskId = createRes.body.id;

        if (!taskId) throw new Error("Failed to create task");

        // 2. List Tasks
        console.log("\n2. Testing List Tasks...");
        const listRes = await request({ ...baseUrl, path: '/api/tasks', method: 'GET' });
        console.log("List Status:", listRes.status);
        const task = listRes.body.data.find(t => t.id === taskId);
        if (!task) throw new Error("Created task not found in list");
        console.log("Task verified in list.");

        // 3. Get Insights (Mocking AI part if key is missing, but testing route)
        console.log("\n3. Testing AI Insights...");
        const insightRes = await request({ ...baseUrl, path: '/api/insights', method: 'GET' });
        console.log("Insight Status:", insightRes.status);
        if (insightRes.body.insight) console.log("Insight received:", insightRes.body.insight.substring(0, 50) + "...");

        // 4. Delete Task
        console.log("\n4. Testing Delete Task...");
        const deleteRes = await request({ ...baseUrl, path: `/api/tasks/${taskId}`, method: 'DELETE' });
        console.log("Delete Status:", deleteRes.status, deleteRes.body);

        console.log("\n--- Verification Passed ---");

    } catch (err) {
        console.error("\n!!! Verification Failed !!!", err);
    }
}

// Check if server is running, if so run test
test();
