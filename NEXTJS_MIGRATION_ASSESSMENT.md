# Next.js Migration Assessment

## Executive Summary

**Estimated Effort: 4-6 weeks (1 developer, full-time)**
**Complexity: High**
**Risk Level: Medium-High**

This assessment evaluates the effort required to migrate the current vanilla JavaScript forms system to Next.js.

---

## Current Architecture Overview

### Technology Stack
- **Frontend**: Vanilla JavaScript (ES6 modules), HTML5, CSS3
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel (static site)
- **State Management**: SessionStorage, LocalStorage
- **Routing**: Query parameters (`?e=tn|wu|sc`)

### Codebase Statistics
- **Total JavaScript**: ~10,748 lines
- **Largest Files**:
  - `tn_wizard.js`: 6,201 lines (complex multi-step wizard)
  - `wu_sc_wizard.js`: 1,330 lines (multi-step wizard)
  - `ui_bindings.js`: 870 lines (dynamic form builder)
- **Templates**: 2 HTML template files loaded dynamically
- **Modules**: 11 JavaScript modules with complex interdependencies

---

## Migration Complexity Breakdown

### 1. **Routing & Navigation** (Medium - 3-5 days)

**Current**: Query parameter-based routing (`register.html?e=tn`)
```javascript
// Current: event_bootstrap.js parses ?e= parameter
const urlParams = new URLSearchParams(window.location.search);
const eventShortRef = urlParams.get('e');
```

**Next.js**: File-based routing
```
app/
  register/
    [event]/
      page.tsx          // /register/tn, /register/wu, /register/sc
    page.tsx            // /register (event picker)
  success/
    page.tsx            // /register/success
```

**Work Required**:
- Convert query params to dynamic routes
- Update all internal navigation links
- Handle deep linking (step navigation)
- Preserve URL structure for SEO/bookmarks

**Challenges**:
- TN wizard has 5 steps with deep linking (`?step=4`)
- WU/SC wizard has 4 steps
- Success page uses query params for receipt data

---

### 2. **State Management** (High - 5-7 days)

**Current**: SessionStorage/LocalStorage with manual state management
```javascript
// Current: tn_practice_store.js
sessionStorage.setItem(`tn_practice_${teamKey}`, JSON.stringify(rows));
sessionStorage.setItem(`tn_team_name_${i}`, teamName);
```

**Next.js Options**:
1. **React Context + useReducer** (recommended for this use case)
2. **Zustand** (lightweight, simple API)
3. **Redux Toolkit** (overkill for this project)

**Work Required**:
- Create state management layer (Context/Store)
- Migrate all SessionStorage operations to React state
- Implement persistence layer (localStorage sync for form recovery)
- Handle state hydration on page load
- Manage complex nested state (teams, practice data, slot rankings)

**Challenges**:
- TN wizard stores practice data per team with complex structure
- Form state needs to persist across page refreshes
- Multi-step wizards need step state management
- Calendar selections stored in sessionStorage

**Estimated Components**:
- `useFormState` hook
- `usePracticeStore` hook (TN-specific)
- `useWizardState` hook (step navigation)
- State persistence utilities

---

### 3. **Component Architecture** (High - 7-10 days)

**Current**: Vanilla JS with DOM manipulation
```javascript
// Current: tn_wizard.js - 6,201 lines of imperative DOM code
function initStep1() {
  const container = document.getElementById('wizardMount');
  const template = document.getElementById('step1-template');
  const clone = template.content.cloneNode(true);
  container.appendChild(clone);
  // ... 200+ lines of event handlers and DOM manipulation
}
```

**Next.js**: React components with declarative UI
```tsx
// Next.js: Component-based
function Step1() {
  const [teamCount, setTeamCount] = useState(1);
  return (
    <div>
      <TeamCountSelector value={teamCount} onChange={setTeamCount} />
      {/* ... */}
    </div>
  );
}
```

**Work Required**:
- Break down `tn_wizard.js` (6,201 lines) into ~20-30 React components
- Break down `wu_sc_wizard.js` (1,330 lines) into ~10-15 components
- Convert HTML templates to React components
- Create reusable form components (Input, Select, Button)
- Build wizard step components with shared navigation
- Create calendar component (complex - TN practice booking)

