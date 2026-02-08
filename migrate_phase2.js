const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server/tasks.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. Create Subtasks Table
    db.run(`CREATE TABLE IF NOT EXISTS subtasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        is_completed INTEGER DEFAULT 0,
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )`, (err) => {
        if (err) console.error("Error creating subtasks table:", err);
        else console.log("Subtasks table ready.");
    });

    // 2. Create Dependencies Table
    db.run(`CREATE TABLE IF NOT EXISTS task_dependencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        blocker_id INTEGER NOT NULL,
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY(blocker_id) REFERENCES tasks(id) ON DELETE CASCADE
    )`, (err) => {
        if (err) console.error("Error creating task_dependencies table:", err);
        else console.log("Task dependencies table ready.");
    });

    // 3. Add recurrence_rule to tasks
    db.run(`ALTER TABLE tasks ADD COLUMN recurrence_rule TEXT`, (err) => {
        if (err) {
            if (err.message && err.message.includes('duplicate column')) {
                console.log("recurrence_rule column already exists.");
            } else {
                console.error("Error adding recurrence_rule column:", err);
            }
        } else {
            console.log("Added recurrence_rule column to tasks.");
        }
    });
});

db.close((err) => {
    if (err) console.error(err.message);
    console.log('Close the database connection.');
});
