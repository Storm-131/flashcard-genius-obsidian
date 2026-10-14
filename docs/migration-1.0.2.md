# Lokale Migration und Release-Vorbereitung 1.0.2

Stand: 14.10.2026. Die Änderungen liegen ausschließlich im lokalen Arbeitsverzeichnis von `flashcard-genius-obsidian`. Es wurden keine Commits, Branches, Tags, Pushes oder GitHub Releases erzeugt oder verändert. `Flashcard_Genius` bleibt unverändert und erhalten.

## Ausgangslage und Unterschiede

| Bereich | Flashcard_Genius | flashcard-genius-obsidian vor der Migration |
| --- | --- | --- |
| Branch / Status | `main`, sauber | `main`, sauber |
| HEAD | `88e378c` – New Design for Cards | `6803ec2` – Revise README for installation and usage details |
| origin | `https://github.com/Storm-131/Flashcard_Genius.git` | `https://github.com/Storm-131/flashcard-genius-obsidian.git` |
| Lokale Branches | nur `main` | nur `main` |
| Lokale Tags | keine | `1.0.0`, `1.0.1` |
| Historie | Entwicklungscommits einschließlich neuer Kartenlayouts | drei Commits: Initial Push, Plugin-Review-Korrekturen, README-Anpassung |
| Versionsstand | Root, Plugin und gemeinsame Pakete bereits 1.0.2 | Root-Paket und Manifest 1.0.1; Core/UI 1.0.1, aber Workspace-Abhängigkeiten noch 1.0.0 |
| Struktur | `obsidian-plugin/src`, `packages/core`, `packages/ui`, `web` | eigenständiges `src`, `packages/core`, `packages/ui` |
| Build | TypeScript und esbuild; Ausgabe `obsidian-plugin/dist` | TypeScript und esbuild; Ausgabe `dist` |
| Release-Metadaten | doppelte Root-/Plugin-Manifeste und Versionsdateien | Root-Manifest; `versions.json` enthielt nur 1.0.0 |
| Release-Pipeline | Release-Skripte, Workflow und Monorepo-Export | kein `.github`-Workflow, keine Release-Skripte |
| Prüfungen | Parser, gemeinsame UI, Vault-Import, Persistenz, Browser, Release | ältere gemeinsame UI-Tests; keine Parser-/Vault-/Persistenz-/Browser-Suite |

Das offizielle Repository war bereits ein vollständiges Quellrepository, kein reines Artefaktrepository. Sein esbuild-Build entspricht dem aktuellen Monorepo-Build einschließlich Obsidian-External, React-Skript-Guard und Produktionsprüfung auf unerwünschte Remote-Ressourcen. Diese Build-Konfiguration wurde beibehalten.

Die wesentlichen Implementierungsunterschiede betrafen positionsbasiertes Parsing, getrennte Antwortbestandteile mit stabilen Spaltenpositionen, Vault-Bildauflösung in diesen Bestandteilen, gemeinsame Kartendarstellung, dynamische Antwortschrift, Bibliotheks-Bildflächen, Sternpersistenz sowie Schriftsteuerung und Obsidian-Markdown-Darstellung. Der aktuelle Entwicklungsstand enthält die vorherigen Plugin-Review-Korrekturen bereits.

## Entscheidung: Strategie A

Das offizielle Repository ist künftig die maßgebliche Codebasis für Entwicklung und Veröffentlichung. Seine vorhandene Root-Struktur bleibt bestehen:

```text
src/                  Obsidian-Plugin
packages/core/        Parser, Datentypen und Materialisierung
packages/ui/          gemeinsame React-Oberfläche
web/                  Browser-Prüfhülle derselben Oberfläche
scripts/              lokale Versions- und Release-Prüfungen
tests/browser/        Layout- und Typografietests
.github/workflows/    Veröffentlichung aus einem exakten Versions-Tag
dist/                 erzeugte Plugin-Artefakte, nicht versioniert
```

