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

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Helper function to escape JavaScript string values
// Uses JSON.stringify to properly escape all special characters
function escapeJsString(str) {
  if (!str) return '';
  // Use JSON.stringify which handles all escaping correctly
  // Then remove the surrounding quotes since we'll add them ourselves
  return JSON.stringify(str).slice(1, -1);
}

// Replace values in env.js with properly escaped strings
const escapedUrl = escapeJsString(supabaseUrl || 'https://your-project.supabase.co');
const escapedKey = escapeJsString(supabaseKey || 'your-anon-key-here');

envJs = envJs.replace(
  /SUPABASE_URL:\s*"[^"]*"/,
  `SUPABASE_URL: "${escapedUrl}"`
);

envJs = envJs.replace(
  /SUPABASE_ANON_KEY:\s*"[^"]*"/,
  `SUPABASE_ANON_KEY: "${escapedKey}"`
);

// Handle SENTRY_DSN (can be null or a string)
if (sentryDsn && sentryDsn !== 'null' && sentryDsn !== '') {
  const escapedDsn = escapeJsString(sentryDsn);
  envJs = envJs.replace(
    /SENTRY_DSN:\s*(null|"[^"]*")/,
    `SENTRY_DSN: "${escapedDsn}"`
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

