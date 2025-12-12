# Deployment Guide

Complete deployment guide for the SDBA Admin System registration forms application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Deployment Methods](#deployment-methods)
   - [Netlify](#netlify-deployment)
   - [Cloudflare Pages](#cloudflare-pages-deployment)
   - [Vercel](#vercel-deployment)
   - [Manual Deployment](#manual-deployment)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Rollback Procedure](#rollback-procedure)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

- **Git**: Version control (any recent version)
- **Node.js**: v16+ (for local development/testing only - not required for deployment)
- **Supabase Account**: For backend database and edge functions
- **Sentry Account** (optional): For error monitoring

### Required Accounts

- **Supabase Project**: Database and edge functions
- **Deployment Platform**: Netlify, Cloudflare Pages, or Vercel account
- **Sentry Project** (optional): Error monitoring

### Pre-Deployment Checklist

- [ ] Supabase project created and configured
- [ ] Database schema applied (see `db_schema/main.sql`)
- [ ] Edge function deployed (`supabase/functions/submit_registration`)
- [ ] Environment variables documented and ready
- [ ] All tests passing locally
- [ ] Code reviewed and approved

---

## Environment Variables

### Required Variables

The application requires the following environment variables to be configured:

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `SUPABASE_URL` | Supabase project URL | `https://your-project.supabase.co` | ✅ Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key | `your-anon-key-here` | ✅ Yes |
| `SENTRY_DSN` | Sentry DSN for error monitoring | `https://your-sentry-dsn` | ❌ Optional |

**Note:** This is a vanilla JavaScript application (not Next.js), so we use `SUPABASE_URL` and `SUPABASE_ANON_KEY` (not `NEXT_PUBLIC_*` prefixes). These variables are injected into `public/env.js` during build.

### Configuration Method

Environment variables are configured in `public/env.js`. This file is loaded before other JavaScript files and sets `window.ENV` object.

**Important Notes:**
- `public/env.js` is a **public file** - do not commit sensitive keys
- For production, use environment variable injection (see platform-specific instructions below)
- The file uses `window.ENV` object structure:
  ```javascript
  window.ENV = {
    SUPABASE_URL: "...",
    SUPABASE_ANON_KEY: "...",
    SENTRY_DSN: "..." // or null
  };
  ```
- Development mode is auto-detected based on hostname
- Some legacy code may reference `window.__SUPABASE_URL` and `window.__SUPABASE_ANON_KEY` - these are fallbacks for backward compatibility

### Environment Variable Injection

For production deployments, you should inject environment variables at build/deploy time rather than hardcoding them in `env.js`. See platform-specific instructions below.

---

## Deployment Methods

### Netlify Deployment

#### Option 1: Git Integration (Recommended)

1. **Connect Repository**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your Git repository
   - Select the `application-form` branch

2. **Configure Build Settings**
   ```
   Base directory: (leave empty)
   Build command: echo "No build needed - static site"
   Publish directory: public
   ```

3. **Set Environment Variables**
   - Go to Site settings → Environment variables
   - Add the following:
     ```
     SUPABASE_URL=https://xxxxx.supabase.co
     SUPABASE_ANON_KEY=eyJhbGci...
     SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx (optional)
     ```

4. **Use Existing Configuration Files**
   
   The project includes `netlify.toml` with:
   - Build command: `node scripts/inject-env.js` (injects environment variables)
   - Publish directory: `public`
   - Redirects configured for clean URLs
   - Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
   - Cache control settings
   
   The build script `scripts/inject-env.js` is already included and will automatically inject environment variables from Netlify's environment variable settings into `public/env.js` during build.

6. **Deploy**
   - Netlify will automatically deploy on push to `application-form` branch
   - Or manually trigger deploy from Netlify Dashboard

#### Option 2: Manual Deploy

1. **Prepare Files**
   ```bash
   # Ensure env.js has correct values
   # Or use build script to inject from environment variables
   ```

2. **Drag & Drop**
   - Go to Netlify Dashboard
   - Drag the `public/` folder to deploy
   - Or use Netlify CLI: `netlify deploy --prod --dir=public`

#### Post-Deploy Configuration

- [ ] Set custom domain (if applicable)
- [ ] Enable HTTPS (automatic with Netlify)
- [ ] Configure redirects (see `netlify.toml` above)
- [ ] Verify environment variables are set
- [ ] Test all form URLs

---

### Cloudflare Pages Deployment

#### Option 1: Git Integration (Recommended)

1. **Connect Repository**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Navigate to Pages → Create a project
   - Connect your Git repository
   - Select the `application-form` branch

2. **Configure Build Settings**
   ```
   Framework preset: None
   Build command: (leave empty or: echo "No build needed")
   Build output directory: public
   Root directory: (leave empty)
   ```

3. **Set Environment Variables**
   - Go to Settings → Environment variables
   - Add for Production:
     ```
     SUPABASE_URL=https://xxxxx.supabase.co
     SUPABASE_ANON_KEY=eyJhbGci...
     SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx (optional)
     ```

4. **Use Existing Configuration Files**
   
   The project includes:
   - `scripts/inject-env.js` - Build script to inject environment variables
   - `public/_redirects` - Redirects file for Cloudflare Pages
   
   Update build command in Cloudflare Pages settings:
   ```
   node scripts/inject-env.js
   ```
   
   The `public/_redirects` file is automatically used by Cloudflare Pages and includes:
   ```
   / /register.html 200
   /tn /register.html?e=tn 200
   /wu /register.html?e=wu 200
   /sc /register.html?e=sc 200
   ```

6. **Deploy**
   - Cloudflare Pages will automatically deploy on push
   - Or manually trigger from Dashboard

#### Option 2: Wrangler CLI

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Deploy
wrangler pages deploy public --project-name=sdba-forms
```

#### Post-Deploy Configuration

- [ ] Set custom domain (if applicable)
- [ ] Configure redirects
- [ ] Verify environment variables
- [ ] Test all form URLs

---

### Vercel Deployment

#### Option 1: Git Integration (Recommended)

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your Git repository
   - Select the `application-form` branch

2. **Configure Project Settings**
   - Framework Preset: Other
   - Root Directory: `./`
   - Build Command: `echo "No build needed"`
   - Output Directory: `public`
   - Install Command: (leave empty)

3. **Set Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add for Production:
     ```
     SUPABASE_URL=https://xxxxx.supabase.co
     SUPABASE_ANON_KEY=eyJhbGci...
     SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx (optional)
     ```

4. **Use Existing vercel.json**
   
   The project already includes `vercel.json` with:
   - Output directory: `public`
   - Redirects configured
   - Security headers
   - Cache control for JS files

5. **Use Existing Configuration Files**
   
   The project includes:
   - `scripts/inject-env.js` - Build script to inject environment variables
   - `vercel.json` - Already configured with output directory and redirects
   
   Update `vercel.json` to add build command (if not already present):
   ```json
   {
     "buildCommand": "node scripts/inject-env.js",
     "outputDirectory": "public"
   }
   ```
   
   The existing `vercel.json` already includes redirects and security headers.

6. **Deploy**
   - Vercel will automatically deploy on push
   - Or use Vercel CLI: `vercel --prod`

#### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

#### Post-Deploy Configuration

- [ ] Verify `vercel.json` settings
- [ ] Set custom domain (if applicable)
- [ ] Verify environment variables
- [ ] Test all form URLs

---

### Manual Deployment (FTP/SFTP)

#### Prerequisites

- FTP/SFTP client (FileZilla, Cyberduck, etc.)
- Server credentials
- SSH access (for SFTP)

#### Steps

1. **Prepare Files**
   ```bash
   # Ensure env.js has correct production values
   # Review all files in public/ directory
   ```

2. **Update env.js for Production**
   
   Edit `public/env.js`:
   ```javascript
   window.ENV = {
     SUPABASE_URL: "https://your-project.supabase.co",
     SUPABASE_ANON_KEY: "your-anon-key-here",
     SENTRY_DSN: "your-sentry-dsn-here" // or null
   };
   
   window.__DEV__ = false; // Force production mode
   ```

3. **Upload Files**
   - Connect to server via FTP/SFTP
   - Upload entire `public/` directory contents to web root
   - Ensure file permissions are correct (644 for files, 755 for directories)

4. **Verify File Structure**
   ```
   /public/
   ├── register.html
   ├── env.js
   ├── supabase_config.js
   ├── styles.css
   ├── css/
   ├── js/
   └── ...
   ```

5. **Configure Web Server**

   **Apache (.htaccess):**
   ```apache
   # Redirects
   RewriteEngine On
   RewriteRule ^$ /register.html [L]
   RewriteRule ^tn$ /register.html?e=tn [L]
   RewriteRule ^wu$ /register.html?e=wu [L]
   RewriteRule ^sc$ /register.html?e=sc [L]
   
   # Security headers
   Header set X-Content-Type-Options "nosniff"
   Header set X-Frame-Options "DENY"
   Header set X-XSS-Protection "1; mode=block"
   
   # Cache control for JS
   <FilesMatch "\.js$">
     Header set Cache-Control "public, max-age=0, must-revalidate"
   </FilesMatch>
   ```

   **Nginx:**
   ```nginx
   # Redirects
   location = / {
     return 200 /register.html;
   }
   location = /tn {
     return 200 /register.html?e=tn;
   }
   location = /wu {
     return 200 /register.html?e=wu;
   }
   location = /sc {
     return 200 /register.html?e=sc;
   }
   
   # Security headers
   add_header X-Content-Type-Options "nosniff" always;
   add_header X-Frame-Options "DENY" always;
   add_header X-XSS-Protection "1; mode=block" always;
   
   # Cache control for JS
   location ~* \.js$ {
     add_header Cache-Control "public, max-age=0, must-revalidate";
   }
   ```

6. **Test Deployment**
   - Visit your domain
   - Test all form URLs
   - Verify environment variables loaded correctly

---

## Post-Deployment Verification

### 1. Basic Functionality

- [ ] **Homepage loads**: Visit root URL, should show event picker
- [ ] **TN form loads**: Visit `/register.html?e=tn`
- [ ] **WU form loads**: Visit `/register.html?e=wu`
- [ ] **SC form loads**: Visit `/register.html?e=sc`
- [ ] **No console errors**: Check browser console for JavaScript errors
- [ ] **CSS loads**: Verify styles are applied correctly
- [ ] **Images/assets load**: Check Network tab for 404 errors

### 2. Environment Configuration

**Check in Browser Console:**
```javascript
// Should show production values
console.log('ENV:', window.ENV);
// Expected:
// {
//   SUPABASE_URL: "https://xxxxx.supabase.co",
//   SUPABASE_ANON_KEY: "eyJhbGci...",
//   SENTRY_DSN: "https://..." or null
// }

// Should be false on production
console.log('DEV mode:', window.__DEV__);
// Expected: false
```

### 3. Debug Gating Verification

**Critical Security Check:**
```javascript
// In production console - ALL should be false/undefined
({
  __DEV__: window.__DEV__,
  __DBG: typeof window.__DBG,
  __DBG_TN: typeof window.__DBG_TN,
  __DBG_WUSC: typeof window.__DBG_WUSC,
  fillWUSCAll: typeof window.fillWUSCAll
})

// Expected result:
// {
//   __DEV__: false,
//   __DBG: "undefined",
//   __DBG_TN: "undefined",
//   __DBG_WUSC: "undefined",
//   fillWUSCAll: "undefined"
// }
```

**⚠️ If ANY debug objects are defined, DO NOT PROCEED. Fix immediately.**

### 4. Form Submission Test

- [ ] **TN Form**: Complete minimal submission, verify success
- [ ] **WU Form**: Complete minimal submission, verify success
- [ ] **SC Form**: Complete minimal submission, verify success
- [ ] **Error handling**: Test with invalid data, verify error messages
- [ ] **Rate limiting**: Test multiple rapid submissions, verify rate limit works

### 5. API Connectivity

**Check Network Tab:**
- [ ] Supabase API calls succeed (200 status)
- [ ] Edge function calls succeed (200 status)
- [ ] No CORS errors
- [ ] No authentication errors

### 6. Error Monitoring

- [ ] **Sentry** (if configured): Verify errors are being sent
- [ ] **Console logs**: Verify minimal logging in production (only errors/warnings)

### 7. Performance

- [ ] **Page load time**: < 3 seconds on Fast 3G
- [ ] **First Contentful Paint**: < 1.5 seconds
- [ ] **Time to Interactive**: < 4 seconds
- [ ] **No memory leaks**: Check Performance tab

### 8. Security Headers

**Check Response Headers:**
```bash
curl -I https://your-domain.com/register.html
```

Should include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

---

## Rollback Procedure

### Quick Rollback (Git-based deployments)

#### Option 1: Revert via Git

```bash
# Revert the last commit
git checkout application-form
git revert HEAD
git push origin application-form

# Platform will automatically redeploy previous version
```

#### Option 2: Platform Dashboard

**Netlify:**
1. Go to Deployments
2. Find previous working deployment
3. Click "Publish deploy" → "Publish"

**Cloudflare Pages:**
1. Go to Deployments
2. Find previous working deployment
3. Click "Retry deployment" or "Rollback to this deployment"

**Vercel:**
1. Go to Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

#### Option 3: Force Push Previous Commit

```bash
# ⚠️ Use with caution - only if other methods fail
git checkout application-form
git reset --hard <previous-commit-hash>
git push origin application-form --force-with-lease
```

### Manual Rollback (FTP/SFTP)

1. **Backup Current Files**
   ```bash
   # Download current production files as backup
   ```

2. **Restore Previous Version**
   - Upload previous working version
   - Or restore from backup

3. **Verify Rollback**
   - Test all forms
   - Verify functionality restored

### Rollback Checklist

- [ ] Identify the issue clearly
- [ ] Determine if rollback is necessary (vs. hotfix)
- [ ] Backup current deployment
- [ ] Execute rollback
- [ ] Verify rollback successful
- [ ] Notify team
- [ ] Document the issue
- [ ] Create hotfix branch if needed

---

## Troubleshooting

### Issue: Environment Variables Not Loading

**Symptoms:**
- Forms not loading
- API calls failing
- Console errors about missing ENV variables
- `window.ENV` is undefined

**Solutions:**
1. **Check file exists**: Verify `public/env.js` exists and is accessible
   ```bash
   curl https://your-domain.com/env.js
   ```
2. **Verify environment variables**: Check environment variables are set in platform settings
   - Netlify: Site Settings → Environment Variables
   - Cloudflare: Pages → Settings → Environment Variables
   - Vercel: Project Settings → Environment Variables
3. **Check build script**: Verify build script (`scripts/inject-env.js`) ran successfully
   - Check deployment logs for build script output
   - Verify script has execute permissions
4. **Clear browser cache**: Clear browser cache and hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
5. **Check script order**: Verify `env.js` is loaded before other scripts in HTML
   ```html
   <script src="env.js"></script>  <!-- Must be first -->
   <script src="./js/logger.js"></script>
   ```
6. **Manual check**: Open browser console and check:
   ```javascript
   console.log(window.ENV);
   // Should show: { SUPABASE_URL: "...", SUPABASE_ANON_KEY: "..." }
   ```

### Issue: Forms Not Submitting

**Symptoms:**
- Submit button does nothing
- Network errors in console
- 401/403 errors
- "Network error" messages

**Solutions:**
1. **Check Supabase credentials**: Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
   ```javascript
   console.log(window.ENV.SUPABASE_URL);
   console.log(window.ENV.SUPABASE_ANON_KEY);
   ```
2. **Verify Edge Function**: Check Edge Function is deployed
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/submit_registration \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```
3. **Check CORS settings**: Verify CORS is configured in Edge Function
   - Check Edge Function code for CORS headers
   - Verify production domain is in allowed origins
4. **Review Edge Function logs**: Check Supabase Dashboard → Edge Functions → Logs
5. **Test endpoint directly**: Use curl or Postman to test Edge Function
6. **Check rate limiting**: Verify rate limiting isn't blocking requests
   - Check browser console for rate limit messages
   - Check localStorage for rate limit data
7. **Network tab**: Check Network tab in DevTools for request/response details

### Issue: Debug Helpers Visible in Production

**Symptoms:**
- `window.__DBG` is defined
- Debug functions available in console
- `window.__DEV__` is `true` on production

**Solutions:**
1. **Check DEV flag**: Verify `window.__DEV__` is `false` on production
   ```javascript
   console.log(window.__DEV__); // Should be false
   ```
2. **Verify hostname detection**: Check `env.js` hostname detection logic
   ```javascript
   window.__DEV__ = ['localhost', '127.0.0.1'].includes(location.hostname);
   ```
3. **Clear browser cache**: Clear browser cache and hard refresh
4. **Check deployment**: Verify correct branch is deployed
5. **Verify code**: Check all debug code is wrapped in `if (window.__DEV__)`
6. **Check HTML**: Verify no debug scripts loaded in production HTML

### Issue: CORS Errors

**Symptoms:**
- Network errors mentioning CORS
- "Access-Control-Allow-Origin" errors
- Requests blocked by browser
- Preflight OPTIONS requests failing

**Solutions:**
1. **Check Edge Function CORS**: Verify CORS headers in Edge Function
   ```typescript
   // Edge Function should include:
   headers: {
     'Access-Control-Allow-Origin': 'https://your-domain.com',
     'Access-Control-Allow-Methods': 'POST, OPTIONS',
     'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
   }
   ```
2. **Verify allowed origins**: Check production domain is in allowed origins
   - Check Edge Function environment variables
   - Check `CORS_ALLOW_ORIGINS` setting
3. **Check response headers**: Verify CORS headers in response
   ```bash
   curl -I -X OPTIONS https://your-project.supabase.co/functions/v1/submit_registration
   ```
4. **Review Supabase settings**: Check Supabase project CORS settings
5. **Test with curl**: Test CORS with curl to isolate browser issues
6. **Check Network tab**: Review Network tab for CORS-related errors

### Issue: Static Assets Not Loading

**Symptoms:**
- 404 errors for CSS/JS files
- Broken styles
- JavaScript errors
- "Failed to load resource" errors

**Solutions:**
1. **Verify file paths**: Check file paths are correct (case-sensitive)
   ```bash
   # Check if files exist
   curl https://your-domain.com/js/submit.js
   curl https://your-domain.com/css/theme.css
   ```
2. **Check deployment**: Verify all files uploaded correctly
   - Check deployment logs
   - Verify build output directory
3. **File permissions**: Check file permissions (644 for files, 755 for directories)
4. **Web server config**: Review web server configuration
   - Check `.htaccess` (Apache)
   - Check Nginx config
5. **Platform settings**: Verify platform build output directory setting
   - Netlify: Should be `public`
   - Cloudflare: Should be `public`
   - Vercel: Should be `public`
6. **Base path**: Check if base path is configured correctly
7. **Cache**: Clear CDN cache (if using CDN)

### Issue: Redirects Not Working

**Symptoms:**
- `/tn` doesn't redirect to form
- 404 errors on redirect URLs
- Redirects not configured

**Solutions:**
1. **Check platform config**: Verify redirect configuration
   - Netlify: Check `netlify.toml` or `_redirects` file
   - Cloudflare: Check `_redirects` file
   - Vercel: Check `vercel.json`
2. **Test redirects**: Test redirects with curl
   ```bash
   curl -I https://your-domain.com/tn
   # Should return 200 with Location header or serve register.html
   ```
3. **Manual deployment**: For manual deployment, check:
   - Apache: `.htaccess` file
   - Nginx: Server block configuration
4. **File location**: Verify redirect files are in correct location
   - `public/_redirects` for Cloudflare/Netlify
   - `netlify.toml` in root for Netlify
   - `vercel.json` in root for Vercel
5. **Redeploy**: Sometimes redirects need a redeploy to take effect

### Issue: API Connection Problems

**Symptoms:**
- "Network error" messages
- Timeout errors
- Connection refused errors
- Supabase connection fails

**Solutions:**
1. **Check Supabase status**: Verify Supabase is operational
   - Check Supabase status page
   - Check Supabase Dashboard
2. **Verify credentials**: Check Supabase URL and key are correct
   ```javascript
   console.log(window.ENV.SUPABASE_URL);
   // Should match your Supabase project URL
   ```
3. **Test connection**: Test Supabase connection directly
   ```javascript
   // In browser console
   fetch('https://your-project.supabase.co/rest/v1/', {
     headers: { 'apikey': window.ENV.SUPABASE_ANON_KEY }
   })
   ```
4. **Check network**: Verify network connectivity
   - Check firewall settings
   - Check proxy settings
   - Test from different network
5. **Review logs**: Check Supabase logs for connection issues
6. **Rate limiting**: Check if rate limiting is blocking requests

### Issue: Environment Variable Problems

**Symptoms:**
- Environment variables not set
- Wrong values in production
- Variables not injected during build

**Solutions:**
1. **Check platform settings**: Verify environment variables are set
   - Netlify: Site Settings → Environment Variables
   - Cloudflare: Pages → Settings → Environment Variables
   - Vercel: Project Settings → Environment Variables
2. **Check build script**: Verify build script runs and injects variables
   - Check deployment logs
   - Verify `scripts/inject-env.js` executed
3. **Verify file**: Check `public/env.js` has correct values after build
   ```bash
   # After deployment, check the file
   curl https://your-domain.com/env.js
   ```
4. **Redeploy**: Sometimes need to redeploy after setting variables
5. **Check scope**: Verify variables are set for correct environment (Production/Preview)
6. **Manual override**: For manual deployment, edit `public/env.js` directly

### How to Check Logs

#### Deployment Platform Logs

**Netlify:**
1. Go to Site Dashboard
2. Click "Deploys" tab
3. Click on specific deployment
4. View "Deploy log" and "Functions log"

**Cloudflare Pages:**
1. Go to Pages Dashboard
2. Select your project
3. Click "Deployments" tab
4. Click on specific deployment
5. View build logs

**Vercel:**
1. Go to Project Dashboard
2. Click "Deployments" tab
3. Click on specific deployment
4. View build logs and function logs

#### Supabase Logs

1. **Edge Function Logs:**
   - Go to Supabase Dashboard
   - Navigate to Edge Functions
   - Select function (e.g., `submit_registration`)
   - Click "Logs" tab
   - Filter by date/time

2. **Database Logs:**
   - Go to Supabase Dashboard
   - Navigate to Logs
   - Select log type (Postgres, API, etc.)
   - Filter by date/time

3. **API Logs:**
   - Go to Supabase Dashboard
   - Navigate to API → Logs
   - View API request/response logs

#### Browser Console Logs

1. Open browser DevTools (F12)
2. Go to Console tab
3. Filter by log level (Error, Warning, Info)
4. Check for JavaScript errors
5. Check Network tab for failed requests

#### Sentry Logs

1. Go to Sentry Dashboard
2. Select your project
3. View "Issues" for errors
4. View "Performance" for performance issues
5. Use search/filters to find specific errors

---

## Environment-Specific Configuration

### Development

- `window.__DEV__ = true` (auto-detected on localhost)
- Debug helpers available
- Verbose logging enabled
- No error monitoring (unless explicitly enabled)

### Staging

- `window.__DEV__ = false`
- Debug helpers disabled
- Error monitoring enabled
- May use separate Supabase project

### Production

- `window.__DEV__ = false`
- Debug helpers disabled
- Error monitoring enabled
- Production Supabase project
- All security headers enabled

---

## Maintenance

### Regular Checks

- [ ] Monitor error logs (Sentry, platform logs)
- [ ] Check form submission success rate
- [ ] Review performance metrics
- [ ] Update dependencies (if any)
- [ ] Review security headers
- [ ] Test forms after Supabase updates

### Updates

1. **Code Updates**
   - Make changes in feature branch
   - Test thoroughly
   - Merge to `application-form` branch
   - Platform auto-deploys

2. **Environment Variable Updates**
   - Update in platform settings
   - Redeploy (or wait for next deployment)
   - Verify changes took effect

3. **Database Updates**
   - Apply migrations to Supabase
   - Test thoroughly
   - Update documentation

---

## Production URLs & Access

### Deployment URLs

**Production URL:** `https://your-domain.com`  
**Staging URL:** `https://staging.your-domain.com` (if applicable)  
**Preview URLs:** Generated automatically for each PR/deployment

### Monitoring & Logs

#### Deployment Platform Logs

**Netlify:**
- **Dashboard**: https://app.netlify.com
- **Deployment Logs**: Site Dashboard → Deploys → [Deployment] → Deploy log
- **Function Logs**: Site Dashboard → Deploys → [Deployment] → Functions log
- **Real-time Logs**: Site Dashboard → Functions → [Function] → Logs

**Cloudflare Pages:**
- **Dashboard**: https://dash.cloudflare.com
- **Deployment Logs**: Pages → [Project] → Deployments → [Deployment] → Build log
- **Analytics**: Pages → [Project] → Analytics

**Vercel:**
- **Dashboard**: https://vercel.com/dashboard
- **Deployment Logs**: Project → Deployments → [Deployment] → Build logs
- **Function Logs**: Project → Deployments → [Deployment] → Function logs
- **Analytics**: Project → Analytics

#### Error Monitoring (Sentry)

- **Dashboard**: https://sentry.io/organizations/[org]/projects/[project]/
- **Issues**: View all errors and exceptions
- **Performance**: View performance metrics
- **Releases**: Track releases and deployments
- **Alerts**: Configure email/Slack alerts for errors

**Access Sentry:**
1. Go to https://sentry.io
2. Log in with your account
3. Select organization and project
4. View issues, performance, and releases

**Sentry Alerts:**
- Configure alerts for critical errors
- Set up email notifications
- Integrate with Slack for team notifications
- Set up alert rules for error rates

#### Supabase Monitoring

**Supabase Dashboard:**
- **URL**: https://supabase.com/dashboard/project/[project-id]
- **Database Logs**: Logs → Postgres Logs
- **API Logs**: Logs → API Logs
- **Edge Function Logs**: Edge Functions → [Function] → Logs
- **Database**: Table Editor, SQL Editor
- **Auth**: Authentication → Users

**Access Supabase:**
1. Go to https://supabase.com/dashboard
2. Log in with your account
3. Select your project
4. Navigate to relevant section (Logs, Database, Functions, etc.)

**Supabase Metrics:**
- Database performance metrics
- API request metrics
- Edge Function execution metrics
- Storage usage metrics

### Emergency Contact Procedures

#### Critical Issues

**If production is down or critical errors occur:**

1. **Immediate Actions:**
   - Check deployment platform status page
   - Check Supabase status page
   - Review error logs (Sentry, platform logs)
   - Check recent deployments

2. **Escalation:**
   - Contact development team lead
   - Contact DevOps/infrastructure team
   - Notify stakeholders

3. **Communication:**
   - Update status page (if available)
   - Notify users (if applicable)
   - Document issue and resolution

#### Contact Information

**Development Team:**
- **Slack Channel**: #sdba-forms-support
- **Email**: dev-team@example.com
- **On-Call**: Check on-call rotation schedule

**Infrastructure:**
- **Supabase Support**: https://supabase.com/support
- **Platform Support**:
  - Netlify: https://www.netlify.com/support/
  - Cloudflare: https://support.cloudflare.com/
  - Vercel: https://vercel.com/support

**Emergency Contacts:**
- **Team Lead**: [Name] - [Phone] - [Email]
- **DevOps**: [Name] - [Phone] - [Email]
- **Product Owner**: [Name] - [Phone] - [Email]

### Monitoring Checklist

**Daily Checks:**
- [ ] Check Sentry for new errors
- [ ] Review deployment logs for issues
- [ ] Check Supabase logs for errors
- [ ] Monitor form submission success rate

**Weekly Checks:**
- [ ] Review performance metrics
- [ ] Check error trends
- [ ] Review user feedback
- [ ] Check infrastructure costs

**Monthly Checks:**
- [ ] Review security logs
- [ ] Check for outdated dependencies
- [ ] Review and update documentation
- [ ] Performance optimization review

---

## Support

For deployment issues:
1. Check this documentation
2. Review `PRE_DEPLOYMENT_CHECKLIST.md`
3. Review `TESTING_CHECKLIST.md`
4. Check troubleshooting section above
5. Review platform-specific documentation
6. Check application logs (see "How to Check Logs" above)
7. Contact development team (see "Emergency Contact Procedures" above)

---

**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team  
**Version:** 1.0

---

## Quick Reference

### Environment Variables Summary

| Variable | Required | Description | Where to Get | Example |
|----------|----------|-------------|--------------|---------|
| `SUPABASE_URL` | ✅ Yes | Supabase project URL | Supabase Dashboard → Settings → API | `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | ✅ Yes | Supabase anonymous key | Supabase Dashboard → Settings → API | `your-anon-key-here` |
| `SENTRY_DSN` | ❌ Optional | Sentry error tracking DSN | Sentry Dashboard → Settings → Projects → Keys | `https://your-sentry-dsn` |

**Note:** Variable names do NOT use `NEXT_PUBLIC_` prefix (this is a vanilla JS app, not Next.js).

### Configuration Files

- `public/env.js` - Client-side environment configuration (public file)
- `env.example` - Example environment variables (reference only)
- `scripts/inject-env.js` - Build script to inject env vars into env.js
- `netlify.toml` - Netlify configuration
- `public/_redirects` - Cloudflare Pages redirects
- `vercel.json` - Vercel configuration

### Deployment Checklist

**Pre-Deployment:**
- [ ] Environment variables set in platform
- [ ] Database schema applied
- [ ] Edge function deployed
- [ ] Code reviewed and tested

**Deployment:**
- [ ] Connect Git repository
- [ ] Configure build settings
- [ ] Set environment variables
- [ ] Deploy

**Post-Deployment:**
- [ ] Verify all URLs load
- [ ] Test form submissions
- [ ] Verify debug gating (no debug helpers)
- [ ] Check error monitoring
- [ ] Test on mobile devices

