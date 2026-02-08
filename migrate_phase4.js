const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server/tasks.db');
const db = new sqlite3.Database(dbPath);

console.log("Starting Phase 4 Migration...");

db.serialize(() => {
    // 1. Comments Table
    db.run(`CREATE TABLE IF NOT EXISTS task_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )`, (err) => {
        if (err) console.error("Error creating comments table:", err.message);
        else console.log("Comments table ready.");
    });

    // 2. Task Columns
    db.run("ALTER TABLE tasks ADD COLUMN public_hash TEXT", (err) => {
        if (err && !err.message.includes('duplicate')) console.error("Error adding public_hash:", err.message);
        else console.log("Column public_hash checked/added.");
    });

    db.run("ALTER TABLE tasks ADD COLUMN requires_biometric INTEGER DEFAULT 0", (err) => {
        if (err && !err.message.includes('duplicate')) console.error("Error adding requires_biometric:", err.message);
        else console.log("Column requires_biometric checked/added.");
    });

    // 3. User Prefs
    db.run(`CREATE TABLE IF NOT EXISTS user_prefs (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        theme TEXT DEFAULT 'cyber',
        sound_enabled INTEGER DEFAULT 1
    )`, (err) => {
        if (err) console.error("Error creating user_prefs:", err.message);
        else {
            db.run(`INSERT OR IGNORE INTO user_prefs (id, theme, sound_enabled) VALUES (1, 'cyber', 1)`, (err) => {
                if (err) console.error("Error inserting default prefs:", err.message);
                else console.log("User prefs table ready.");
            });
        }
    });
});

db.close((err) => {
    if (err) console.error("Error closing DB:", err.message);
    else console.log("Phase 4 Migration Complete. Connection closed.");
});
