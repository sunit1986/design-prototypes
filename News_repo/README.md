# News_repo — Header updates (back button, no icon, neutral subtext)

These files implement the requested header changes for the four News pages. Use them as reference or copy into [samyakshahjio/News_repo](https://github.com/samyakshahjio/News_repo).

## Changes applied

1. **Back button** — Added on all 4 pages; navigates to  
   `https://sunit1986.github.io/design-prototypes/news-tools.html`
2. **Icon removed** — No circular blue/teal icon in the header (replaced by back button, like [participatory-cinema-chat](https://sunit1986.github.io/design-prototypes/bollywood-flows/participatory-cinema-chat.html)).
3. **Subtext color** — Subtitle/domain line uses neutral grey (`--text-low`: `rgba(25,27,30,.65)`), not teal/sparkle.

## Files

| File | Title | Subtext (neutral) |
|------|--------|-------------------|
| `index.html` | Jio News AI | Morning Briefing |
| `breaking-news.html` | Breaking News Studio | JioBharatIQ |
| `fact-check.html` | Fact-Check Shield | JioBharatIQ Verify |
| `market-pulse.html` | Market Pulse | Tayyar hai |

## How to use in the live repo

- **Option A:** Copy the full contents of each HTML file here into the corresponding file in `samyakshahjio/News_repo` (replace entire file if the rest of the page is the same).
- **Option B:** In the live repo, replace only the header:
  - Remove the circular icon element.
  - Insert the back button + `.header-title-block` (title + domain) as in these files.
  - Add/update the header CSS (`.header-nav`, `.header-left`, `.back-btn`, `.header-title`, `.header-domain` with `color: var(--text-low)` for domain).
  - Set the back button `onclick` or link to `https://sunit1986.github.io/design-prototypes/news-tools.html`.

Page URLs stay unchanged: `.../News_repo/`, `.../breaking-news.html`, `.../fact-check.html`, `.../market-pulse.html`.