Strategie B würde das Monorepo als zusätzliche Quelle voraussetzen und eine dauerhafte Synchronisierungs-/Exportpipeline zum Community-Repository benötigen. Für ein Plugin mit bereits eigenständigem Quellrepository verursacht das zusätzliche Abstimmung und Fehlerquellen. Strategie A benötigt nach dieser einmaligen Migration keine Synchronisierung mehr. Neue Plugin-, Core- und UI-Änderungen gehören ausschließlich in `flashcard-genius-obsidian`.

Die Browser-Vorschau verwendet `ReadonlyFlashcardApp` aus demselben UI-Workspace wie Obsidian. Sie ist keine zweite Implementierung des Plugins. Die bisherige Obsidian-Plugin-Unterstruktur und ihre doppelten Versionsdateien wurden nicht zusätzlich eingeführt. Der Monorepo-Exportbefehl `release:stage-public` ist künftig nicht erforderlich.

Die offizielle Git-Historie bleibt vollständig erhalten. HEAD ist weiterhin `6803ec2cda5b17c5a47de5b4584221a375ed7a44`; die Migration kann später als normaler zusätzlicher Commit erfolgen. Die bestehenden Tags zeigen unverändert auf `e91d948a9228a6ce09baca6735c58a37bd64bb03` (1.0.0) und `94f8dee2497faf0a66d37538946c85ab8d776b4f` (1.0.1).

## Übertragene und angepasste Dateien

- **Plugin:** vollständiger Inhalt von `obsidian-plugin/src/` nach `src/`, einschließlich `LinkUrlModal.ts`, `settings.ts`, `plugin.css`, `vaultLoader.ts`, `starPersistence.ts` und deren Tests. Bereits identische Dateien wie `main.ts`, `FlashcardGeniusView.tsx` und `VaultImageResolver.ts` bleiben inhaltlich identisch. Im Vault-Importtest wurde nur der relative Fixture-Pfad an die Root-Struktur angepasst.
- **Core:** vollständiger aktueller `packages/core/`-Stand, darunter `markdownTable.ts`, `markdownParser.ts`, `materialize.ts`, Datentypen, Parser-Tests und originales Vogel-Fixture.
- **UI:** vollständiger aktueller `packages/ui/`-Stand, darunter `CardAnswer`, `CardFontSizeControl`, `useFitAnswerText`, `cardLabels`, `Workspace`, `StudyMode`, `MarkdownContent`, `Sidebar`, `StatsMode`, Renderer, Bildlogik, CSS und sämtliche Tests.
- **Browser-Vorschau:** `web/` einschließlich Markdown-/ZIP-Importtests; in `web/src/main.tsx` wurde ausschließlich der Plugin-CSS-Pfad angepasst. `tests/browser/cards.spec.ts`, `answerTypography.spec.ts` und `playwright.config.ts` wurden übernommen. Playwright startet ausdrücklich eine eigene Vorschau des offiziellen Repositories auf Port 18443 und verwendet keinen bereits laufenden Server; die manuelle Vorschau bleibt auf Port 8443. Die separate Monorepo-Vitest-Konfiguration wurde durch die erweiterte bestehende Root-Konfiguration ersetzt.
- **Test-Konfiguration:** `vitest.config.ts` berücksichtigt Core/UI, Plugin und Vorschau; `test/obsidian.ts` verbindet die bisherigen Modal-/Setting-Shims mit den Vault-Datei-Shims. `docs/Template.md` wurde als bestehendes Import-Testfixture übernommen.
- **Versionen und Installation:** Root-`manifest.json`, `versions.json`, Root-/Core-/UI-`package.json`, `package-lock.json`; alle Versionen und lokalen Workspace-Abhängigkeiten sind 1.0.2. Das Lockfile übernimmt dieselben aufgelösten Dependency-Versionen wie die Quelle und verwendet die eigenständigen Workspace-Pfade. `.nvmrc` empfiehlt Node 24; das Root-Paket fordert Node ab 24 für die gemeinsame Test-/Vorschau-Toolchain.
- **Build-Konfiguration:** bestehendes `esbuild.config.mjs` unverändert; `tsconfig.json` schließt Plugin-Testdateien vom Produktions-Typecheck aus. Die gemeinsame Anwendung wird weiterhin über die Produktionsimporte mitgeprüft.
- **Release:** `release.config.json`, `scripts/check-release.mjs`, `release-utils.mjs`, `prepare-release.mjs`, `release.test.mjs`, `deploy.mjs` und `.github/workflows/release.yml`. Die Skripte prüfen jetzt die Root-Struktur und `dist/`. Der Workflow verweigert jegliches Überschreiben eines vorhandenen Releases, einschließlich vorhandener Entwürfe.
- **Dokumentation und Hygiene:** `README.md`, dieser Bericht, `.gitattributes`, `.gitignore` für lokale Browser-Ausgaben. Lizenz, Drittanbieter-Hinweise und bisherige Screenshots bleiben erhalten. `node_modules`, Git-Metadaten, persönliche Konfiguration und alte Builds wurden nicht übertragen.

