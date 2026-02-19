# CLAUDE.md — AI Assistant Guide for design-prototypes

This file provides guidance for AI assistants (Claude Code and others) working in this repository.

---

## Repository Overview

**Project**: Jio Omni AI Design Prototypes
**Purpose**: Interactive mobile chat-UI prototypes for Jio AI product experiences
**Tech Stack**: Vanilla HTML/CSS/JavaScript — no build system, no framework, no package manager
**PWA**: Configured via `manifest.json` for standalone mobile installation

This is a rapid-prototyping repository. Each prototype is a single self-contained HTML file. There are no dependencies to install and no build step to run.

---

## Directory Structure

```
design-prototypes/
├── index.html                        # Landing hub — links to all prototypes
├── manifest.json                     # PWA manifest (name, theme, start_url)
├── jds-install-guide.html            # Setup guide for JioBharatIQ MCP server
├── ai-powered-audio-chat.html        # Voice/audio AI chat prototype
├── live-cricket-companion-chat.html  # Live cricket AI companion prototype
├── news-brief-prototype.html         # Personalized news briefing prototype
├── participatory-cinema-chat.html    # Meme factory / cinema chat prototype
├── tools-prototype.html              # AI Tools Suite (edit, analyze, write, translate)
└── Assets/
    ├── fonts/woff2/                  # JioType custom font family (WOFF2)
    ├── HelloJio_Breath*.mp4          # Idle state animation asset
    ├── HelloJio_Listening*.mp4       # Listening state animation asset
    └── movies/                       # Demo video assets
```

---

## Development Workflow

### Running Prototypes

Open any `.html` file directly in a browser — no server required for most features. For full PWA behaviour or to avoid CORS issues with local assets, serve the directory:

```bash
# Python (built-in)
python3 -m http.server 8080

# Node (if available)
npx serve .
```

### Adding a New Prototype

1. Copy the closest existing prototype as a starting template.
2. Use the established file naming convention: `<concept>-prototype.html` or `<concept>-chat.html`.
3. Keep all code (HTML, CSS, JS) in-line within the single file — do **not** create separate `.css` or `.js` files.
4. Add a card for the new prototype to `index.html`.
5. Follow the design token conventions documented below.

### Editing Existing Prototypes

- All styles live in a `<style>` block inside `<head>`.
- All scripts live in a `<script>` block at the bottom of `<body>`.
- Screens/views are separate `<div>` elements toggled via JavaScript — not separate pages.
- State management is done with plain functions and DOM manipulation (no framework).

---

## Design System Conventions

### CSS Custom Properties (Design Tokens)

All prototypes define a shared set of CSS variables on `:root`. Always use these tokens — never hard-code colour or spacing values.

**Colours**

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#3535f3` | Primary brand / interactive blue-purple |
| `--color-secondary` | `#f7ab20` | Accent / highlight yellow |
| `--color-sparkle` | `#1eccb0` | Success / positive teal |
| `--color-error` | *(red variant)* | Error states |
| `--color-warning` | *(amber variant)* | Warning states |
| `--color-surface` | *(light grey)* | Card / surface backgrounds |
| `--color-bg` | `#ffffff` | Page background |
| `--color-text-primary` | *(near-black)* | Body text |
| `--color-text-secondary` | *(medium grey)* | Secondary / muted text |

**Spacing Scale**

| Token | Value |
|---|---|
| `--space-4xs` | `2px` |
| `--space-3xs` | `4px` |
| `--space-2xs` | `8px` |
| `--space-xs` | `12px` |
| `--space-sm` | `16px` |
| `--space-md` | `24px` |
| `--space-lg` | `32px` |
| `--space-xl` | `48px` |

**Border Radius**

| Token | Value |
|---|---|
| `--radius-pill` | `999px` |
| `--radius-4xl` | `23px` |
| `--radius-large` | `16px` |
| `--radius-medium` | `12px` |
| `--radius-small` | `8px` |

### Typography

- **Font family**: `JioType` (custom) with system sans-serif fallback.
- Fonts are loaded as `@font-face` from `Assets/fonts/woff2/` (local) or via GitHub raw CDN.
- Available weights: Hairline, Light, Regular, Medium, Bold, Black, ExtraBlack — with matching italic variants.
- Always declare font-weight numerically when referencing JioType weights.

### Mobile-First Viewport

