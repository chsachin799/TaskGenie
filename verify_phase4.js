// verify_phase4.js (using fetch)
const API_URL = 'http://localhost:3000/api';

async function testPhase4() {
    console.log("=== Testing Phase 4 Features (Fetch) ===");

    try {
        // Helper wrappers
        const post = async (url, body) => {
            const res = await fetch(API_URL + url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error(`POST ${url} failed: ${res.status} ${res.statusText}`);
            return await res.json();
        };

        const get = async (url) => {
            const res = await fetch(API_URL + url);
            if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
            return await res.json();
        };

        const put = async (url, body) => {
            const res = await fetch(API_URL + url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error(`PUT ${url} failed: ${res.status} ${res.statusText}`);
            return await res.json();
        };

        // 1. Create a Task
        console.log("Creating Test Task...");
        const taskRes = await post('/tasks', {
            description: "Phase 4 Test Task",
            due_date: "2024-12-31 12:00",
            priority: "High",
            category: "Work"
        });
        const taskId = taskRes.id; // API returns { id: ... } using lastID
        console.log(`Task Created: ID ${taskId}`);

        // 2. Add Comment
        console.log("Adding Comment...");
        await post(`/tasks/${taskId}/comments`, { content: "This is a test comment" });

        // 3. Verify Comment
        console.log("Verifying Comment...");
        const commentRes = await get(`/tasks/${taskId}/comments`);
        if (commentRes.data.find(c => c.content === "This is a test comment")) {
            console.log("SUCCESS: Comment found.");
        } else {
            console.error("FAILURE: Comment not found.");
        }

        // 4. Verify Activity Log
        console.log("Verifying Activity Log...");
        const activityRes = await get(`/tasks/${taskId}/activity`);
        const logs = activityRes.data;
        if (logs.some(l => l.action === "CREATE") && logs.some(l => l.action === "COMMENT")) {
            console.log("SUCCESS: Activity logs found (CREATE & COMMENT).");
        } else {
            console.error("FAILURE: Missing activity logs.", logs);
        }

        // 5. Biometric Mock
        console.log("Testing Biometric Mock...");
        const bioRes = await post('/biometric/verify', {});
        if (bioRes.verified) console.log("SUCCESS: Biometric Verified.");
        else console.error("FAILURE: Biometric Failed.");

        // 6. Share Link
        console.log("Testing Share Link generation...");
        const shareRes = await post(`/tasks/${taskId}/share`, {});
        const shareUrl = shareRes.url;
        const shareHash = shareRes.hash;
        console.log(`Share URL: ${shareUrl}`);

        console.log("Testing Share Link access...");
        const sharedTaskRes = await get(`/shared/${shareHash}`);
        if (sharedTaskRes.task.id === taskId) console.log("SUCCESS: Shared task accessed.");
        else console.error("FAILURE: Shared task ID mismatch.");

        // 7. Legacy Poem
        console.log("Testing Legacy Poem (Setting task to completed first)...");
        await put(`/tasks/${taskId}`, { status: 'completed' });

        const poemRes = await get('/legacy/poem');
        if (poemRes.poem) console.log("SUCCESS: Poem generated:\n", poemRes.poem);
        else console.error("FAILURE: No poem generated.");

    } catch (err) {
        console.error("TEST FAILED:", err.message);
        process.exit(1);
    }
}

testPhase4();