Die beiden gemeinsamen Pakete stimmen nach dem Kopieren byteweise mit der Quelle überein. Alle Plugin-Produktionsdateien stimmen ebenfalls byteweise überein. Es gab keine Änderungen an der Funktionsimplementierung im Rahmen dieser Migration.

## Erhaltene Funktionen

| Funktion | Nachweis |
| --- | --- |
| Positionsbasiertes Parsing beliebig vieler Antwortspalten | identischer Core; Parser-Tests für 1, 2, 3, 8 und 32 Antwortspalten |
| Zusammenführen und stabile Positionen trotz leerer Bestandteile | Parser-/Materialisierungslogik und Tests unverändert |
| Markdown-/Wiki-Bilder in Fragen und Antwortteilen | Parser-, native Markdown- und Vault-Importtests |
| Responsive Bildkarten, einheitliche Container und Trennlinien | Browser-Messungen bei 2, 3 und 5 Spalten |
| Automatische Vergrößerung kleiner Bilder | Browser-Tests für Library und Study |
| Lange Antwortbegriffe und unterschiedliche Antwortschrift | echte Browser-Messungen, Fit-Tests, Spaltenhierarchie |
| Feste Schriftgrößen normaler Textkarten | Browser-Tests bei wechselnder Spaltenzahl, Library und Study |
| Manuelle Schriftsteuerung | UI- und Browser-Tests ohne doppelte Skalierung |
| Aktuelles grünes Theme | identische UI/CSS, `emerald` als Standard, visuelle Kontrolle |
| Library, Study und Stats sowie bestehende Lern-/Filtersteuerung | unveränderte Komponenten; Unit-Tests und Navigation im schmalen Browserfenster |
| Sterne und persistente Bewertung | identische UI-/Pluginlogik; positionsbasierte Persistenztests einschließlich Konflikten und fehlender Bewertungszellen |

## Durchgeführte Prüfungen

Alle folgenden Prüfungen waren erfolgreich:

- `npm ci --offline --no-audit --no-fund` direkt im offiziellen Repository: eigenständige Installation aus dem angepassten Lockfile; Core/UI-Workspace-Links zeigen ausschließlich in dessen eigene `packages/`.
- `npm test`: **98 Vitest-Tests in 15 Dateien**, einschließlich Parser, UI, native Markdown-/Bilddarstellung, Import/Export, Vault-Import und Sternpersistenz.
- `node --test scripts/release.test.mjs`: **9 Release-Tests** für synchronisierte Metadaten, Zielrepository, Versionssteigerungen, erhaltene Versionshistorie, ungültige Tags, inkonsistente Abhängigkeiten und fehlerhafte Build-Artefakte. Die beiden Monorepo-spezifischen Prüfungen für Quellexport und doppelte Metadaten sind in der gewählten Struktur nicht erforderlich.
- `npm run typecheck` und `npm run typecheck:web`: TypeScript-Prüfungen für Plugin/gemeinsame Produktionsimporte und Vorschau erfolgreich.
- `npm run build:preview` und `npm run build`: Produktions-Builds erfolgreich.
- `npm run test:browser`: **22 Playwright-Tests in Chrome erfolgreich**, einschließlich Bildern, Textkarten, Typografie, manueller Schriftsteuerung, Vollbild, Explorer und kleinen Fenstern. Die generierten Library-, Study-Bild- und Study-Text-Screenshots wurden zusätzlich visuell geprüft. Bildfixtures sind geometrische Testbilder.
- `npm run release:check -- 1.0.2 --build --repository Storm-131/flashcard-genius-obsidian`: Versionsnummern, Lockfile, Kompatibilität und genau drei nichtleere Plugin-Artefakte bestätigt.
- Workflow-YAML eingelesen und sämtliche Shell-Schritte mit `bash -n` geprüft. Drei lokale Simulationen mit einem Mock von `gh` bestätigen: bestehender Release wird nicht verändert, vollständiger neuer Release wird verarbeitet, unvollständiger Entwurf wird nicht veröffentlicht. Es wurden dabei keine GitHub-Aufrufe ausgeführt.
- `git diff --check`: keine Whitespace-Fehler. HEAD und sämtliche Git-Refs beider Repositories stimmen mit der Ausgangslage überein; das Entwicklungsrepository ist sauber.

