const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const migrations = [
    'migrate_phase2.js',
    'migrate_gamification.js',
    'migrate_analytics.js',
    'migrate_position.js',
    'migrate_pin_archive.js',
    'migrate_notes.js',
    'migrate_attachments.js',
    'migrate_soft_delete.js',
    'migrate_phase4.js'
];

console.log("🚀 STARTING ALL MIGRATIONS...");

migrations.forEach(script => {
    if (fs.existsSync(script)) {
        console.log(`\n--- Running ${script} ---`);
        try {
            execSync(`node ${script}`, { stdio: 'inherit' });
            console.log(`✅ ${script} completed.`);
        } catch (e) {
            console.error(`❌ ${script} failed:`, e.message);
            // Don't exit, try next? Or exit? safely try next as some might be idempotent
        }
    } else {
        console.warn(`⚠️ ${script} not found.`);
    }
});

console.log("\n✨ ALL MIGRATIONS FINISHED.");
