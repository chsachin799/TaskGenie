const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'server/tasks.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run("ALTER TABLE tasks ADD COLUMN notes TEXT", (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log("Column 'notes' already exists.");
            } else {
                console.error("Error adding notes column:", err);
            }
        } else {
            console.log("Column 'notes' added successfully.");
        }
    });
});

db.close();