**Component Breakdown Estimate**:

**TN Wizard Components** (~25 components):
- `TNWizard` (main orchestrator)
- `Step1Category` (category/team count selection)
- `Step2TeamInfo` (team names, categories, packages)
- `Step3RaceDay` (race day items)
- `Step4Practice` (calendar + slot preferences) - **Most Complex**
- `Step5Summary` (review and submit)
- `PracticeCalendar` (month view, date selection)
- `SlotRanking` (slot preference ranking)
- `TeamSelector` (switch between teams)
- `Stepper` (step navigation UI)
- Various form field components

**WU/SC Wizard Components** (~12 components):
- `WUSCWizard` (main orchestrator)
- `Step1BoatType` (boat type selection)
- `Step2TeamInfo` (team names, divisions)
- `Step3Managers` (manager contact info)
- `Step4Summary` (review and submit)
- `Stepper` (shared with TN)
- Form field components

**Shared Components** (~10 components):
- `EventPicker` (event selection grid)
- `SuccessPage` (confirmation page)
- `FormInput`, `FormSelect`, `FormTextarea`
- `Button`, `LoadingSpinner`, `ErrorDisplay`
- `PriceCalculator` (totals display)

**Challenges**:
- Calendar component is highly complex (month generation, date selection, validation)
- Practice slot ranking system (drag-and-drop or complex select UI)
- Form validation needs to be reactive
- Multi-team form state management

---

### 4. **Form Handling & Validation** (Medium - 3-4 days)

**Current**: Manual validation with DOM queries
```javascript
// Current: validation.js + inline validation
function validateStep2() {
  const teamName = document.getElementById('team_name_1').value;
  if (!teamName) {
    showError('Team name required');
    return false;
  }
  // ... more validation
}
```

**Next.js**: React Hook Form or Formik
```tsx
// Next.js: React Hook Form
const { register, handleSubmit, formState: { errors } } = useForm();

<FormInput
  {...register('teamName', { required: 'Team name required' })}
  error={errors.teamName}
/>
```

**Work Required**:
- Choose form library (React Hook Form recommended)
- Create validation schemas (Zod or Yup)
- Convert all validation logic to schemas
- Build error display components
- Implement real-time validation
- Handle complex validation (email, phone, practice dates)

**Challenges**:
- HK phone number validation and normalization
- Practice date window validation
- Cross-field validation (team count vs team names)
- Conditional validation (optional manager 3)

---

### 5. **Calendar Component** (High - 4-5 days)

**Current**: Custom vanilla JS calendar (~1,500 lines in tn_wizard.js)
```javascript
// Current: Complex calendar generation
function createTNCalendar(container, options) {
  // Generates months, days, handles date selection
  // Manages practice date state
  // Handles duration/helper dropdowns
  // Updates practice summary
}
```

**Next.js**: React calendar component
```tsx
// Next.js: React component
<PracticeCalendar
  startDate={practiceStart}
  endDate={practiceEnd}
  allowedWeekdays={[1,2,3,4,5]}
  selectedDates={selectedDates}
  onDateSelect={handleDateSelect}
  onDateRemove={handleDateRemove}
/>
```

**Work Required**:
- Build React calendar component from scratch
- Implement month navigation
- Date selection with validation
- Duration/helper dropdowns per date
- Practice summary updates
- Slot ranking integration
- Mobile-responsive design

**Challenges**:
- Complex date validation (weekdays only, practice window)
- Per-team date storage
- Visual feedback for selected dates
- Integration with slot ranking system

---

### 6. **API Integration** (Low-Medium - 2-3 days)

**Current**: Supabase client with fetch
```javascript
// Current: supabase_config.js
import { createClient } from '@supabase/supabase-js';
export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
```

**Next.js**: Same Supabase client, but with Next.js patterns
```tsx
// Next.js: Server components or API routes
// Option 1: Client-side (same as current)
'use client';
import { createClient } from '@supabase/supabase-js';

// Option 2: Server-side (better for config loading)
// app/api/config/route.ts
export async function GET(request: Request) {
  const config = await loadEventConfig();
  return Response.json(config);
}
```

