#!/usr/bin/env node
/**
 * Inject version number into HTML files for cache-busting
 * This ensures users always get the latest JavaScript files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Get version from package.json or use timestamp
const packageJson = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')
);
const version = packageJson.version || Date.now().toString();

// Generate a short hash from version + timestamp for better cache busting
const buildId = `${version}-${Date.now().toString(36)}`;

console.log(`📦 Injecting version ${buildId} into HTML files...`);

// List of HTML files to update
const htmlFiles = [
  path.join(rootDir, 'public', 'register.html'),
  path.join(rootDir, 'public', 'test-mobile.html')
];

htmlFiles.forEach(htmlFile => {
  if (!fs.existsSync(htmlFile)) {
    console.warn(`⚠️  File not found: ${htmlFile}`);
    return;
  }

  let content = fs.readFileSync(htmlFile, 'utf8');
  
  // Replace script src attributes to include version
  // Pattern: src="./js/filename.js" or src="filename.js" or src="./js/filename.js?v=old" -> src="...?v=BUILD_ID"
  // Handles all JS files including env.js, supabase_config.js, etc.
  content = content.replace(
    /src="([^"]+\.js)(\?v=[^"]*)?"/g,
    (match, filePath) => {
      // Skip external URLs (http/https)
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        return match;
      }
      return `src="${filePath}?v=${buildId}"`;
    }
  );
  
  // Also handle template fetches
  content = content.replace(
    /fetch\(['"](tn_templates\.html|wu_sc_templates\.html)(\?v=[^'"]*)?['"]\)/g,
    `fetch('$1?v=${buildId}')`
  );
  
  // Also handle CSS files (all CSS files, not just ./css/)
  content = content.replace(
    /href="([^"]+\.css)(\?v=[^"]*)?"/g,
    (match, filePath) => {
      // Skip external URLs (http/https)
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        return match;
      }
      return `href="${filePath}?v=${buildId}"`;
    }
  );
  
  fs.writeFileSync(htmlFile, content, 'utf8');
  console.log(`✅ Updated: ${path.basename(htmlFile)}`);
});

// Write version to a file for reference
const versionFile = path.join(rootDir, 'public', '.version');
fs.writeFileSync(versionFile, buildId, 'utf8');
console.log(`📝 Version written to: .version`);

console.log(`✨ Version injection complete!`);