- Design target: **360 × 800 px** (standard Android phone frame).
- The device frame is simulated in-browser at exactly 360 px wide with `border-radius: 32px`.
- Responsive breakpoint: `768px` for wider screens (centers the device frame).
- Meta viewport: `width=device-width, initial-scale=1`.

---

## JavaScript Conventions

- **Vanilla JS only** — no React, Vue, or any library/CDN imports.
- Screen navigation uses a `navigateTo(screenId)` pattern:
  - Each screen is a `<div id="screen-name">` with `display: none` by default.
  - `navigateTo` hides all screens, then shows the target.
- Chat messages are appended to a scrollable container via `addUserMsg()` / `addAIMsg()` helper functions.
- Simulated AI responses use `setTimeout` to mimic async latency.
- Touch events and `click` events are used interchangeably — no separate touch handling library.
- Always use `getElementById` or `querySelector` — never rely on global variable names.
- Animations use CSS transitions (`transition: transform 0.3s ease`, `opacity`) triggered by class toggles.

### Common UI Patterns

| Pattern | Implementation |
|---|---|
| Loading indicator | Dot-pulse animation via CSS `@keyframes` |
| Screen transition | CSS `transform: translateX(...)` + `opacity` toggle |
| Chat bubble | `div.message.user` / `div.message.ai` appended to `div.chat-messages` |
| Feedback | Thumbs up/down buttons that toggle active state |
| Input widget | `<input type="text">` + send icon button in a flex row |

---

## HTML Structure Template

Each prototype follows this page structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- PWA meta tags -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <title>Prototype Name</title>
  <style>
    /* @font-face declarations */
    /* :root { --design-tokens } */
    /* Component styles */
  </style>
</head>
<body>
  <!-- Device frame wrapper -->
  <div class="device-frame">
    <!-- Status bar -->
    <div class="status-bar">...</div>

    <!-- Screens (only one visible at a time) -->
    <div id="screen-home" class="screen active">...</div>
    <div id="screen-chat" class="screen">...</div>
  </div>

  <script>
    // All JavaScript inline here
  </script>
</body>
</html>
```

---

## PWA Configuration

`manifest.json` is shared across all prototypes:

```json
{
  "name": "Jio Omni AI Prototypes",
  "short_name": "Jio Omni AI",
  "start_url": "index.html",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3535f3"
}
```

- `theme_color` matches `--color-primary` in the design tokens.
- `display: standalone` hides the browser chrome for a native-app feel.

---

## MCP / JioBharatIQ Integration

`jds-install-guide.html` documents the setup of the **JioBharatIQ MCP server** — a knowledge base server for Claude integrations. Key facts:

- Distributed via `uvx` (uv package runner).
- Installs with a single command: auto-configures Claude Desktop, Cursor, and Claude Code CLI.
- Knowledge base is fetched from GitHub on install; updates are automatic.
- Config file location: `~/.claude/claude_desktop_config.json` (Claude Desktop) or `~/.claude.json` (Claude Code CLI).

When editing `jds-install-guide.html`, verify that install commands and config paths remain accurate.

---

## Git Workflow

- **Main development branch**: `master`
- **Feature/fix branches**: use descriptive names, e.g., `fix/github-install-urls`
- **Claude AI branches**: prefixed `claude/` followed by a task slug and session ID
- **Commit style**: imperative present tense, concise summary line
  - Good: `Add live cricket companion prototype`
  - Good: `Fix troubleshooting: symlink both uv and uvx`
  - Avoid: `Updated stuff`, `WIP`
- No CI/CD pipelines currently exist; all testing is manual/visual.

---

## Key Constraints for AI Assistants

1. **Do not introduce build tooling** (webpack, Vite, npm, etc.) unless explicitly requested — this is intentionally a no-build project.
2. **Keep each prototype self-contained** in its single HTML file. Do not split CSS or JS into separate files.
3. **Use the design tokens** defined in `:root` — never hard-code colours or spacing values.
4. **Match the existing font stack** — reference JioType via the established `@font-face` declarations.
5. **Mobile viewport is 360 × 800 px** — design and test at this size.
6. **No external CDN dependencies** for scripts — the prototypes must work offline (assets from `Assets/` or embedded inline only). Font CDN via GitHub raw is acceptable.
7. **Simulate AI responses with `setTimeout`** — do not wire up real API calls in prototypes.
8. **No test suite exists** — rely on manual visual verification in a browser.
9. **Do not add a `package.json`** or any Node/Python project files unless the user explicitly asks.
10. **index.html is the entry point** — always add new prototypes as cards there.
