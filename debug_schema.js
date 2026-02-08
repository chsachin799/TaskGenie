const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'server/tasks.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.all("PRAGMA table_info(tasks)", (err, rows) => {
        if (err) console.error(err);
        else {
            console.log("TASKS TABLE SCHEMA:");
            console.table(rows);
            // Check for is_archived
            const hasArchived = rows.find(r => r.name === 'is_archived');
            console.log("Has is_archived:", !!hasArchived);
        }
    });
});
