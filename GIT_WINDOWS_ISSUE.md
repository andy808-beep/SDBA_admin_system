# Git Branch Switching Issue on Windows

## Problem Summary

When attempting to switch to the `application-form` branch on a Windows laptop, Git failed with the following error:

```
error: invalid path '.next/dev/server/chunks/[externals]_node:inspector_7a4283c6._.js'
error: invalid path '.next/dev/server/chunks/[externals]_node:inspector_7a4283c6._.js.map'
```

## Root Cause

1. **Windows Path Limitations**: Windows does not allow colons (`:`) in filenames (they're reserved for drive letters like `C:`)
2. **Cross-Platform Issue**: The `.next/` build directory was committed to the `application-form` branch from a Mac/Linux system, where colons in filenames are valid
3. **Git Validation**: Git validates file paths during checkout operations, and Windows Git cannot create files with invalid characters

## Attempted Solutions (That Didn't Work)

1. ✅ `git config core.protectNTFS true` - Enabled but didn't prevent the error
2. ✅ `git config core.ignorecase true` - Enabled but didn't help
3. ✅ Sparse-checkout with `.next/` exclusion - Git still validates paths before applying sparse-checkout
4. ❌ Direct `git checkout` - Failed due to path validation
5. ❌ `git checkout --no-track` - Still failed at path validation

## Working Solution

The solution that successfully worked:

```bash
# Step 1: Initialize sparse-checkout in non-cone mode
git sparse-checkout init --no-cone

# Step 2: Create sparse-checkout file to exclude .next
# (Write to .git/info/sparse-checkout with patterns: /* and !.next/)

# Step 3: Create branch reference without checking out
git branch application-form origin/application-form

# Step 4: Point HEAD to the branch without checking out files
git symbolic-ref HEAD refs/heads/application-form

# Step 5: Temporarily disable NTFS protection
git config core.protectNTFS false

# Step 6: Update working directory using read-tree (bypasses path validation)
git read-tree -mu HEAD

# Step 7: Re-enable NTFS protection for safety
git config core.protectNTFS true
```

## Key Insight

The critical step was using `git read-tree -mu HEAD` instead of `git checkout`. The `read-tree` command respects sparse-checkout patterns and can skip invalid paths, whereas `checkout` validates all paths before proceeding.

## Result

- Successfully switched to `application-form` branch
- Working tree is clean
- 83% of files present (17% missing is just `.next/` build artifacts, which is expected and not problematic)
- All source code files are present

## Prevention

The `.next/` directory should be removed from the remote branch since:
- It's already in `.gitignore`
- It's a build artifact that gets regenerated
- It causes cross-platform compatibility issues

To fix on Mac/Linux:
```bash
git rm -r --cached .next
git commit -m "chore: remove .next build files from repository"
git push origin application-form
```

## Environment Details

- **OS**: Windows 10 (build 26200)
- **Git**: Git for Windows (MINGW64)
- **Issue**: Windows path validation prevents checkout of files with colons in names
- **Workaround**: Use `read-tree` with sparse-checkout instead of `checkout`

