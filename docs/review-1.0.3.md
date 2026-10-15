# Obsidian review fixes for 1.0.3

This patch is prepared locally. No commit, push, tag or release is created by the preparation steps. The existing 1.0.2 tag and release remain unchanged. The minimum supported Obsidian version remains 1.7.2.

## Fixed source findings

- All five reported `obsidianmd/no-static-styles-assignment` errors are addressed. Temporary text measurement uses a scoped CSS class and restores the original class membership. Dynamic font values and editor heights use CSS properties through Obsidian's `setCssProps` API when the host provides it; the standalone preview uses the equivalent standard DOM fallback.
- Native Markdown image controls use `createSpan` / `createEl`. An unnecessary element assertion and the reported unnecessary bracket escapes are removed.
- Both text fitters use explicit `window.requestAnimationFrame` / `window.cancelAnimationFrame` calls.
- Settings expose searchable definitions on Obsidian 1.13+, while retaining the imperative rendering fallback on older hosts. Both paths share the existing controls and persistence. Refreshing uses the supported host path instead of calling deprecated `display()` directly.
- Filename sanitization retains the same control-character replacement without a control-character regular expression.

## CSS and dependencies

- Study scroll cues use explicit classes instead of `:has()` selectors. The primary names, scroll ownership and initial position are unchanged.
- Equivalent CSS color notation, shorthands and formatting were normalized without changing colors, selector order or priorities.
- The Tailwind v4 `@theme` directive has a narrowly documented lint exception. It is a build-time directive, not an unknown rule emitted in the plugin stylesheet.
- KaTeX is updated from 0.18.1 to 0.18.10, outside the vulnerable range of [GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7). This renderer is used by the browser preview; Obsidian continues to render native Markdown/math. The production dependency audit reports zero known vulnerabilities.

## Remaining findings

The official Obsidian ESLint rules report no source errors. Three sentence-case warnings concern the intentional product spelling **Flashcard Genius**; the existing UI labels are retained.

The official CSS configuration still flags `!important` declarations (163 across the two plugin source stylesheets), selector order/specificity (15), the legacy `-webkit-backface-visibility` compatibility declaration (1), and the separate `:not()` selectors (1). These rules preserve the existing cascade against native Markdown and React inline styles, dark-mode overrides and mobile flip-card compatibility. Removing or reordering them merely to silence lint would risk changing the UI. They are explicitly retained rather than globally suppressing their rules. The three measurement priorities replace equivalent former inline priorities.

## Validation

- Official Obsidian ESLint rules, including the minimum-version API checks, were run against plugin, core and UI source; the reported regex rules were also checked on the web serializer.
- All 123 unit tests (including focused host-API and old/new settings compatibility tests) and 9 release-script checks pass. An early parallel run hit the existing 5-second timeout in one font-control test; that test passed unchanged in isolation and in the final full run. No test timeout was increased.
- Library and Study screenshots were compared before and after the patch. Study, the 150% font setting and scrolled notes are pixel-identical. The Library differs only in 96 antialiased shadow pixels, by at most one RGB channel value; text, images and layout are unchanged.
- Plugin/web type checks and production builds, release metadata validation and the browser layout/scrolling tests are run before delivery.

The dashboard itself has not been rerun; the final Obsidian-host check remains the local installation test. Build outputs are in `dist/main.js`, `dist/manifest.json` and `dist/styles.css` and are not tracked in Git.
