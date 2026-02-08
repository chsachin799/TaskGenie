const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server/tasks.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Add completed_at column to tasks table
    db.run(`ALTER TABLE tasks ADD COLUMN completed_at DATETIME`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log("Column completed_at already exists.");
            } else {
                console.error("Error adding column:", err);
            }
        } else {
            console.log("Column completed_at added successfully.");
        }
    });
});

db.close();
