# TN vs WU/SC Container Height Comparison

## INVESTIGATION RESULTS

### 1. WU/SC Card Container Styling

**Location:** `public/styles.css` (lines 145-154)

**CSS:**
```css
.card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;  /* ← COMPACT PADDING */
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}
```

**Heading Spacing:**
```css
.card h2 {
  margin-top: 0;
  margin-bottom: 1rem;  /* ← STANDARD SPACING */
}

.card h3 {
  margin-top: 0;
  margin-bottom: 6px;  /* ← COMPACT SPACING */
}
```

**Key Characteristics:**
- ✅ **Padding:** `1.5rem` (compact)
- ✅ **h2 margin-bottom:** `1rem`
- ✅ **h3 margin-bottom:** `6px`

---

### 2. TN Card Container Styling

**Location:** `public/css/tn_legacy.css` (lines 24-32)

**CSS:**
```css
#tnScope .card {
  max-width: 1000px;
  width: 90%;
  margin: 2rem auto;
  padding: 2rem;  /* ← MORE PADDING (taller) */
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

**Heading Spacing:**
```css
#tnScope h2, 
#tnScope h3 {
  margin-bottom: -8px;  /* ← NEGATIVE MARGIN (more compact) */
  color: var(--theme-primary-dark, #c79100);
}
```

**Key Characteristics:**
- ❌ **Padding:** `2rem` (more padding = taller container)
- ✅ **h2/h3 margin-bottom:** `-8px` (negative margin, more compact)

---

### 3. HEIGHT DIFFERENCES

| Property | WU/SC | TN | Difference |
|----------|-------|-----|------------|
| **Card padding** | `1.5rem` | `2rem` | ❌ **TN has 0.5rem more padding** (taller) |
| **Card h2 margin-bottom** | `1rem` | `-8px` | ⚠️ Different (TN more compact) |
| **Card h3 margin-bottom** | `6px` | `-8px` | ⚠️ Different (TN more compact) |
| **Card margin** | None (default) | `2rem auto` | ⚠️ Different (TN has top/bottom margin) |

---

### 4. THE PROBLEM

**TN container is taller because:**
1. **Card padding:** `2rem` vs WU/SC's `1.5rem`
   - **Difference:** `0.5rem` more padding on all sides
   - **Total height increase:** `1rem` (0.5rem top + 0.5rem bottom)
   - This makes the container noticeably taller

2. **Card margin:** TN has `margin: 2rem auto` (adds vertical space)
   - WU/SC has no margin on `.card` (uses default/inherited)

**TN headings are more compact:**
- TN uses `margin-bottom: -8px` (negative margin)
- WU/SC uses `margin-bottom: 1rem` for h2 and `6px` for h3
- This doesn't affect container height, but affects internal spacing

---

### 5. THE FIX

To make TN container match WU/SC height exactly:

#### Change 1: Reduce card padding

**Location:** `public/css/tn_legacy.css` (line 28)

```css
/* BEFORE: */
#tnScope .card {
  padding: 2rem;  /* ← TOO MUCH */
  ...
}

/* AFTER: */
#tnScope .card {
  padding: 1.5rem;  /* ← MATCH WU/SC */
  ...
}
```

#### Change 2: Remove or reduce card margin (optional)

**Location:** `public/css/tn_legacy.css` (line 27)

```css
/* BEFORE: */
#tnScope .card {
  margin: 2rem auto;  /* ← ADDS VERTICAL SPACE */
  ...
}

/* AFTER (match WU/SC - no margin): */
#tnScope .card {
  margin: 0 auto;  /* ← REMOVE TOP/BOTTOM MARGIN */
  ...
}
```

Or if margin is needed for spacing:
```css
margin: 0 auto;  /* Only horizontal centering, no vertical margin */
```

---

### 6. RECOMMENDATION

**Primary Fix:** Change card padding from `2rem` to `1.5rem`
- This is the main cause of the height difference
- Will make TN container match WU/SC height exactly

**Secondary Fix (Optional):** Remove top/bottom margin
- Change `margin: 2rem auto` to `margin: 0 auto`
- Only if you want to match WU/SC exactly (no vertical margin)

**Files to modify:**
- `public/css/tn_legacy.css` - `#tnScope .card` (lines 27-28)

**Changes required:**
1. `padding: 2rem` → `padding: 1.5rem`
2. `margin: 2rem auto` → `margin: 0 auto` (optional)

---

## SUMMARY

**WU/SC Container:**
- Padding: `1.5rem` (compact)
- Margin: None (default)
- Result: **More compact height**

**TN Container (Current):**
- Padding: `2rem` (more padding)
- Margin: `2rem auto` (adds vertical space)
- Result: **Taller container**

**Fix:**
- Reduce padding to `1.5rem` to match WU/SC
- Remove top/bottom margin (optional) to match WU/SC exactly


