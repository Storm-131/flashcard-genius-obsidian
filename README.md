# Flashcard Genius for Obsidian 🧞‍♂️

Flashcard Genius is an offline-first Obsidian plugin for browsing, studying, and analysing Markdown flashcards. Every card remains a normal Markdown table in your vault. Nothing has to be imported into a separate database or uploaded to a service.

Flashcard Genius is an independent community plugin and is not affiliated with or endorsed by Obsidian.

- - -

## ✨ Why use it?

- See an entire deck at once instead of one card at a time.
- Choose your own order and keep working around a difficult card.
- Organise cards into topic blocks with `##` headings.
- Edit the source Markdown and see the changes reflected in the plugin immediately.
- Keep your notes, cards, and ratings under your control in the vault.
- Use it offline: Flashcard Genius does not initiate network requests.

- - -

## 🖼️ Screenshots

### Library

The Library shows all cards in a deck, grouped by topic. Enable **Edit** to reveal the source buttons and jump directly to the selected card in Obsidian's Markdown editor.

![Library view](docs/Flashcards.png)

### Study mode

Study mode shows the question first. Click a card to reveal its answer. Image decks display the image on the front and the image title with a mirrored, subdued image on the back.

![Study mode](docs/Image_Quiz.png)

### Markdown source format

Cards are authored as Markdown tables. The example below is the basis of the shown rendered version in the first reference image above.

![Markdown table template](docs/Template.png)

- - -

