// One-time backfill: regenerate each user's referral_code from their
// display_name (name → CAPS code). Mirrors deriveReferralCode in hooks/useUser.
//
// Dry-run by default (prints what it WOULD do). To actually write:
//   node scripts/backfill-referral-codes.mjs --apply
//
// Notes:
//  - Source name is display_name, falling back to username. Only users whose
//    name yields ≥3 alphanumerics are touched.
//  - referral_code is UNIQUE: when two names collapse to the same code, the
//    earliest-created user keeps it; later ones are reported as conflicts and
//    left unchanged (rename them in-app to resolve).

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes('--apply');

// Load .env.local manually (same approach as setup-db.mjs).
const envContent = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach((line) => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or a Supabase key in .env.local');
    process.exit(1);
}

// Keep in sync with deriveReferralCode in hooks/useUser.tsx.
const deriveReferralCode = (name) =>
    (name || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .slice(0, 20);

const supabase = createClient(supabaseUrl, supabaseKey);

console.log(`\n🔌 ${supabaseUrl}`);
console.log(APPLY ? '⚠️  APPLY mode — writing changes\n' : 'ℹ️  DRY-RUN — no writes (pass --apply to commit)\n');

const { data: users, error } = await supabase
    .from('users')
    .select('id, display_name, username, referral_code, created_at')
    .order('created_at', { ascending: true });

if (error) {
    console.error('❌ Failed to load users:', error.message);
    process.exit(1);
}

// Codes already taken by users we WON'T touch (no usable name) so derived
// codes never collide with an existing untouched code.
const claimed = new Set();
const toProcess = [];
for (const u of users) {
    const sourceName = u.display_name || u.username || '';
    const code = deriveReferralCode(sourceName);
    if (code.length < 3) {
        if (u.referral_code) claimed.add(u.referral_code.toLowerCase());
    } else {
        toProcess.push({ ...u, sourceName, code });
    }
}

let updated = 0;
let unchanged = 0;
const conflicts = [];

for (const u of toProcess) {
    if (claimed.has(u.code)) {
        conflicts.push(u);
        continue;
    }
    claimed.add(u.code);
    if ((u.referral_code || '').toLowerCase() === u.code) {
        unchanged++;
        continue;
    }
    console.log(`  ${u.sourceName}  →  ${u.code.toUpperCase()}   (was ${u.referral_code || '∅'})`);
    if (APPLY) {
        const { error: upErr } = await supabase
            .from('users')
            .update({ referral_code: u.code, updated_at: new Date().toISOString() })
            .eq('id', u.id);
        if (upErr) {
            console.error(`    -- failed: ${upErr.message}`);
            continue;
        }
    }
    updated++;
}

console.log('\n── summary ─────────────────────────────');
console.log(`  users with a usable name : ${toProcess.length}`);
console.log(`  ${APPLY ? 'updated' : 'would update'}        : ${updated}`);
console.log(`  already correct          : ${unchanged}`);
console.log(`  name conflicts (skipped) : ${conflicts.length}`);
for (const c of conflicts) {
    console.log(`     • "${c.sourceName}" → ${c.code.toUpperCase()} already taken; left as ${c.referral_code || '∅'}`);
}
if (!APPLY && updated > 0) console.log('\nRe-run with --apply to commit these changes.');
console.log('');