Die Tests wurden lokal mit Node 26.8.2 ausgeführt; der vorbereitete GitHub-Workflow verwendet Node 24. Die Sandbox verhinderte zunächst das Öffnen des lokalen Ports. Der erste genehmigte Browser-Lauf verwendete die noch laufende, identische Vorschau aus dem alten Repository. Deshalb wurde die Test-Konfiguration auf einen eigenen Port ohne Server-Wiederverwendung umgestellt. Die abschließende vollständige `npm run release:verify`-Prüfung startet und prüft ausschließlich die Vorschau aus dem offiziellen Repository. Ein echter GitHub-Actions-Lauf wurde nicht ausgelöst. Die vorhandenen Action-Major-Versionen wurden anhand der offiziellen Release-Seiten von [actions/checkout](https://github.com/actions/checkout/releases) und [actions/setup-node](https://github.com/actions/setup-node/releases) bestätigt.

Die endgültige Kontrolle im realen Obsidian-Vault bleibt dein lokaler Test: Automatisierte Tests verwenden Obsidian-Shims und einen echten Browser, keinen laufenden Obsidian-Host.

## Version 1.0.2 und lokale Artefakte

Die Version 1.0.2 ist lokal vorbereitet. Plugin-ID `flashcard-genius`, Autor Tom Maus und Mindestversion Obsidian 1.7.2 bleiben erhalten. `versions.json` enthält 1.0.0, 1.0.1 und 1.0.2 mit derselben Mindestversion. Der bisher vorhandene Eintrag 1.0.0 bleibt unverändert; 1.0.1 wurde ergänzt.

Die fertigen Release-Dateien liegen im offiziellen Repository:

| Datei | Bytes | SHA-256 |
| --- | ---: | --- |
| `dist/main.js` | 332193 | `cdc6ee878e131110e7ee538518e6c6999351168709a660139a5116118c70f73b` |
| `dist/manifest.json` | 254 | `01acb6424db4e7717863cb62c1a3d731eac2f880d243eab3af67fdce3857b36c` |
| `dist/styles.css` | 31817 | `35df351b2b7e5066cc92678976a9ba06f4349c17f5e03b157b856b649a907047` |

Build-Dateien werden bei späteren Änderungen neu erzeugt und nicht in Git aufgenommen. Für Obsidian/GitHub werden die drei Dateien als einzelne Release-Assets verwendet.

## Jetzt lokal in Obsidian testen

Aus `flashcard-genius-obsidian`:

```bash
npm run build
npm run release:check -- 1.0.2 --build
```

Die drei Dateien aus `dist/` in `<Test-Vault>/.obsidian/plugins/flashcard-genius/` kopieren. Vorhandene Dateien dieses lokalen Plugin-Ordners bei Bedarf sichern. Alternativ übernimmt nach Setzen des konkreten Zielpfades das lokale Deploy-Skript genau diese drei Dateien:

```bash
OBSIDIAN_PLUGIN_DIR="/path/to/test-vault/.obsidian/plugins/flashcard-genius" npm run deploy
```

Obsidian neu laden bzw. das Plugin deaktivieren und wieder aktivieren. Version 1.0.2 kontrollieren. In deinem Vogel-Deck Bildfragen und mehrere Antwortspalten prüfen; zwischen 2, 3 und 5 Kartenspalten wechseln, Schriftregler testen, lange Textkarten scrollen und Bildvergrößerung/Vollbild prüfen. Library, Study und Stats öffnen. Eine Sternbewertung ändern, die Markdown-Datei kontrollieren und den Deck erneut laden, um Persistenz im echten Vault zu prüfen.

Das Deploy-Skript wurde nicht auf einen Vault ausgeführt; es wurden keine installierten Plugins oder persönlichen Notizen verändert.

## Veröffentlichung erst nach deiner Freigabe

**Diese Schritte wurden nicht ausgeführt.** Das Pushen des Tags löst den vorbereiteten Workflow aus, der bei Erfolg den öffentlichen Release veröffentlicht. `release:prepare -- patch` für diesen Release nicht erneut ausführen: 1.0.2 ist bereits gesetzt.

1. Im offiziellen Repository nach deinem lokalen Test `npm run release:verify` ausführen und den Diff einschließlich neuer Dateien prüfen.
2. Vor dem Commit/Push den aktuellen GitHub-Stand lesen und auf zwischenzeitliche Änderungen prüfen. Remotes und vorhandene Tags kontrollieren; keine vorhandenen Tags verändern und keinen Force-Push verwenden.
3. Die geprüften Änderungen als normalen Commit auf Basis der bestehenden offiziellen Historie aufnehmen und `main` pushen.
4. Nur wenn der Tag 1.0.2 noch nicht existiert, den exakten neuen Tag ohne `v` erstellen und pushen.

Beispielbefehle, ausschließlich nach Freigabe und aus `flashcard-genius-obsidian`:

```bash
npm run release:verify
git diff --check
git diff
git status --short
git remote -v
git fetch origin
git log --oneline --left-right HEAD...origin/main
git ls-remote --tags origin refs/tags/1.0.2
```

Bei zwischenzeitlichen Änderungen diese zuerst regulär integrieren und erneut prüfen. Erst bei geprüftem, integriertem Stand und weiterhin freier Version:

```bash
git add .
git commit -m "Migrate current plugin source and prepare 1.0.2"
git push origin main
git tag -a 1.0.2 -m "Release 1.0.2"
git push origin refs/tags/1.0.2
```

GitHub Actions muss im offiziellen Repository aktiviert sein und dem Release-Job `GITHUB_TOKEN` mit `contents: write` erlauben; ein zusätzliches Secret ist nicht notwendig. Der Workflow prüft Tag/Manifest/Repository, installiert Abhängigkeiten und Chromium, führt die gesamte lokale Prüfkette aus, erstellt einen neuen Entwurf mit den drei Dateien aus `dist/`, prüft dessen Asset-Liste und veröffentlicht ihn. Ein bereits vorhandener Release oder Entwurf wird ausdrücklich abgewiesen.

Nach dem Lauf die drei Assets und das Manifest im Release 1.0.2 kontrollieren. Die früheren Releases und Tags 1.0.0/1.0.1 bleiben bestehen. Neue Entwicklung findet danach ausschließlich in diesem offiziellen Repository statt.
