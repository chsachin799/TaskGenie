const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'server/tasks.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run("ALTER TABLE tasks ADD COLUMN position INTEGER DEFAULT 0", (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log("Column 'position' already exists.");
            } else {
                console.error("Error adding position column:", err);
            }
        } else {
            console.log("Column 'position' added successfully.");
        }
    });
});

db.close();
