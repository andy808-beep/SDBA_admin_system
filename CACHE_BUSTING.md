# Cache-Busting Implementation

## Overview

This project uses automatic version injection to prevent browser caching issues. Every time you deploy, JavaScript and CSS files get unique version query parameters, ensuring users always get the latest code.

## How It Works

1. **Build Script**: The `scripts/inject-version.js` script runs during deployment
2. **Version Generation**: Creates a unique build ID from `package.json` version + timestamp
3. **HTML Injection**: Automatically adds `?v=BUILD_ID` to all JavaScript, CSS, and template file references
4. **Cache Headers**: Deployment configs set aggressive caching for versioned files

## Files Modified

- `scripts/inject-version.js` - Version injection script
- `netlify.toml` - Updated build command and cache headers
- `vercel.json` - Updated build command and cache headers
- `package.json` - Added build script

## Deployment

### Automatic (Recommended)

The version injection happens automatically during deployment:

- **Netlify**: Runs `node scripts/inject-env.js && node scripts/inject-version.js` on build
- **Vercel**: Same build command configured

### Manual (For Testing)

To test locally or manually inject versions:

```bash
npm run build
# or
node scripts/inject-env.js && node scripts/inject-version.js
```

## Version Format

Versions follow this format: `{package.json version}-{timestamp hash}`

Example: `1.0.0-mj5ktfzu`

- The version part comes from `package.json`
- The hash ensures uniqueness even if version doesn't change
- Each deployment gets a new unique ID

## What Gets Versioned

- All JavaScript files (`./js/*.js`, `./supabase_config.js`)
- All CSS files (`./css/*.css`)
- Template files (`tn_templates.html`, `wu_sc_templates.html`)

## Cache Strategy

- **Versioned files** (JS/CSS with `?v=...`): Cached for 1 year (`max-age=31536000, immutable`)
- **HTML files**: Short cache (5 minutes) to ensure version updates are picked up
- **Unversioned files**: No cache

## Benefits

1. **No More Cache Issues**: Users automatically get latest code without hard refresh
2. **Better Performance**: Versioned files can be cached aggressively
3. **Easy Updates**: Just deploy - version injection happens automatically
4. **Version Tracking**: `.version` file stores current build ID

## Troubleshooting

### Users Still See Old Code

1. Check that build script ran: Look for version query parameters in HTML
2. Verify deployment: Check `.version` file in public directory
3. Clear CDN cache: If using Netlify/Vercel, purge cache in dashboard

### Version Not Updating

1. Ensure `package.json` version is updated (optional but recommended)
2. Check build logs for version injection script output
3. Verify `scripts/inject-version.js` is executable

## Updating Version

To update the version number (optional):

1. Edit `package.json` and increment the `version` field
2. Commit and push
3. Deploy - new version will be used automatically

Example:
```json
{
  "version": "1.0.1"  // Changed from 1.0.0
}
```

## Notes

- The timestamp hash ensures uniqueness even if version doesn't change
- Version injection is idempotent - safe to run multiple times
- Old versions are automatically replaced with new ones
- The `.version` file is for reference only and can be gitignored

