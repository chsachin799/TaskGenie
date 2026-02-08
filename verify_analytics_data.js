const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server/tasks.db');
const db = new sqlite3.Database(dbPath);

console.log("Checking for completed tasks...");
db.all("SELECT id, description, status, completed_at FROM tasks WHERE status = 'completed'", (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    if (rows.length === 0) {
        console.log("No completed tasks found.");
    } else {
        console.log(`Found ${rows.length} completed tasks.`);
        rows.forEach(r => {
            console.log(`Task ${r.id}: ${r.description} | Completed At: ${r.completed_at}`);
            if (!r.completed_at) console.error(`ERROR: Task ${r.id} is completed but has no timestamp!`);
        });
    }

    db.close();
});
