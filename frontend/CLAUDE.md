# Rainwave Frontend Rewrite Rules

- First migration step is a repo-wide rename of all remaining `src/**/*.js` files to `.ts` as a dedicated commit boundary.
- The rename-only pass should avoid intentional behavioral changes.
- Compilation failures after the rename pass are acceptable.
- After the rename pass, touched code should migrate directly to the modern stack rather than preserving legacy aliases.
- Do not introduce new `Sizing`-based measurement logic.
- Prefer CSS variables and CSS-driven layout; if unresolved, leave the old code commented with a note.
- Use `.template.ts` renderers instead of `RWTemplates`.
- Use the modern `api` library instead of legacy `API.add_callback` / `API.async_get`.
- Use helpers when an equivalent helper exists.
- Use typed `Preferences` instead of `Prefs`, relying on legacy preference translation.
- Preserve the playlist browsing stack as functional enclosures and touch it as little as possible.
- For each migrated file after the rename pass: add baseline typing, avoid implicit `any`, import concrete API payload types when known, add explicit parameter and return types, and modernize obvious async flows.
- Leave inline comments for fixed bugs and unresolved ambiguities.
