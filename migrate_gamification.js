const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server/tasks.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Create User Profile Table
    db.run(`CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        rank_title TEXT DEFAULT 'Cadet'
    )`, (err) => {
        if (err) console.error("Error creating user_profile table:", err);
        else {
            console.log("User profile table ready.");
            // Initialize with default row if empty
            db.run(`INSERT OR IGNORE INTO user_profile (id, xp, level, rank_title) VALUES (1, 0, 1, 'Cadet')`, (err) => {
                if (err) console.error("Error inserting default profile:", err);
                else console.log("Default profile validated.");
            });
        }
    });
});

db.close((err) => {
    if (err) console.error(err.message);
    console.log('Close the database connection.');
});
