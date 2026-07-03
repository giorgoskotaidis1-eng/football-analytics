# UI Redesign Brief

Branch: `ui-redesign`
Base branch: `main`

## Goal
Improve the visual quality and usability of the football analytics application without changing the app's core logic.

The app should feel like a professional football analysis / scouting platform: clean, modern, structured, readable, and useful for coaches, analysts, and staff.

## Hard rules
- Do not change Supabase logic.
- Do not change authentication.
- Do not change the database schema.
- Do not remove existing features.
- Do not rename routes.
- Do not rewrite the entire app.
- Work page by page.
- Explain every file changed.
- Test after every meaningful change.

## UI priorities
1. Dashboard
2. Player profile pages
3. Scouting / trials pages
4. Reports / analysis pages
5. Match analysis pages
6. Mobile responsiveness
7. Loading, empty, and error states

## Design direction
- Modern football analytics product feel
- Better spacing and hierarchy
- Clear cards and sections
- Better typography
- Cleaner buttons and forms
- Better mobile layout
- Professional dashboard-style presentation
- Keep existing data and workflows intact

## First prompt for an AI coding agent

```text
Analyze this project first. Do not change code yet.

Tell me:
1. What framework this app uses
2. What the main routes/pages are
3. Where the UI components are
4. How Supabase is connected
5. What environment variables are required
6. What problems or risks you see

After the analysis, propose a safe step-by-step UI improvement plan.
Do not rewrite the app.
Do not remove existing functionality.
```

## First change prompt

```text
Improve only the dashboard UI.
Do not change Supabase logic.
Do not change authentication.
Do not change database schema.
Do not remove existing functionality.
Do not rename routes.
Focus on layout, spacing, typography, cards, buttons, loading states, empty states, and mobile responsiveness.
Make it look like a professional football analysis/scouting platform.
Explain every file you changed.
```
