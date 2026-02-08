const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'server/tasks.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run("ALTER TABLE tasks ADD COLUMN is_pinned INTEGER DEFAULT 0", (err) => {
        if (err && !err.message.includes('duplicate column')) console.error("Error adding is_pinned:", err);
        else console.log("Column 'is_pinned' checked/added.");
    });

    db.run("ALTER TABLE tasks ADD COLUMN is_archived INTEGER DEFAULT 0", (err) => {
        if (err && !err.message.includes('duplicate column')) console.error("Error adding is_archived:", err);
        else console.log("Column 'is_archived' checked/added.");
    });
});

db.close();
