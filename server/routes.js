const express = require('express');
const router = express.Router();
const db = require('./database');
const { processCommand } = require('./gemini');
const multer = require('multer');
const path = require('path');

// Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// GET /tasks - List all tasks
router.get('/tasks', (req, res) => {
    const sql = `
        SELECT tasks.*, 
            (SELECT COUNT(*) FROM subtasks WHERE task_id = tasks.id) as subtask_count,
            (SELECT COUNT(*) FROM subtasks WHERE task_id = tasks.id AND is_completed = 1) as subtask_done
        FROM tasks 
        WHERE is_archived = 0 AND deleted_at IS NULL
        ORDER BY is_pinned DESC, position ASC, created_at DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// GET /archives - List archived tasks
router.get('/archives', (req, res) => {
    const sql = `
        SELECT tasks.*, 
            (SELECT COUNT(*) FROM subtasks WHERE task_id = tasks.id) as subtask_count,
            (SELECT COUNT(*) FROM subtasks WHERE task_id = tasks.id AND is_completed = 1) as subtask_done
        FROM tasks 
        WHERE is_archived = 1
        ORDER BY created_at DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// POST /command - Process Voice Command
router.post('/command', async (req, res) => {
    const { text } = req.body;
    console.log(`[SERVER] Received command: "${text}"`); // DEBUG LOG

    if (!text) {
        return res.status(400).json({ error: "No voice command received" });
    }

    // 1. Process with Gemini
    const aiResult = await processCommand(text);
    console.log("[SERVER] AI Result:", JSON.stringify(aiResult, null, 2));

    // 2. Execute Intent
    if (aiResult.intent === 'add_task') {
        const { description, due_date, priority, category } = aiResult.task;
        const sql = `INSERT INTO tasks (description, due_date, priority, category) VALUES (?,?,?,?)`;

        db.run(sql, [description, due_date, priority, category], function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({
                ...aiResult,
                taskId: this.lastID
            });
        });
    } else if (aiResult.intent === 'delete_task') {
        // Logic for deletion (complex because we need to find WHICH task to delete)
        // For v1, we'll just return the response
        res.json(aiResult);
    } else {
        res.json(aiResult);
    }
});

// POST /tasks - Manual Add Task
router.post('/tasks', (req, res) => {
    const { description, due_date, priority, category } = req.body;
    const sql = `INSERT INTO tasks (description, due_date, priority, category) VALUES (?,?,?,?)`;

    db.run(sql, [description, due_date, priority || 'Medium', category || 'General'], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // Log Activity
        logActivity(this.lastID, "CREATE", `Created task: ${description}`);

        res.json({ id: this.lastID, message: "Manual override accepted." });
    });
});

// DELETE /tasks/:id - Delete Task (Soft or Hard)
router.delete('/tasks/:id', (req, res) => {
    const force = req.query.force === 'true';
    const id = req.params.id;

    if (force) {
        // Hard Delete
        const sql = "DELETE FROM tasks WHERE id = ?";
        db.run(sql, id, function (err) {
            if (err) return res.status(500).json({ error: err.message });
            logActivity(id, "DELETE_PERMANENT", "Task permanently deleted");
            res.json({ message: "Task permanently deleted.", deleted: this.changes });
        });
    } else {
        // Soft Delete
        const sql = "UPDATE tasks SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?";
        db.run(sql, id, function (err) {
            if (err) return res.status(500).json({ error: err.message });
            logActivity(id, "DELETE_SOFT", "Task moved to Recycle Bin");
            res.json({ message: "Task moved to Recycle Bin.", deleted: this.changes });
        });
    }
});

// POST /tasks/:id/restore - Restore from Trash
router.post('/tasks/:id/restore', (req, res) => {
    const sql = "UPDATE tasks SET deleted_at = NULL WHERE id = ?";
    db.run(sql, req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        logActivity(req.params.id, "RESTORE", "Task restored from Recycle Bin");
        res.json({ message: "Task restored." });
    });
});