**Work Required**:
- Set up Supabase client in Next.js
- Convert config loading to server-side (optional optimization)
- Update API calls to use Next.js patterns
- Handle environment variables properly
- Error handling and loading states

**Challenges**:
- Config caching (currently uses localStorage)
- Edge function calls (can stay client-side)
- Environment variable management

---

### 7. **Styling** (Medium - 3-4 days)

**Current**: Global CSS + scoped CSS
```css
/* Current: styles.css + tn_legacy.css */
.form-container { /* ... */ }
#tnScope .step { /* ... */ } /* Scoped to TN */
```

**Next.js Options**:
1. **CSS Modules** (recommended - easiest migration)
2. **Tailwind CSS** (better DX, but requires rewriting)
3. **Styled Components** (more overhead)

**Work Required**:
- Convert global CSS to CSS Modules or Tailwind
- Handle TN legacy CSS scoping (currently `#tnScope`)
- Ensure mobile responsiveness is preserved
- Update all class names in components
- Test visual parity

**Challenges**:
- TN legacy CSS is scoped to `#tnScope` - need to handle in React
- Mobile breakpoints need to be preserved
- Stepper component styling is complex

---

### 8. **Template System** (Low - 1-2 days)

**Current**: HTML templates loaded via fetch
```javascript
// Current: Load templates dynamically
fetch('tn_templates.html')
  .then(response => response.text())
  .then(html => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const templates = doc.querySelectorAll('template');
    // Clone templates into DOM
  });
```

**Next.js**: React components (no templates needed)
```tsx
// Next.js: Direct component usage
<TNStep1 />
<TNStep2 />
```

**Work Required**:
- Convert HTML templates to React components
- Remove template loading logic
- Simplify component structure

---

### 9. **Build & Deployment** (Low - 1 day)

**Current**: Static HTML (no build step)
```json
// vercel.json
{
  "outputDirectory": "public",
  "buildCommand": "echo 'No build needed'"
}
```

