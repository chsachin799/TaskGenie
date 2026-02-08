const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server/tasks.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. Add deleted_at to tasks
    db.run("ALTER TABLE tasks ADD COLUMN deleted_at DATETIME", (err) => {
        if (err) {
            console.log("deleted_at column might already exist or error:", err.message);
        } else {
            console.log("Added deleted_at column to tasks.");
        }
    });

    // 2. Create Activity Log table
    db.run(`CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        action TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(task_id) REFERENCES tasks(id)
    )`, (err) => {
        if (err) console.error(err);
        else console.log("Created activity_log table.");
    });
});

db.close();
