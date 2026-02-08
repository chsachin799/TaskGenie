const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server/tasks.db');
const db = new sqlite3.Database(dbPath);

console.log("Checking Activity Log Table...");

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        action TEXT NOT NULL,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )`, (err) => {
        if (err) console.error("Error creating activity_log table:", err.message);
        else console.log("Activity Log table ready.");
    });
});

db.close((err) => {
    if (err) console.error("Error closing DB:", err.message);
    else console.log("Migration Complete.");
});
