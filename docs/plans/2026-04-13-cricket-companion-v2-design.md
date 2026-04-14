# Cricket Companion V2 — Mega Journey Design

## Overview
Enhance `live-cricket-companion-chat.html` into a single mega journey: Match Picker → Enhanced Companion → Post-Match Card. All in one file, one phone frame, one continuous flow.

## Decisions (from brainstorming)
- **Match picker** as opening screen (not bottom sheet)
- **Hinglish** flavor on player cards and hype lines, English everywhere else
- **Follow player** toggle lives on the player stats card itself
- **Post-match shareable** card is WhatsApp-forward style (compact, great content)
- **Bigg Boss** is a buzz cross-promo banner in moments, not a full mode
- **No language toggle** — single Hinglish/English experience
- **No separate prototypes** — one mega journey

## Journey Flow
```
[Match Picker] → tap match → [Enhanced Companion] → match ends → [Post-Match Card]
```

## Section 1: Match Picker (New Opening Screen)
- Location pill: "Mumbai" (simulated geolocation)
- Greeting: "Hey Deepa, 3 matches live right now"
- 2-3 live match cards: team logos, score, overs, venue, LIVE badge
- First card highlighted "Recommended for you" (location-based)
- 1 upcoming match card (greyed out, not tappable)
- Tap live card → cardIn transition to companion

### Match Card Anatomy (no scroll, single screen)
- Team A logo + name | Score + overs | LIVE badge
- Team B logo + name | Venue | Tournament info

## Section 2: Enhanced Score Banner
Replaces current simple score banner with a richer match card:
- Both team logos side by side
- Score + overs for both teams (if applicable)
- Current batsman + strike rate
- Current bowler + figures
- All on one screen, no scroll
- 3 action buttons below: **Predict / Key Stats / Scorecard**
- Overflow `•••` for: Share Match, Follow Match, Settings

## Section 3: Prediction Polls with Aggregate %
Enhance existing predictions to show community vote split:
- "Who wins from here?" → MI 62% ████░░ vs RCB 38% ███░░░
- Horizontal bar with team colors (MI blue, RCB red)
- User taps to vote → their pick highlighted, bars animate to new %
- Keep existing prediction cards (Kohli six, powerplay runs, etc.) alongside

## Section 4: Player Stats Card + Follow Toggle
Triggered by chat input ("Rohit ka form?" or keyword detection):
- Hinglish header: "Rohit ka form 🔥"
- Stats grid: Tournament runs, Average, SR, Last 5 scores
- **"Follow Rohit" toggle** at bottom of card
- Toggle ON → toast: "Done! Rohit ke updates milte rahenge"
- Follow alerts appear as moment cards: "Rohit aa gaye crease pe! 🏏"

## Section 5: Bigg Boss Buzz Element
Small cross-promo banner in the moments tab:
- "Bigg Boss LIVE tonight: Eviction ka time! Predict who's out →"
- Styled with secondary-50 (orange) accent
- Tap → toast: "Coming soon on Jio Omni AI"
- Non-intrusive, sits below moment cards

## Section 6: Post-Match Shareable Card (Closing Act)
WhatsApp-forward style card appearing at journey end:
- Match result: "RCB beat MI by 4 wickets"
- User's prediction accuracy: "7/10 — Prediction King 👑"
- Top performer: "Kohli: 89(48) — Player of the Match"
- Your rank: "#1 in your group"
- Branded footer: "Jio Cricket Companion · IPL 2026"
- Buttons: "Share to WhatsApp" / "Copy Card"
- Compact, clean, designed to look good as a forwarded message

## Colors (JDS tokens)
- Primary: #3535f3 (purple — primary actions, highlights)
- Sparkle: #1eccb0 (teal — success, streaks)
- Secondary: #f7ab20 (amber — Bigg Boss, warnings)
- Error: #fa2f40 (red — live badge, wickets)
- Surface: #ffffff / #f5f5f5 / #eeeeef
- Text: #0c0d10 / rgba(25,27,30,0.65)

## Teams & Data
Keep MI vs RCB (IPL 2026, Match 23, Wankhede Stadium).
Add for match picker:
- CSK vs DC (Chepauk, Match 24) — secondary live match
- IND vs AUS (Tomorrow 7:30 PM) — upcoming

## Implementation Notes
- All changes in single file: `live-cricket-companion-chat.html`
- New `renderMatchPicker()` function for opening screen
- Enhanced `renderScoreBanner()` with logos + action buttons
- New `renderPlayerCard(player)` for stats + follow
- Enhanced `renderPredictView()` with aggregate % bars
- New `renderPostMatch()` for shareable card
- Bigg Boss banner in `renderMomentsView()`
- Follow state tracked in `followedPlayers` Set
- Journey auto-progresses via timed events or user triggers