// GET /recycle-bin - List deleted tasks
router.get('/recycle-bin', (req, res) => {
    const sql = "SELECT * FROM tasks WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

// --- Activity Log Helper ---
function logActivity(taskId, action, details) {
    const sql = "INSERT INTO activity_log (task_id, action, details) VALUES (?, ?, ?)";
    db.run(sql, [taskId, action, details], (err) => {
        if (err) console.error("Failed to log activity:", err);
    });
}


// --- Gamification Helper ---
function awardXP(amount) {
    console.log(`[GAMIFICATION] Awarding ${amount} XP`);
    db.get("SELECT xp, level FROM user_profile WHERE id = 1", (err, row) => {
        if (err) return console.error("[GAMIFICATION] Error fetching profile:", err);

        if (!row) {
            console.log("[GAMIFICATION] Creating new profile for id 1");
            let newXP = amount;
            let newLevel = Math.floor(newXP / 100) + 1;
            db.run("INSERT INTO user_profile (id, xp, level, rank_title) VALUES (1, ?, ?, 'Cadet')", [newXP, newLevel], (err) => {
                if (err) console.error("Failed to create profile", err);
            });
            return;
        }

        let newXP = row.xp + amount;
        let newLevel = Math.floor(newXP / 100) + 1;

        // Update
        db.run("UPDATE user_profile SET xp = ?, level = ? WHERE id = 1", [newXP, newLevel]);
    });
}

// PUT /tasks/:id - Update Task
router.put('/tasks/:id', (req, res) => {
    const { description, due_date, priority, category, status, recurrence_rule, notes, is_pinned, is_archived } = req.body;

    let fields = [];
    let values = [];

    if (description !== undefined) { fields.push("description = ?"); values.push(description); }
    if (due_date !== undefined) { fields.push("due_date = ?"); values.push(due_date); }
    if (priority !== undefined) { fields.push("priority = ?"); values.push(priority); }
    if (category !== undefined) { fields.push("category = ?"); values.push(category); }
    if (status !== undefined) { fields.push("status = ?"); values.push(status); }
    if (recurrence_rule !== undefined) { fields.push("recurrence_rule = ?"); values.push(recurrence_rule); }
    if (notes !== undefined) { fields.push("notes = ?"); values.push(notes); }
    if (is_pinned !== undefined) { fields.push("is_pinned = ?"); values.push(is_pinned); }
    if (is_archived !== undefined) { fields.push("is_archived = ?"); values.push(is_archived); }
    if (due_date !== undefined) { fields.push("due_date = ?"); values.push(due_date); }
    if (priority !== undefined) { fields.push("priority = ?"); values.push(priority); }
    if (category !== undefined) { fields.push("category = ?"); values.push(category); }
    if (recurrence_rule !== undefined) { fields.push("recurrence_rule = ?"); values.push(recurrence_rule); }
    if (status !== undefined) { fields.push("status = ?"); values.push(status); }
    if (req.body.requires_biometric !== undefined) { fields.push("requires_biometric = ?"); values.push(req.body.requires_biometric); }

    if (fields.length === 0) return res.status(400).json({ error: "No fields to update" });

    values.push(req.params.id);
    const sql = `UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`;

    db.run(sql, values, function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // Check for Recurrence Logic if task is completed
        if (status === 'completed') {
            db.get("SELECT * FROM tasks WHERE id = ?", [req.params.id], (err, task) => {
                if (!task || !task.recurrence_rule || task.recurrence_rule === 'None') {
                    // Non-recurring completion XP
                    let xp = task.priority === 'High' ? 50 : (task.priority === 'Medium' ? 30 : 10);
                    console.log(`[GAMIFICATION] Task completed (No Recurrence). Priority: ${task.priority}, XP: ${xp}`);
                    awardXP(xp);

                    // Set completed_at
                    db.run("UPDATE tasks SET completed_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id]);

                    return res.json({ message: "Task updated.", changes: this.changes, xpEarned: xp });
                }

                // Calculate next date
                let nextDate = new Date();
                if (task.due_date) nextDate = new Date(task.due_date);

                if (task.recurrence_rule === 'Daily') nextDate.setDate(nextDate.getDate() + 1);
                else if (task.recurrence_rule === 'Weekly') nextDate.setDate(nextDate.getDate() + 7);
                else if (task.recurrence_rule === 'Monthly') nextDate.setMonth(nextDate.getMonth() + 1);

                // Format: YYYY-MM-DD HH:MM
                const nextDateStr = nextDate.toISOString().slice(0, 16).replace('T', ' ');

                // Create Next Task
                const insertSql = `INSERT INTO tasks (description, due_date, priority, category, recurrence_rule) VALUES (?,?,?,?,?)`;
                db.run(insertSql, [task.description, nextDateStr, task.priority, task.category, task.recurrence_rule], (err) => {
                    if (err) console.error("Failed to create recurring task", err);

                    // Recurring completion XP
                    let xp = task.priority === 'High' ? 50 : (task.priority === 'Medium' ? 30 : 10);
                    awardXP(xp);

                    // Update completed_at for historical record (though original task is effectively "done" by recreating)
                    db.run("UPDATE tasks SET completed_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id]);

                    res.json({ message: "Task completed. Next occurrence created.", changes: this.changes, nextTask: true, xpEarned: xp });
                });
            });
        } else {
            // Log Activity for general updates
            logActivity(req.params.id, "UPDATE", "Task updated details");
            res.json({ message: "Task updated.", changes: this.changes });
        }
    });
});

// --- Reorder Tasks ---
router.put('/tasks/reorder', (req, res) => {
    // Expect body: { updates: [{id: 1, position: 0}, {id: 2, position: 1}] }
    const { updates } = req.body;
    if (!updates || !Array.isArray(updates)) {
        return res.status(400).json({ error: "Invalid updates format" });
    }

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        const stmt = db.prepare("UPDATE tasks SET position = ? WHERE id = ?");

        updates.forEach(u => {
            stmt.run(u.position, u.id);
        });

        stmt.finalize();
        db.run("COMMIT", (err) => {
            if (err) {
                console.error("Reorder commit failed", err);
                return res.status(500).json({ error: "Reorder failed" });
            }
            res.json({ message: "Tasks reordered" });
        });
    });
});


// POST /tasks/:id/duplicate - Duplicate Task
router.post('/tasks/:id/duplicate', (req, res) => {
    const id = req.params.id;
    db.get("SELECT * FROM tasks WHERE id = ?", [id], (err, task) => {
        if (err || !task) return res.status(404).json({ error: "Task not found" });

        const sql = `INSERT INTO tasks (description, due_date, priority, category, recurrence_rule, notes, is_pinned, is_archived) VALUES (?,?,?,?,?,?,?,?)`;
        const newDesc = `${task.description} (Copy)`;

        db.run(sql, [newDesc, task.due_date, task.priority, task.category, task.recurrence_rule, task.notes, task.is_pinned, task.is_archived], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Task duplicated", id: this.lastID });
        });
    });
});

