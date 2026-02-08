const http = require('http');

function req(method, path, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api' + path,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        const req = http.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function test() {
    console.log("1. Get Profile...");
    const profile1 = await req('GET', '/profile');
    console.log("Initial Profile:", profile1);

    console.log("2. Create Task...");
    const task = await req('POST', '/tasks', {
        description: "Test XP Task",
        priority: "High",
        category: "Work"
    });
    console.log("Task Created:", task);

    console.log("3. Complete Task...");
    const complete = await req('PUT', `/tasks/${task.id}`, { status: 'completed' });
    console.log("Completion Result:", complete);

    console.log("Waiting for async DB update...");
    await new Promise(r => setTimeout(r, 1000));

    console.log("4. Verify Profile XP...");
    const profile2 = await req('GET', '/profile');
    console.log("Final Profile:", profile2);

    if (profile2.xp === profile1.xp + 50) {
        console.log("SUCCESS: XP Awarded Correctly (High Priority = 50xp)");
    } else {
        console.log("FAILURE: XP mismatch");
    }
}

test();
