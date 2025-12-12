#!/usr/bin/env node
/**
 * Environment Variable Injection Script
 * 
 * Injects environment variables from process.env into public/env.js
 * Used during build/deployment to set production values.
 * 
 * Usage:
 *   node scripts/inject-env.js
 * 
 * Requires environment variables:
 *   - SUPABASE_URL
 *   - SUPABASE_ANON_KEY
 *   - SENTRY_DSN (optional)
 */

const fs = require('fs');
const path = require('path');

const envJsPath = path.join(__dirname, '../public/env.js');

if (!fs.existsSync(envJsPath)) {
  console.error('❌ Error: public/env.js not found');
  process.exit(1);
}

let envJs = fs.readFileSync(envJsPath, 'utf8');

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const sentryDsn = process.env.SENTRY_DSN || 'null';

// Validate required variables
if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Warning: SUPABASE_URL or SUPABASE_ANON_KEY not set');
  console.warn('   Using existing values in env.js');
}

// Replace values in env.js
envJs = envJs.replace(
  /SUPABASE_URL:\s*"[^"]*"/,
  `SUPABASE_URL: "${supabaseUrl || 'https://your-project.supabase.co'}"`
);

envJs = envJs.replace(
  /SUPABASE_ANON_KEY:\s*"[^"]*"/,
  `SUPABASE_ANON_KEY: "${supabaseKey || 'your-anon-key-here'}"`
);

// Handle SENTRY_DSN (can be null or a string)
if (sentryDsn && sentryDsn !== 'null' && sentryDsn !== '') {
  envJs = envJs.replace(
    /SENTRY_DSN:\s*(null|"[^"]*")/,
    `SENTRY_DSN: "${sentryDsn}"`
  );
} else {
  envJs = envJs.replace(
    /SENTRY_DSN:\s*(null|"[^"]*")/,
    'SENTRY_DSN: null'
  );
}

// Write updated file
fs.writeFileSync(envJsPath, envJs);

console.log('✅ Environment variables injected into env.js');
console.log(`   SUPABASE_URL: ${supabaseUrl ? '✓ Set' : '⚠️  Using placeholder'}`);
console.log(`   SUPABASE_ANON_KEY: ${supabaseKey ? '✓ Set' : '⚠️  Using placeholder'}`);
console.log(`   SENTRY_DSN: ${sentryDsn && sentryDsn !== 'null' ? '✓ Set' : '○ Not set (optional)'}`);