// GET /insights - AI Strategic Report
router.get('/insights', (req, res) => {
    const sql = "SELECT * FROM tasks WHERE status != 'completed'"; // Assuming 'status' column exists, if not use all
    // Fallback if status doesn't exist yet, we stick to existing schema
    const safeSql = "SELECT * FROM tasks";

    db.all(safeSql, [], async (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const { generateInsights } = require('./gemini');
        const insightText = await generateInsights(rows);
        res.json({ insight: insightText });
    });
});

// GET /profile
router.get('/profile', (req, res) => {
    db.get("SELECT * FROM user_profile WHERE id = 1", (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || { xp: 0, level: 1, rank_title: 'Cadet' });
    });
});

// GET /user/prefs
router.get('/user/prefs', (req, res) => {
    db.get("SELECT * FROM user_prefs WHERE id = 1", (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || { theme: 'cyber', sound_enabled: 1 });
    });
});

// PUT /user/prefs
router.put('/user/prefs', (req, res) => {
    const { theme, sound_enabled } = req.body;
    let fields = [];
    let values = [];

    if (theme !== undefined) { fields.push("theme = ?"); values.push(theme); }
    if (sound_enabled !== undefined) { fields.push("sound_enabled = ?"); values.push(sound_enabled); }

    if (fields.length === 0) return res.status(400).json({ error: "No fields" });

    // Check if exists first (should, but safety)
    db.get("SELECT id FROM user_prefs WHERE id = 1", (err, row) => {
        if (!row) {
            db.run("INSERT INTO user_prefs (id, theme, sound_enabled) VALUES (1, 'cyber', 1)", (err) => {
                // Then update
                values.push(1);
                const sql = `UPDATE user_prefs SET ${fields.join(", ")} WHERE id = ?`;
                db.run(sql, values, (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ message: "Prefs updated" });
                });
            });
        } else {
            values.push(1);
            const sql = `UPDATE user_prefs SET ${fields.join(", ")} WHERE id = ?`;
            db.run(sql, values, (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Prefs updated" });
            });
        }
    });
});

// --- Subtasks API ---

// GET /tasks/:id/subtasks
router.get('/tasks/:id/subtasks', (req, res) => {
    const sql = "SELECT * FROM subtasks WHERE task_id = ?";
    db.all(sql, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

// POST /subtasks
router.post('/subtasks', (req, res) => {
    const { task_id, description } = req.body;
    const sql = "INSERT INTO subtasks (task_id, description) VALUES (?, ?)";
    db.run(sql, [task_id, description], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: "Subtask added" });
    });
});

// PUT /subtasks/:id (Toggle completion)
router.put('/subtasks/:id', (req, res) => {
    const { is_completed, description } = req.body;
    let sql = "";
    let params = [];

    if (description) {
        sql = "UPDATE subtasks SET description = ? WHERE id = ?";
        params = [description, req.params.id];
    } else {
        sql = "UPDATE subtasks SET is_completed = ? WHERE id = ?";
        params = [is_completed, req.params.id];
    }

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });

        if (!description && is_completed) {
            awardXP(5); // 5 XP for subtask
        }

        res.json({ message: "Subtask updated" });
    });
});