**Next.js**: Next.js build system
```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

**Work Required**:
- Set up Next.js project structure
- Configure build settings
- Update Vercel deployment config
- Set up environment variables
- Test build process

---

### 10. **Testing & QA** (High - 5-7 days)

**Work Required**:
- Manual testing of all form flows (TN, WU, SC)
- Test all validation scenarios
- Test practice calendar functionality
- Test multi-step navigation
- Test form submission and success page
- Cross-browser testing
- Mobile device testing
- Performance testing
- Accessibility testing

**Challenges**:
- Complex form flows need thorough testing
- Practice calendar has many edge cases
- Multi-team scenarios need testing
- Form state persistence needs verification

---

## Migration Strategy Recommendations

### Option 1: **Big Bang Migration** (Not Recommended)
- Migrate everything at once
- **Risk**: Very high
- **Timeline**: 4-6 weeks
- **Pros**: Clean slate, no legacy code
- **Cons**: High risk of breaking production, difficult to test incrementally

### Option 2: **Incremental Migration** (Recommended)
- Migrate one wizard at a time
- Keep both systems running in parallel
- **Risk**: Medium
- **Timeline**: 6-8 weeks (with overlap)
- **Pros**: Lower risk, can test incrementally, rollback easier
- **Cons**: Temporary code duplication

**Incremental Plan**:
1. **Week 1-2**: Set up Next.js project, migrate shared components (EventPicker, SuccessPage)
2. **Week 2-3**: Migrate WU/SC wizard (simpler, good test case)
3. **Week 3-5**: Migrate TN wizard (most complex)
4. **Week 5-6**: Polish, testing, bug fixes
5. **Week 6-7**: Deploy and monitor

### Option 3: **Hybrid Approach** (Alternative)
- Keep current system, gradually add Next.js pages
- Use Next.js for new features only
- **Risk**: Low
- **Timeline**: Ongoing
- **Pros**: Lowest risk, gradual transition
- **Cons**: Maintain two systems, technical debt

---

## Key Risks & Mitigation

### High-Risk Areas

1. **TN Practice Calendar** (Highest Risk)
   - **Risk**: Complex calendar logic may have bugs
   - **Mitigation**: Extensive testing, consider using a calendar library (react-calendar)

2. **Form State Management** (High Risk)
   - **Risk**: State persistence issues, data loss
   - **Mitigation**: Comprehensive state management testing, localStorage backup

3. **Multi-Step Navigation** (Medium Risk)
   - **Risk**: Deep linking, browser back/forward buttons
   - **Mitigation**: Use Next.js router properly, test navigation thoroughly

4. **Validation Logic** (Medium Risk)
   - **Risk**: Edge cases in validation may be missed
   - **Mitigation**: Port validation tests, comprehensive QA

5. **Visual Parity** (Medium Risk)
   - **Risk**: UI differences may confuse users
   - **Mitigation**: Side-by-side comparison, pixel-perfect design review

---

## Dependencies & Prerequisites

### Required Packages
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@supabase/supabase-js": "^2.75.1",
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

### Optional Packages (Consider)
- `zustand` - State management (lighter than Redux)
- `react-calendar` - Calendar component (may simplify TN calendar)
- `date-fns` - Date utilities
- `tailwindcss` - If choosing Tailwind for styling

---

## Benefits of Migration

### Technical Benefits
1. **Better Developer Experience**: TypeScript, hot reload, better tooling
2. **Improved Performance**: Server-side rendering, code splitting, image optimization
3. **SEO**: Better SEO with SSR/SSG
4. **Type Safety**: TypeScript catches errors at compile time
5. **Component Reusability**: Easier to maintain and extend
6. **Modern Tooling**: Better debugging, testing, and development tools

### Business Benefits
1. **Faster Development**: React components are easier to maintain
2. **Better UX**: Faster page loads, better mobile experience
3. **Easier Hiring**: React/Next.js developers are more common
4. **Future-Proof**: Modern stack, active ecosystem

---

## Costs & Trade-offs

### Development Costs
- **Initial Migration**: 4-6 weeks (1 developer)
- **Testing & QA**: 1-2 weeks
- **Bug Fixes**: 1-2 weeks (post-launch)
- **Total**: 6-10 weeks

### Ongoing Costs
- **Learning Curve**: Team needs to learn Next.js/React
- **Maintenance**: Slightly more complex build process
- **Bundle Size**: May increase (mitigated by code splitting)

### Trade-offs
- **Complexity**: Next.js adds framework complexity vs vanilla JS
- **Bundle Size**: Initial bundle may be larger (mitigated by code splitting)
- **Build Time**: Build step required (fast with Next.js)

---

## Recommendation

**Recommendation: Proceed with Incremental Migration (Option 2)**

### Rationale
1. **Current system works**: No urgent need for migration
2. **High complexity**: Large codebase with complex logic
3. **Risk mitigation**: Incremental approach reduces risk
4. **Business value**: Migration provides long-term benefits but no immediate ROI

### When to Migrate
- **Good time**: When planning major feature additions
- **Good time**: When hiring new developers (easier onboarding)
- **Not urgent**: If current system is stable and meeting needs

### Alternative: Modernize Without Migration
Consider these improvements without full migration:
1. **Add TypeScript**: Gradually convert JS files to TS
2. **Component Library**: Extract reusable components (still vanilla JS)
3. **Build Tool**: Add Vite for better DX (still vanilla JS)
4. **State Management**: Add a lightweight state library

---

## Conclusion

**Migration Effort**: **4-6 weeks (full-time, 1 developer)**
**Complexity**: **High** (due to large files, complex calendar, state management)
**Risk**: **Medium-High** (mitigated by incremental approach)
**Value**: **Long-term** (better DX, maintainability, performance)

The migration is **feasible** but **not trivial**. The largest challenges are:
1. Breaking down the 6,201-line `tn_wizard.js` into components
2. Rebuilding the complex practice calendar
3. Managing form state across multiple steps and teams
4. Ensuring visual and functional parity

**Recommendation**: Proceed with incremental migration if you have 6-8 weeks available and want long-term maintainability improvements. Otherwise, consider modernizing the current vanilla JS codebase first.

