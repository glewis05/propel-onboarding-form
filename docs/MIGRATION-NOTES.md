# Migration Notes

## From GitHub Pages to Vercel

This document covers the migration from the original GitHub Pages deployment to Vercel with a modernized codebase.

## Key Changes

### 1. Build System: Vanilla JS → Vite + React

**Before:**
- Single `app.js` file (~4,500 lines)
- No build step
- Direct script tag in HTML
- CDN-loaded React and dependencies

**After:**
- Modular component architecture (30+ files)
- Vite build system with HMR
- ES modules with tree-shaking
- NPM-managed dependencies

### 2. CSS: CDN Tailwind → Built Tailwind v4

**Before:**
- CDN-loaded Tailwind CSS
- Runtime JIT compilation

**After:**
- PostCSS-processed Tailwind v4
- Build-time CSS generation
- Smaller production bundle

### 3. Data Files Location

**Before:**
```
src/data/form-definition.json
src/data/reference-data.json
src/data/test-catalog.json
```

**After:**
```
public/data/form-definition.json
public/data/reference-data.json
public/data/test-catalog.json
```

### 4. Authentication

**Before:**
- Email-based draft lookup
- Anyone could access any draft with email

**After:**
- Supabase Auth (Google OAuth + Magic Links)
- User-scoped draft access via RLS
- Users can only see their own submissions

## Breaking Changes

### Existing Drafts

Drafts created before the migration will not have a `user_id` and will be orphaned. Options:
1. **Communicate deadline** - Tell users to complete drafts before migration
2. **Manual migration** - Admin assigns user_ids to existing drafts
3. **Grace period** - Keep old anon policies temporarily

### API Changes

The Supabase service functions now require authentication:

```javascript
// Before: Anyone could fetch drafts
const drafts = await fetchRecentDrafts();

// After: Requires authenticated user
const drafts = await fetchUserDrafts(userId);
```

## Deployment Checklist

### Pre-Migration
- [ ] Notify users of upcoming changes
- [ ] Set draft completion deadline
- [ ] Backup existing Supabase data

### Supabase Setup
- [ ] Enable Google OAuth provider
- [ ] Configure email magic links
- [ ] Apply migration 001 (add user_id column)
- [ ] Apply migration 002 (secure RLS policies)
- [ ] Deploy cleanup-old-drafts edge function
- [ ] Set up weekly cron job for cleanup

### Vercel Setup
- [ ] Create new Vercel project
- [ ] Configure environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- [ ] Add production URL to Supabase Auth redirect allowlist
- [ ] Test deployment

### Post-Migration
- [ ] Verify all question types work
- [ ] Test authentication flow
- [ ] Test draft save/resume
- [ ] Test form submission
- [ ] Test Word document export
- [ ] Disable old GitHub Pages site

## Rollback Plan

If critical issues are found:

1. Re-enable GitHub Pages deployment
2. Revert RLS policies to allow anon access
3. Point DNS back to GitHub Pages (if custom domain)

## File Mapping

| Original Location | New Location |
|------------------|--------------|
| `src/js/app.js` (all) | `app/src/components/*.jsx` |
| `src/data/*.json` | `app/public/data/*.json` |
| `index.html` | `app/index.html` |
| `src/css/` (if any) | `app/src/index.css` |

## Component Extraction Reference

From the original `app.js`:

| Lines | New Component |
|-------|---------------|
| 330-405 | ErrorBoundary.jsx |
| 863-916 | RestorePrompt.jsx |
| 917-1145 | ResumeModal.jsx |
| 1146-1299 | SaveStatusBar.jsx |
| 1300-1325 | TextField.jsx |
| 1330-1354 | TextArea.jsx |
| 1359-1388 | SelectField.jsx |
| 1403-1530 | GeneListPopup.jsx |
| 1538-1567 | GeneInfoButton.jsx |
| 1578-1664 | TestPanelSelector.jsx |
| 1669-1717 | RadioGroup.jsx |
| 1718-1751 | CheckboxField.jsx |
| 1752-1889 | SelectWithAlternates.jsx |
| 1890-2150 | GeneSelector.jsx |
| 2156-2236 | AddressGroup.jsx |
| 2242-2351 | ContactGroup.jsx |
| 2359-2447 | StakeholderGroup.jsx |
| 2455-2574 | ProviderFilterList.jsx |
| 2575-2764 | QuestionRenderer.jsx |
| 2765-2914 | RepeatableSection.jsx |
| 2921-2967 | StepRenderer.jsx |
| 2983-3615 | ReviewStep.jsx |
| 3616-3717 | ProgressIndicator.jsx |
| 3724-4461 | FormWizard.jsx |
| 4468-4525 | App.jsx |
