const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server/tasks.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("--- Tables ---");
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) console.error(err);
        else console.log(tables);

        console.log("\n--- Tasks Table Info ---");
        db.all("PRAGMA table_info(tasks)", (err, info) => {
            if (err) console.error(err);
            else console.log(info.map(c => c.name));
        });
    });
});
