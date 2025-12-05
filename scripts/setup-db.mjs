// Database Setup Script - Creates tables in Supabase
// Run with: node scripts/setup-db.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually
const envPath = resolve(__dirname, '../.env.local');
const envContent = readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
        env[key.trim()] = valueParts.join('=').trim();
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
}

console.log('🔌 Connecting to Supabase...');
console.log('   URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection by trying to query users table
console.log('\n📊 Checking database tables...\n');

const { data, error } = await supabase.from('users').select('id').limit(1);

if (error && error.code === '42P01') {
    console.log('⚠️  Tables do not exist yet.\n');
    console.log('Unfortunately, Supabase REST API cannot execute DDL (CREATE TABLE) statements.');
    console.log('You need to run the SQL schema in the Supabase Dashboard.\n');

    // Extract project ref from URL
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (projectRef) {
        console.log('📝 Quick setup:');
        console.log(`   1. Open: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
        console.log('   2. Paste the SQL from: lib/supabase/schema.sql');
        console.log('   3. Click "Run"\n');
    }
    process.exit(1);
} else if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
} else {
    console.log('✅ Users table exists!');

    // Check trades table
    const { error: tradesError } = await supabase.from('trades').select('id').limit(1);
    if (tradesError && tradesError.code === '42P01') {
        console.log('⚠️  Trades table missing (optional)');
    } else if (!tradesError) {
        console.log('✅ Trades table exists!');
    }

    // Count users
    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
    console.log(`\n👤 Total users: ${count || 0}`);
    console.log('\n🎉 Database is ready!');
}