## 📥 Manual Installation
Download and install the plugin directly in Obsidian, or follow these steps:
1. Build the plugin locally (see [Development](#development)).
2. Copy `dist/main.js`, `dist/manifest.json`, and `dist/styles.css` into:

   ```text
   <your-vault>/.obsidian/plugins/flashcard-genius/
   ```

3. Reload Obsidian.
4. Enable **Flashcard Genius** under **Settings → Community plugins**.

The plugin opens as a normal Obsidian tab. You can also install the same three files from a verified plugin release when one is available.

- - -

## 🗂️ Loading decks and images

Flashcard Genius adds **Open in Flashcard Genius** to the Obsidian file-menu.

- Right-click one Markdown file to load one deck.
- Right-click a folder to load all valid Markdown decks below it.
- Repeat the action on additional files or folders to append multiple decks to the same tab.
- Right-click a folder containing only supported image files (`png`, `jpg`, `jpeg`, `gif`, `webp`, `svg`, `avif`, or `bmp`) to create an image quiz.

For an image quiz, use the image filename as the card name, the filename becomes the question shown on the answer side. Keep the image-quiz folder free of Markdown files and unrelated assets; folders containing Markdown are treated as Markdown-deck folders instead. Folder names determine the generated deck grouping.

You can also use the command palette command **Open current note in Flashcard Genius** or configure a default folder in the plugin settings.

- - -

## 📝 Markdown deck format

Each deck needs an H1 title, optional H2 topic headings, and one or more tables. Columns are read by position: the first contains the question, the last contains difficulty when there are at least three columns, and every column between them contributes to the answer. Column header names are arbitrary. Two-column tables contain only question and answer; difficulty defaults to `0`.

Answer columns retain their order and are combined with blank lines; empty answer cells are skipped. Questions can contain Markdown images or Obsidian wiki images such as `![[bird.webp]]`. Image-question cards display the first two answer columns with different font sizes and fit long terms to the available width. Ordinary text cards keep fixed font sizes as the card grid changes. **Card size → Font size** adjusts both types manually.

On **image-card backs in Study mode**, the original answer-column positions determine the visual hierarchy:

| Frage | Deutscher Name | Lateinischer Name | Zusatzinfo | Sterne |
| --- | --- | --- | --- | --- |
| ![[Blauer-Drache.webp]] | Blauer Drache (Blaue Fadenschnecke) | *Glaucus atlanticus* | Kann Nesselzellen gefressener Quallen speichern und zur eigenen Verteidigung nutzen. | 3 |

The first answer column is the large primary answer; the second is the smaller secondary answer. Both names form a compact, vertically centered block. A trailing parenthetical addition in a simple primary name can appear on its own line, for example `Blauer Drache` followed by `(Blaue Fadenschnecke)`. Names wrap between complete words; long words shrink to fit without arbitrary word breaks. The secondary name starts at 75% of the fitted primary font size and can shrink further if needed. Italic Markdown in the Latin name remains italic.

Further answer columns appear below the names as small descriptions, initially around 40% of the primary font size and capped to grow moderately on large cards. All additional columns start below the first visible card viewport and appear only when scrolling the single answer area, using touch, the mouse or the keyboard. Revealing a card always resets this area to the top; cards without additional information have no unnecessary scrolling. Empty columns never move later columns into a different role.

This is a display-only treatment: original Markdown, stored contents and exports remain unchanged. The positional import syntax above is unchanged. The Library view and ordinary text cards retain their existing layout, sizes and scrolling behavior.

```markdown
# Neural Networks 💡

## Foundations

| Question | Answer | ⭐ |
| --- | --- | --- |
| What is a target network? | A periodically updated network used to stabilise training. | 2 |
| What does `Q(s, a)` represent? | The expected value of taking action `a` in state `s`. | 0 |

## Advanced topics

| Question | Answer | ⭐ |
| --- | --- | --- |
| What is experience replay? | A buffer that stores transitions for later training. | 3 |
```

Use normal Markdown in both cells: paragraphs, lists, emphasis, links, images, and mathematical notation rendered by Obsidian's Markdown renderer. Escape a literal pipe inside a cell as `\|`. Use `<br>` when you need a deliberate line break inside one table cell.

- - -

## 🧭 The three main views

### Library

Library is the source-aware overview of your loaded files. It renders every card, keeps topic groups visible, and lets you choose the order in which you work.

When **Edit** is enabled, the edit control opens the corresponding Markdown file at the selected card in Obsidian's editor. Changes made in the editor are picked up from the vault and reflected in the cards automatically. For Markdown cards, difficulty stars can be assigned in the Library; the rating is written back to the matching final difficulty cell in the Markdown table. The final cell must exist before the plugin can save a rating.

Image-deck cards do not support editing or stars in the plugin controls because they are generated directly from image files.

### Study mode

Study mode presents the front/question first. Click the card to flip it and reveal the answer. The toolbar lets you choose the number of cards per row and card height. The layout also adapts automatically to the available window width, including narrow iPhone and iPad layouts.

### Stats mode

Stats shows how many cards each deck contains at every difficulty level. Select a deck or difficulty slice to filter the card list, read the matching questions and answers, and start a study session with the filtered set.

- - -

## 🎨 Themes and responsive layout

Choose from the available colour themes in the top bar. The interface adapts its card grid, sidebar, and controls to the available width. Obsidian's interface, text, and monospace font variables are used so the plugin follows your vault's typography.

- - -

## 🔒 Offline and privacy

Flashcard Genius works locally inside your Obsidian vault.

```text
Flashcard Genius does not initiate network requests and does not transmit
notes, flashcards, settings, or usage data to external services.

The plugin does not use telemetry, analytics, remote fonts, update checks,
advertising, or external APIs.
```

Markdown files and local image assets are read through Obsidian's Vault APIs. Settings are stored through Obsidian's plugin data storage. The plugin does not require an account or API key. Documentation links in this README are ordinary links; if you open one manually, Obsidian or your operating system may handle it.

- - -

## 🛠️ Development

This repository is the canonical source for plugin development and community releases. The previous `Storm-131/Flashcard_Genius` repository is a historical reference; new changes belong here. The plugin source is in `src/`, with local npm workspaces in `packages/core/` and `packages/ui/`. The browser preview in `web/` exercises the same UI component as Obsidian.

Requirements: Node.js 24 or newer and npm (`.nvmrc` selects Node 24).

```bash
npm ci
npm run build
```

The production build creates exactly `dist/main.js`, `dist/manifest.json`, and `dist/styles.css`. Generated builds are ignored by Git; the release workflow builds them from the tagged source.

Available checks and preview:

```bash
npm test
npm run typecheck
npm run typecheck:web
npx playwright install chromium
npm run release:verify
npm run dev:preview
```

Version **1.0.2 is already prepared**. Do not run `release:prepare -- patch` for this release: that would prepare 1.0.3. For subsequent versions, `npm run release:prepare -- patch` updates the manifest, compatibility history, workspace versions and lockfile locally without Git operations.

The tag-triggered GitHub Actions workflow validates the exact version and repository, runs all tests and production builds, then publishes the three plugin assets. It refuses to replace an existing release. Tags use the exact version without a `v` prefix.

See [the migration and release guide](docs/migration-1.0.2.md) for local Obsidian testing, validation results and the manual publication steps after approval.

- - -

## 📄 License

Flashcard Genius is licensed under the [MIT License](LICENSE). Third-party notices are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
