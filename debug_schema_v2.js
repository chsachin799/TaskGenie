const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server/tasks.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.all("PRAGMA table_info(tasks)", (err, rows) => {
        if (err) console.error("Error fetching tasks info:", err);
        else {
            console.log("Tasks Table Columns:");
            rows.forEach(r => console.log(` - ${r.name} (${r.type})`));
        }
    });

    db.all("PRAGMA table_info(activity_log)", (err, rows) => {
        if (err) console.error("Error fetching activity_log info:", err);
        else {
            if (rows.length === 0) console.log("activity_log table DOES NOT EXIST.");
            else {
                console.log("Activity Log Table Columns:");
                rows.forEach(r => console.log(` - ${r.name} (${r.type})`));
            }
        }
    });
});

db.close();