// DELETE /subtasks/:id
router.delete('/subtasks/:id', (req, res) => {
    const sql = "DELETE FROM subtasks WHERE id = ?";
    db.run(sql, req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Subtask deleted" });
    });
});

// --- Dependencies API ---

// GET /tasks/:id/dependencies
router.get('/tasks/:id/dependencies', (req, res) => {
    // Return tasks that describe the blockers
    const sql = `
        SELECT task_dependencies.id as link_id, tasks.* 
        FROM task_dependencies 
        JOIN tasks ON task_dependencies.blocker_id = tasks.id 
        WHERE task_dependencies.task_id = ?
    `;
    db.all(sql, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

// POST /dependencies
router.post('/dependencies', (req, res) => {
    const { task_id, blocker_id } = req.body;
    if (task_id == blocker_id) return res.status(400).json({ error: "Cannot block self" });

    const sql = "INSERT INTO task_dependencies (task_id, blocker_id) VALUES (?, ?)";
    db.run(sql, [task_id, blocker_id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: "Dependency added" });
    });
});

// DELETE /dependencies/:id
router.delete('/dependencies/:id', (req, res) => {
    const sql = "DELETE FROM task_dependencies WHERE id = ?";
    db.run(sql, req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Dependency removed" });
    });
});

// --- Attachments ---
router.post('/tasks/:id/attachments', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const taskId = req.params.id;
    const filename = req.file.filename;
    const originalName = req.file.originalname;
    const filePath = `/uploads/${filename}`;

    db.run("INSERT INTO attachments (task_id, filename, path, original_name) VALUES (?, ?, ?, ?)",
        [taskId, filename, filePath, originalName],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "File uploaded", id: this.lastID, path: filePath, original_name: originalName });
        }
    );
});

router.get('/tasks/:id/attachments', (req, res) => {
    db.all("SELECT * FROM attachments WHERE task_id = ?", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

router.delete('/attachments/:id', (req, res) => {
    // Note: In real app, delete file from disk too
    db.run("DELETE FROM attachments WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Attachment deleted" });
    });
});

// --- Comments API ---
router.get('/tasks/:id/comments', (req, res) => {
    const sql = "SELECT * FROM task_comments WHERE task_id = ? ORDER BY created_at ASC";
    db.all(sql, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

router.post('/tasks/:id/comments', (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Content required" });

    const sql = "INSERT INTO task_comments (task_id, content) VALUES (?, ?)";
    db.run(sql, [req.params.id, content], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        logActivity(req.params.id, "COMMENT", "Added a comment");
        res.json({ id: this.lastID, message: "Comment added" });
    });
});

// --- Activity Log API ---
router.get('/tasks/:id/activity', (req, res) => {
    const sql = "SELECT * FROM activity_log WHERE task_id = ? ORDER BY created_at DESC";
    db.all(sql, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

// --- Biometric Mock ---
router.post('/biometric/verify', (req, res) => {
    // Mock verification - always success for demo
    // In real app, this would check voiceprint/fingerprint
    setTimeout(() => {
        res.json({ verified: true, message: "Identity Confirmed" });
    }, 1500);
});

// --- Legacy Protocol (Poem) ---
router.get('/legacy/poem', async (req, res) => {
    const sql = "SELECT description FROM tasks WHERE status = 'completed' ORDER BY completed_at DESC LIMIT 5";
    db.all(sql, [], async (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        if (rows.length === 0) return res.json({ poem: "No deeds recorded yet.\nThe void awaits your command." });

        const tasks = rows.map(r => r.description).join(", ");
        const poem = `Systems online, logic verified.\n${rows.length} cycles completed, errors denied.\nFrom ${rows[0].description} to the start,\nOptimized efficiency, state-of-the-art.`; // Mock for speed
        res.json({ poem: poem });
    });
});

// --- Shareable Links ---
router.post('/tasks/:id/share', (req, res) => {
    // Generate simple hash
    const hash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const sql = "UPDATE tasks SET public_hash = ? WHERE id = ?";
    db.run(sql, [hash, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ hash: hash, url: `http://localhost:3000/shared/${hash}` });
    });
});

router.get('/shared/:hash', (req, res) => {
    const sql = "SELECT * FROM tasks WHERE public_hash = ?";
    db.get(sql, [req.params.hash], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Link expired or invalid" });
        res.json({ task: row });
    });
});

module.exports = router;
