# Cricket Companion V2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance `cricket-flows/live-cricket-companion-chat.html` into a mega journey: Match Picker → Enhanced Companion (richer score, aggregate predictions, player cards, follow alerts, Bigg Boss buzz) → Post-Match Shareable Card.

**Architecture:** Single-file HTML prototype. All new features are additive JS functions + CSS classes injected into the existing file. The `startJourney()` entry point changes to show the match picker first, then transitions to the existing companion flow on user tap. A new `renderPostMatch()` ends the journey. No external dependencies.

**Tech Stack:** Vanilla HTML/CSS/JS, JDS design tokens (CSS variables), inline SVG icons (IC object).

**File:** `cricket-flows/live-cricket-companion-chat.html`
- CSS: lines ~12–540 (includes base64 font — DO NOT touch the base64 data)
- HTML: lines ~543–615 (phone frame, chat area, input, voice overlay)
- JS: lines ~615–963 (icons, data, functions, startJourney)
- The base64 font block is between `src: url(data:font/truetype;base64,...` and the closing `)` — skip it entirely when editing.

---

### Task 1: Add Match Picker CSS

**Files:**
- Modify: `cricket-flows/live-cricket-companion-chat.html` — CSS section (after existing CSS rules, before `</style>`)

**Step 1: Add CSS for match picker screen**

Find the closing `</style>` tag. Insert the following CSS block BEFORE it:

```css
/* ─── MATCH PICKER ─── */
.match-picker { padding: 20px 16px; animation: cardIn 0.3s ease; }
.mp-location { display: inline-flex; align-items: center; gap: 4px; background: var(--surface-ghost); color: var(--primary-50); font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: var(--shape-pill); margin-bottom: 16px; }
.mp-location svg { width: 14px; height: 14px; fill: var(--primary-50); }
.mp-greeting { font-size: 20px; font-weight: 800; color: var(--text-high); letter-spacing: -0.02em; margin-bottom: 4px; }
.mp-sub { font-size: 13px; color: var(--text-low); margin-bottom: 20px; }
.mp-section-title { font-size: 11px; font-weight: 700; color: var(--text-low); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; }
.mp-card { background: var(--surface); border: 1px solid rgba(36,38,43,0.12); border-radius: var(--shape-large); padding: 14px; margin-bottom: 10px; cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease; position: relative; }
.mp-card:active { transform: scale(0.98); }
.mp-card.recommended { border-color: var(--primary-30); background: linear-gradient(135deg, var(--primary-20) 0%, var(--surface) 50%); }
.mp-card .rec-chip { position: absolute; top: -8px; right: 12px; background: var(--primary-50); color: #fff; font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: var(--shape-pill); letter-spacing: 0.04em; }
.mp-card-row { display: flex; align-items: center; gap: 10px; }
.mp-team-logo { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; color: #fff; flex-shrink: 0; }
.mp-teams { flex: 1; min-width: 0; }
.mp-team-line { font-size: 14px; font-weight: 700; color: var(--text-high); display: flex; align-items: center; gap: 6px; }
.mp-team-score { font-size: 12px; font-weight: 400; color: var(--text-low); }
.mp-vs { font-size: 10px; color: var(--text-low); font-weight: 600; margin: 2px 0 2px 42px; }
.mp-venue { font-size: 11px; color: var(--text-low); margin-top: 6px; display: flex; align-items: center; gap: 4px; }
.mp-live { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: var(--error); }
.mp-live .live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--error); animation: livePulse 1.5s ease infinite; }
.mp-card.upcoming { opacity: 0.5; pointer-events: none; border-style: dashed; }
.mp-upcoming-badge { font-size: 10px; color: var(--text-low); font-weight: 600; }
```

**Step 2: Verify** — Open file in browser, confirm no CSS errors (page still loads).

**Step 3: Commit**
```bash
git add cricket-flows/live-cricket-companion-chat.html
git commit -m "feat: add match picker CSS styles"
```

---

### Task 2: Add Match Picker Data + Render Function

**Files:**
- Modify: `cricket-flows/live-cricket-companion-chat.html` — JS section

**Step 1: Add match data and team colors**

Find the line `let currentView = null;` (around line 890). Insert the following BEFORE it:

```javascript
/* ─── MATCH PICKER DATA ─── */
const teamColors = {
  MI: '#004BA0', RCB: '#EC1C24', CSK: '#FFCB05', DC: '#0078BC',
  IND: '#0066B3', AUS: '#FFD700', KKR: '#3A225D', SRH: '#FF822A',
};
const liveMatches = [
  {
    id: 'm1', teamA: 'MI', teamB: 'RCB', scoreA: '178/6 (20)', scoreB: '92/2 (10.3)',
    venue: 'Wankhede Stadium, Mumbai', tournament: 'IPL 2026 · Match 23',
    status: 'live', recommended: true,
  },
  {
    id: 'm2', teamA: 'CSK', teamB: 'DC', scoreA: '145/3 (16.2)', scoreB: 'Yet to bat',
    venue: 'MA Chidambaram Stadium, Chennai', tournament: 'IPL 2026 · Match 24',
    status: 'live', recommended: false,
  },
  {
    id: 'm3', teamA: 'IND', teamB: 'AUS', scoreA: '', scoreB: '',
    venue: 'Narendra Modi Stadium, Ahmedabad', tournament: 'Border-Gavaskar Trophy · 1st Test',
    status: 'upcoming', recommended: false, time: 'Tomorrow, 9:30 AM',
  },
];
let selectedMatch = null;
const followedPlayers = new Set();
```

**Step 2: Add renderMatchPicker function**

Find the `function startJourney()` block. Insert the following BEFORE it:

```javascript
/* ─── MATCH PICKER ─── */
function renderMatchPicker() {
  const app = document.getElementById('app');
  const chatArea = document.getElementById('chatArea');
  const inputContainer = document.querySelector('.input-container');
  // Hide chat input during picker
  if (inputContainer) inputContainer.style.display = 'none';
  // Update header
  document.querySelector('.header-title').textContent = 'Cricket Companion';
  document.querySelector('.header-domain').textContent = 'Entertainment';

  chatArea.innerHTML = '';
  let html = '<div class="match-picker">';
  html += `<div class="mp-location">${IC.target || ''}<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg> Mumbai</div>`;
  html += '<div class="mp-greeting">Hey Deepa!</div>';
  html += '<div class="mp-sub">3 matches on right now. Pick one to jump in.</div>';
  html += '<div class="mp-section-title">Live Now</div>';

  liveMatches.filter(m => m.status === 'live').forEach(m => {
    html += `<div class="mp-card${m.recommended ? ' recommended' : ''}" onclick="selectMatch('${m.id}')">`;
    if (m.recommended) html += '<div class="rec-chip">RECOMMENDED</div>';
    html += '<div class="mp-card-row">';
    html += `<div class="mp-team-logo" style="background:${teamColors[m.teamA]}">${m.teamA}</div>`;
    html += '<div class="mp-teams">';
    html += `<div class="mp-team-line">${m.teamA} <span class="mp-team-score">${m.scoreA}</span></div>`;
    html += '</div>';
    html += `<div class="mp-live"><span class="live-dot"></span> LIVE</div>`;
    html += '</div>';
    html += `<div class="mp-vs">vs</div>`;
    html += '<div class="mp-card-row">';
    html += `<div class="mp-team-logo" style="background:${teamColors[m.teamB]}">${m.teamB}</div>`;
    html += '<div class="mp-teams">';
    html += `<div class="mp-team-line">${m.teamB} <span class="mp-team-score">${m.scoreB}</span></div>`;
    html += '</div>';
    html += '</div>';
    html += `<div class="mp-venue">${m.venue} · ${m.tournament}</div>`;
    html += '</div>';
  });

  const upcoming = liveMatches.filter(m => m.status === 'upcoming');
  if (upcoming.length) {
    html += '<div class="mp-section-title" style="margin-top:16px">Upcoming</div>';
    upcoming.forEach(m => {
      html += `<div class="mp-card upcoming">`;
      html += '<div class="mp-card-row">';
      html += `<div class="mp-team-logo" style="background:${teamColors[m.teamA]}">${m.teamA}</div>`;
      html += '<div class="mp-teams">';
      html += `<div class="mp-team-line">${m.teamA} vs ${m.teamB}</div>`;
      html += '</div>';
      html += `<div class="mp-upcoming-badge">${m.time}</div>`;
      html += '</div>';
      html += `<div class="mp-venue">${m.venue} · ${m.tournament}</div>`;
      html += '</div>';
    });
  }
  html += '</div>';
  chatArea.innerHTML = html;
}

function selectMatch(matchId) {
  selectedMatch = liveMatches.find(m => m.id === matchId);
  const chatArea = document.getElementById('chatArea');
  const inputContainer = document.querySelector('.input-container');
  // Restore chat input
  if (inputContainer) inputContainer.style.display = '';
  // Update header for companion mode
  document.querySelector('.header-title').textContent = 'Live Cricket Companion';
  chatArea.innerHTML = '';
  // Start companion journey for selected match
  startCompanion();
}
```

**Step 3: Modify startJourney to show picker first, and extract companion start**

Replace the existing `startJourney()` and its call with:

```javascript
/* ─── START ─── */
function startCompanion() {
  setTimeout(() => {
    const m = selectedMatch || liveMatches[0];
    addMsg('ai', `Welcome to Match Companion!<br><br>${m.teamA} vs ${m.teamB} is <strong>LIVE</strong> at ${m.venue.split(',')[0]}. I'll be your personal cricket companion — predictions, live moments, and leaderboard, all right here.`);
    setTimeout(renderScoreBanner, 600);
  }, 400);
}

function startJourney() {
  renderMatchPicker();
}
startJourney();
```

**Step 4: Verify** — Open in browser. Should see match picker on load. Tap MI vs RCB card → companion loads.

**Step 5: Commit**
```bash
git add cricket-flows/live-cricket-companion-chat.html
git commit -m "feat: add match picker screen as journey entry point"
```

---

### Task 3: Enhanced Score Banner with Action Buttons

**Files:**
- Modify: `cricket-flows/live-cricket-companion-chat.html` — CSS + JS sections

**Step 1: Add CSS for enhanced score banner**

Add before `</style>`:

```css
/* ─── ENHANCED SCORE BANNER ─── */
.score-v2 { background: var(--surface-bold); border-radius: var(--shape-large); padding: 14px; color: #fff; }
.score-v2-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.score-v2-teams { display: flex; align-items: center; gap: 8px; }
.score-v2-team { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.score-v2-logo { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; color: #fff; border: 2px solid rgba(255,255,255,0.3); }
.score-v2-name { font-size: 11px; font-weight: 700; opacity: 0.8; }
.score-v2-scores { text-align: center; flex: 1; }
.score-v2-main { font-size: 18px; font-weight: 900; letter-spacing: -0.02em; }
.score-v2-vs { font-size: 10px; opacity: 0.5; margin: 2px 0; }
.score-v2-opp { font-size: 13px; font-weight: 600; opacity: 0.7; }
.score-v2-need { font-size: 11px; color: var(--sparkle-30); font-weight: 600; margin-top: 4px; }
.score-v2-players { display: flex; justify-content: space-between; padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.12); margin-top: 8px; }
.score-v2-player { font-size: 11px; opacity: 0.85; }
.score-v2-player strong { font-weight: 700; opacity: 1; }
.score-v2-player .sr-label { font-size: 10px; opacity: 0.5; }
.score-actions { display: flex; gap: 8px; margin-top: 10px; }
.score-action-btn { flex: 1; padding: 8px 0; border-radius: var(--shape-small); border: none; font-family: var(--font); font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; transition: transform 0.1s; }
.score-action-btn:active { transform: scale(0.96); }
.score-action-btn svg { width: 14px; height: 14px; }
.score-action-btn.primary { background: var(--primary-50); color: #fff; }
.score-action-btn.primary svg { fill: #fff; }
.score-action-btn.ghost { background: var(--surface-ghost); color: var(--text-high); }
.score-action-btn.ghost svg { fill: var(--icon-high); }
.score-action-overflow { width: 36px; padding: 8px 0; border-radius: var(--shape-small); border: none; background: var(--surface-ghost); color: var(--text-low); font-size: 16px; font-weight: 900; cursor: pointer; letter-spacing: 1px; }
```

**Step 2: Replace renderScoreBanner function**

Replace the existing `renderScoreBanner()` with:

```javascript
function renderScoreBanner() {
  const m = selectedMatch || liveMatches[0];
  addWidget(`<div class="score-v2">
    <div class="score-v2-header">
      <div class="live-badge"><span class="live-dot"></span> LIVE</div>
      <div style="font-size:10px;opacity:0.6">${m.tournament}</div>
    </div>
    <div class="score-v2-teams">
      <div class="score-v2-team">
        <div class="score-v2-logo" style="background:${teamColors[m.teamA]}">${m.teamA}</div>
        <div class="score-v2-name">${m.teamA}</div>
      </div>
      <div class="score-v2-scores">
        <div class="score-v2-main">${m.scoreA.split('(')[0].trim()}</div>
        <div class="score-v2-vs">vs</div>
        <div class="score-v2-opp">${m.scoreB.split('(')[0].trim()}</div>
        <div class="score-v2-need">Need 87 off 57 balls</div>
      </div>
      <div class="score-v2-team">
        <div class="score-v2-logo" style="background:${teamColors[m.teamB]}">${m.teamB}</div>
        <div class="score-v2-name">${m.teamB}</div>
      </div>
    </div>
    <div class="score-v2-players">
      <div class="score-v2-player"><strong>Kohli* 47(31)</strong> <span class="sr-label">SR 151.6</span></div>
      <div class="score-v2-player"><strong>Bumrah 3/24</strong> <span class="sr-label">Econ 6.0</span></div>
    </div>
  </div>`);

  setTimeout(() => {
    addWidget(`<div class="score-actions">
      <button class="score-action-btn primary" onclick="showView('predict')">${IC.target} Predict</button>
      <button class="score-action-btn ghost" onclick="showPlayerCard('kohli')">${IC.cricket} Key Stats</button>
      <button class="score-action-btn ghost" onclick="showToast('Full scorecard coming soon!')">${IC.info} Scorecard</button>
      <button class="score-action-overflow" onclick="showToast('More options coming soon!')">&middot;&middot;&middot;</button>
    </div>`);
    setTimeout(() => {
      addWidget(`<div class="points-bar"><div class="points-left"><div class="points-icon">${IC.trophy}</div><span class="points-val">${predictionPoints} pts</span><span class="points-rank">#1 in your group</span></div><div class="points-streak">${IC.fire} 7 streak</div></div>`);
      setTimeout(renderViewTabs, 200);
    }, 300);
  }, 200);
}
```

**Step 3: Verify** — Select a match → score banner shows both teams, logos, player info, 3 action buttons.

**Step 4: Commit**
```bash
git add cricket-flows/live-cricket-companion-chat.html
git commit -m "feat: enhanced score banner with team logos and action buttons"
```

---

### Task 4: Aggregate Prediction Polls

**Files:**
- Modify: `cricket-flows/live-cricket-companion-chat.html` — CSS + JS sections

**Step 1: Add CSS for aggregate poll bars**

Add before `</style>`:

```css
/* ─── AGGREGATE POLLS ─── */
.poll-card { background: var(--surface); border: 1px solid rgba(36,38,43,0.12); border-radius: var(--shape-large); padding: 14px; margin-bottom: 8px; animation: cardIn 0.3s ease; }
.poll-question { font-size: 14px; font-weight: 700; color: var(--text-high); margin-bottom: 10px; }
.poll-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; cursor: pointer; transition: opacity 0.2s; }
.poll-bar-row.voted { opacity: 1; }
.poll-bar-row.not-voted { opacity: 0.55; }
.poll-team-label { font-size: 12px; font-weight: 700; width: 32px; text-align: center; flex-shrink: 0; }
.poll-bar-track { flex: 1; height: 28px; background: var(--grey-20); border-radius: var(--shape-small); overflow: hidden; position: relative; }
.poll-bar-fill { height: 100%; border-radius: var(--shape-small); transition: width 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94); display: flex; align-items: center; padding: 0 8px; }
.poll-bar-fill span { font-size: 11px; font-weight: 700; color: #fff; }
.poll-pct { font-size: 13px; font-weight: 800; width: 38px; text-align: right; flex-shrink: 0; }
.poll-meta { display: flex; justify-content: space-between; margin-top: 8px; font-size: 10px; color: var(--text-low); }
.poll-votes { font-weight: 600; }
.poll-voted-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 600; color: var(--sparkle-60); margin-top: 6px; }
.poll-voted-badge svg { width: 12px; height: 12px; fill: var(--sparkle-60); }
```

**Step 2: Add poll data and render function**

Insert after the `predictions` array:

```javascript
/* ─── AGGREGATE POLLS ─── */
const aggregatePolls = [
  {
    id: 'p1', question: 'Who wins from here?',
    options: [
      { label: 'MI', pct: 62, color: teamColors.MI, votes: '14.2k' },
      { label: 'RCB', pct: 38, color: teamColors.RCB, votes: '8.7k' },
    ],
    totalVotes: '22.9k votes', userVoted: null,
  },
  {
    id: 'p2', question: 'Player of the Match?',
    options: [
      { label: 'Kohli', pct: 51, color: '#EC1C24', votes: '11.8k' },
      { label: 'Bumrah', pct: 35, color: '#004BA0', votes: '8.1k' },
      { label: 'Other', pct: 14, color: 'var(--grey-60)', votes: '3.2k' },
    ],
    totalVotes: '23.1k votes', userVoted: null,
  },
];

function renderPollCard(poll) {
  const rows = poll.options.map((opt, i) => {
    const votedClass = poll.userVoted !== null ? (poll.userVoted === i ? 'voted' : 'not-voted') : '';
    return `<div class="poll-bar-row ${votedClass}" onclick="votePoll('${poll.id}', ${i})">
      <div class="poll-team-label" style="color:${opt.color}">${opt.label}</div>
      <div class="poll-bar-track"><div class="poll-bar-fill" style="width:${poll.userVoted !== null ? opt.pct : 0}%;background:${opt.color}"><span>${poll.userVoted !== null ? opt.label : ''}</span></div></div>
      <div class="poll-pct" style="color:${opt.color}">${poll.userVoted !== null ? opt.pct + '%' : ''}</div>
    </div>`;
  }).join('');

  const votedBadge = poll.userVoted !== null ? `<div class="poll-voted-badge">${IC.check} You voted ${poll.options[poll.userVoted].label}</div>` : '';

  return `<div class="poll-card" id="poll-${poll.id}">
    <div class="poll-question">${poll.question}</div>
    ${rows}
    <div class="poll-meta"><div class="poll-votes">${poll.totalVotes}</div><div>Live poll</div></div>
    ${votedBadge}
  </div>`;
}

function votePoll(pollId, optIdx) {
  const poll = aggregatePolls.find(p => p.id === pollId);
  if (!poll || poll.userVoted !== null) return;
  poll.userVoted = optIdx;
  // Shift percentages slightly toward user's pick
  poll.options[optIdx].pct = Math.min(99, poll.options[optIdx].pct + 2);
  // Re-render just this poll card
  const el = document.getElementById('poll-' + pollId);
  if (el) {
    el.outerHTML = renderPollCard(poll);
    // Trigger bar animation after DOM update
    setTimeout(() => {
      const newEl = document.getElementById('poll-' + pollId);
      if (newEl) newEl.querySelectorAll('.poll-bar-fill').forEach(bar => bar.style.width = bar.style.width);
    }, 50);
  }
  showToast('Vote recorded!');
}
```

**Step 3: Integrate polls into renderPredictView**

In the existing `renderPredictView()`, after the line that adds "Live Predictions" header widget, add:

```javascript
    // Aggregate polls first
    aggregatePolls.forEach((poll, pi) => {
      setTimeout(() => { addWidget(renderPollCard(poll)); }, (pi + 1) * 180);
    });
```

And adjust the `predictions.forEach` timeout offset so polls render first, then prediction cards after:

```javascript
    const pollDelay = (aggregatePolls.length + 1) * 180;
    predictions.forEach((p, pi) => {
      setTimeout(() => {
        // ... existing prediction card code ...
      }, pollDelay + pi * 180);
    });
```

Update the info box timeout similarly:

```javascript
    setTimeout(() => {
      addWidget(`<div class="pred-info-box">...`);
    }, pollDelay + predictions.length * 180 + 100);
```

**Step 4: Verify** — Open Predict tab. Should see aggregate poll bars (MI 62% vs RCB 38%) above existing prediction cards. Tap to vote → bars animate, percentage shows.

**Step 5: Commit**
```bash
git add cricket-flows/live-cricket-companion-chat.html
git commit -m "feat: aggregate prediction polls with vote bars"
```

---

### Task 5: Player Stats Card + Follow Toggle

**Files:**
- Modify: `cricket-flows/live-cricket-companion-chat.html` — CSS + JS sections

**Step 1: Add CSS for player card**

Add before `</style>`:

```css
/* ─── PLAYER CARD ─── */
.player-card { background: var(--surface); border: 1px solid rgba(36,38,43,0.12); border-radius: var(--shape-large); padding: 16px; animation: cardIn 0.3s ease; }
.player-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.player-name { font-size: 16px; font-weight: 800; color: var(--text-high); letter-spacing: -0.02em; }
.player-hinglish { font-size: 12px; color: var(--text-low); margin-top: 2px; font-weight: 500; }
.player-team-badge { font-size: 10px; font-weight: 700; color: #fff; padding: 3px 8px; border-radius: var(--shape-pill); }
.player-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
.player-stat { text-align: center; background: var(--surface-minimal); border-radius: var(--shape-small); padding: 8px 4px; }
.player-stat-val { font-size: 16px; font-weight: 800; color: var(--text-high); }
.player-stat-label { font-size: 9px; color: var(--text-low); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px; }
.player-last5 { display: flex; gap: 4px; margin-bottom: 12px; }
.player-last5-title { font-size: 10px; color: var(--text-low); font-weight: 600; margin-bottom: 4px; }
.player-last5-score { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: var(--shape-pill); }
.player-last5-score.high { background: var(--sparkle-20); color: var(--sparkle-60); }
.player-last5-score.mid { background: var(--secondary-20); color: var(--secondary-60); }
.player-last5-score.low { background: var(--error-20); color: var(--error); }
.follow-toggle { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--surface-minimal); border-radius: var(--shape-medium); cursor: pointer; transition: background 0.2s; }
.follow-toggle:active { background: var(--surface-moderate); }
.follow-toggle-text { font-size: 13px; font-weight: 600; color: var(--text-high); }
.follow-toggle-sub { font-size: 10px; color: var(--text-low); font-weight: 400; }
.follow-switch { width: 40px; height: 22px; border-radius: 11px; background: var(--grey-40); position: relative; transition: background 0.2s; }
.follow-switch.on { background: var(--sparkle-50); }
.follow-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform 0.2s; }
.follow-switch.on::after { transform: translateX(18px); }
```

**Step 2: Add player data and render functions**

Insert after `followedPlayers` declaration:

```javascript
/* ─── PLAYER DATA ─── */
const playerData = {
  kohli: { name: 'Virat Kohli', team: 'RCB', hinglish: 'King Kohli ka form dekho!',
    runs: 487, avg: 54.1, sr: 148.3, matches: 10, last5: [89, 23, 71, 8, 45],
    teamColor: teamColors.RCB },
  rohit: { name: 'Rohit Sharma', team: 'MI', hinglish: 'Rohit ka form kaisa hai?',
    runs: 342, avg: 38.0, sr: 141.2, matches: 10, last5: [55, 12, 78, 34, 6],
    teamColor: teamColors.MI },
  bumrah: { name: 'Jasprit Bumrah', team: 'MI', hinglish: 'Boom Boom Bumrah!',
    wickets: 18, avg: 14.2, econ: 6.8, matches: 10, last5: ['3/24', '1/30', '2/18', '4/22', '0/35'],
    teamColor: teamColors.MI },
};

function getScoreClass(score) {
  const n = typeof score === 'number' ? score : parseInt(score);
  if (n >= 50 || (typeof score === 'string' && score.startsWith('3')) || (typeof score === 'string' && score.startsWith('4'))) return 'high';
  if (n >= 20) return 'mid';
  return 'low';
}

function showPlayerCard(key) {
  const p = playerData[key];
  if (!p) return;
  const isFollowed = followedPlayers.has(key);
  const isBatter = p.runs !== undefined;
  const statsHTML = isBatter
    ? `<div class="player-stats-grid">
        <div class="player-stat"><div class="player-stat-val">${p.runs}</div><div class="player-stat-label">Runs</div></div>
        <div class="player-stat"><div class="player-stat-val">${p.avg}</div><div class="player-stat-label">Average</div></div>
        <div class="player-stat"><div class="player-stat-val">${p.sr}</div><div class="player-stat-label">SR</div></div>
        <div class="player-stat"><div class="player-stat-val">${p.matches}</div><div class="player-stat-label">Matches</div></div>
      </div>`
    : `<div class="player-stats-grid">
        <div class="player-stat"><div class="player-stat-val">${p.wickets}</div><div class="player-stat-label">Wickets</div></div>
        <div class="player-stat"><div class="player-stat-val">${p.avg}</div><div class="player-stat-label">Average</div></div>
        <div class="player-stat"><div class="player-stat-val">${p.econ}</div><div class="player-stat-label">Econ</div></div>
        <div class="player-stat"><div class="player-stat-val">${p.matches}</div><div class="player-stat-label">Matches</div></div>
      </div>`;

  const last5HTML = p.last5.map(s => `<span class="player-last5-score ${getScoreClass(s)}">${s}</span>`).join('');

  addWidget(`<div class="player-card">
    <div class="player-card-header">
      <div>
        <div class="player-name">${p.name}</div>
        <div class="player-hinglish">${p.hinglish}</div>
      </div>
      <div class="player-team-badge" style="background:${p.teamColor}">${p.team}</div>
    </div>
    ${statsHTML}
    <div class="player-last5-title">Last 5 innings</div>
    <div class="player-last5">${last5HTML}</div>
    <div class="follow-toggle" onclick="toggleFollow('${key}', this)">
      <div>
        <div class="follow-toggle-text">Follow ${p.name.split(' ')[0]}</div>
        <div class="follow-toggle-sub">Get alerts when ${p.name.split(' ')[0]} ${isBatter ? 'bats' : 'bowls'}</div>
      </div>
      <div class="follow-switch ${isFollowed ? 'on' : ''}"></div>
    </div>
  </div>`);
}

function toggleFollow(key, el) {
  const sw = el.querySelector('.follow-switch');
  const p = playerData[key];
  if (followedPlayers.has(key)) {
    followedPlayers.delete(key);
    sw.classList.remove('on');
    showToast(`Unfollowed ${p.name.split(' ')[0]}`);
  } else {
    followedPlayers.add(key);
    sw.classList.add('on');
    showToast(`Done! ${p.name.split(' ')[0]} ke updates milte rahenge`);
    // Simulate follow alert after a delay
    setTimeout(() => {
      addMsg('ai', `${IC.bolt} <strong>${p.name.split(' ')[0]} alert:</strong> ${p.name.split(' ')[0]} aa gaye crease pe! Let's go!`);
    }, 5000);
  }
}
```

**Step 3: Add player keyword detection in sendUserMsg**

In the `sendUserMsg()` function, inside the `setTimeout` after `removeThinking()`, add these cases BEFORE the existing keyword checks:

```javascript
    // Player queries — Hinglish + English
    if (lower.includes('rohit') || lower.includes('hitman')) {
      addMsg('ai', 'Rohit Sharma ka IPL 2026 form:');
      setTimeout(() => showPlayerCard('rohit'), 200);
    } else if (lower.includes('kohli') || lower.includes('virat') || lower.includes('king')) {
      addMsg('ai', 'King Kohli is in beast mode this season:');
      setTimeout(() => showPlayerCard('kohli'), 200);
    } else if (lower.includes('bumrah') || lower.includes('boom')) {
      addMsg('ai', 'Boom Boom Bumrah ki bowling:');
      setTimeout(() => showPlayerCard('bumrah'), 200);
    } else if (lower.includes('form') || lower.includes('stats') || lower.includes('player')) {
      addMsg('ai', 'Which player? Try asking about Kohli, Rohit, or Bumrah!');
    } else if (lower.includes('score') ...  // existing cases continue
```

**Step 4: Verify** — Type "Rohit ka form?" in chat → player card with stats + follow toggle appears. Toggle follow → toast in Hinglish. After 5s, follow alert message appears.

**Step 5: Commit**
```bash
git add cricket-flows/live-cricket-companion-chat.html
git commit -m "feat: player stats cards with follow toggle and Hinglish"
```

---

### Task 6: Bigg Boss Buzz Element

**Files:**
- Modify: `cricket-flows/live-cricket-companion-chat.html` — CSS + JS sections

**Step 1: Add CSS for buzz banner**

Add before `</style>`:

```css
/* ─── BUZZ BANNER ─── */
.buzz-banner { background: linear-gradient(135deg, var(--secondary-20) 0%, #fff 100%); border: 1px solid var(--secondary-30); border-radius: var(--shape-medium); padding: 12px 14px; display: flex; align-items: center; gap: 10px; cursor: pointer; margin-top: 6px; transition: transform 0.15s; animation: cardIn 0.3s ease; }
.buzz-banner:active { transform: scale(0.98); }
.buzz-icon { width: 36px; height: 36px; border-radius: var(--shape-small); background: var(--secondary-50); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.buzz-icon svg { width: 18px; height: 18px; fill: #fff; }
.buzz-text { flex: 1; }
.buzz-title { font-size: 12px; font-weight: 700; color: var(--text-high); }
.buzz-sub { font-size: 10px; color: var(--text-low); margin-top: 1px; }
.buzz-arrow { font-size: 14px; color: var(--secondary-50); font-weight: 700; }
```

**Step 2: Add buzz banner in renderMomentsView**

In the existing `renderMomentsView()`, AFTER `renderMomentCard(momentCards[currentMoment])` is called, add:

```javascript
    // Bigg Boss buzz element
    setTimeout(() => {
      addWidget(`<div class="buzz-banner" onclick="showToast('Bigg Boss Companion — coming soon on Jio Omni AI!')">
        <div class="buzz-icon">${IC.fire}</div>
        <div class="buzz-text">
          <div class="buzz-title">Bigg Boss LIVE tonight: Eviction ka time!</div>
          <div class="buzz-sub">Predict who's out. Bragging rights pe khelo.</div>
        </div>
        <div class="buzz-arrow">&rsaquo;</div>
      </div>`);
    }, 400);
```

**Step 3: Verify** — Open Moments tab. After moment card loads, Bigg Boss banner appears below. Tap → toast.

**Step 4: Commit**
```bash
git add cricket-flows/live-cricket-companion-chat.html
git commit -m "feat: Bigg Boss buzz cross-promo in moments view"
```

---

### Task 7: Post-Match Shareable Card

**Files:**
- Modify: `cricket-flows/live-cricket-companion-chat.html` — CSS + JS sections

**Step 1: Add CSS for post-match card**

Add before `</style>`:

```css
/* ─── POST-MATCH CARD ─── */
.postmatch-card { background: var(--surface); border: 1px solid rgba(36,38,43,0.12); border-radius: var(--shape-large); overflow: hidden; animation: cardIn 0.3s ease; }
.postmatch-header { background: var(--surface-bold); padding: 14px 16px; color: #fff; }
.postmatch-result { font-size: 16px; font-weight: 800; letter-spacing: -0.02em; }
.postmatch-match { font-size: 11px; opacity: 0.6; margin-top: 2px; }
.postmatch-body { padding: 14px 16px; }
.postmatch-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--grey-20); }
.postmatch-row:last-child { border-bottom: none; }
.postmatch-label { font-size: 11px; color: var(--text-low); font-weight: 500; }
.postmatch-value { font-size: 13px; font-weight: 700; color: var(--text-high); text-align: right; }
.postmatch-value.highlight { color: var(--sparkle-60); }
.postmatch-value.rank { color: var(--primary-50); }
.postmatch-footer { padding: 0 16px 14px; display: flex; gap: 8px; }
.postmatch-share-btn { flex: 1; padding: 10px; border: none; border-radius: var(--shape-small); font-family: var(--font); font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
.postmatch-share-btn svg { width: 16px; height: 16px; }
.postmatch-share-btn.wa { background: #25D366; color: #fff; }
.postmatch-share-btn.wa svg { fill: #fff; }
.postmatch-share-btn.copy { background: var(--surface-ghost); color: var(--text-high); }
.postmatch-share-btn.copy svg { fill: var(--icon-high); }
.postmatch-brand { text-align: center; font-size: 9px; color: var(--text-low); padding: 8px 16px 12px; font-weight: 500; letter-spacing: 0.04em; }
```

**Step 2: Add renderPostMatch function and trigger**

Insert before `startCompanion()`:

```javascript
/* ─── POST-MATCH CARD ─── */
function renderPostMatch() {
  addMsg('ai', 'Match khatam! What a game. Here\'s your match card — share it with your gang:');
  setTimeout(() => {
    addWidget(`<div class="postmatch-card">
      <div class="postmatch-header">
        <div class="postmatch-result">RCB beat MI by 4 wickets</div>
        <div class="postmatch-match">IPL 2026 · Match 23 · Wankhede Stadium</div>
      </div>
      <div class="postmatch-body">
        <div class="postmatch-row">
          <div class="postmatch-label">Your Predictions</div>
          <div class="postmatch-value highlight">7/10 correct — Prediction King</div>
        </div>
        <div class="postmatch-row">
          <div class="postmatch-label">Top Performer</div>
          <div class="postmatch-value">Kohli: 89(48) — Player of the Match</div>
        </div>
        <div class="postmatch-row">
          <div class="postmatch-label">Your Rank</div>
          <div class="postmatch-value rank">#1 in your group</div>
        </div>
        <div class="postmatch-row">
          <div class="postmatch-label">Points Earned</div>
          <div class="postmatch-value">${predictionPoints} pts (+320 today)</div>
        </div>
      </div>
      <div class="postmatch-footer">
        <button class="postmatch-share-btn wa" onclick="showToast('Shared to WhatsApp!')">${IC.whatsapp} Share to WhatsApp</button>
        <button class="postmatch-share-btn copy" onclick="showToast('Card copied!')">${IC.share} Copy Card</button>
      </div>
      <div class="postmatch-brand">Jio Cricket Companion · IPL 2026</div>
    </div>`);
  }, 300);
}
```

**Step 3: Add "end match" trigger via chat keyword**

In `sendUserMsg()`, add this case in the keyword detection (before the default fallback):

```javascript
    } else if (lower.includes('end') || lower.includes('result') || lower.includes('finish') || lower.includes('post match') || lower.includes('share card')) {
      renderPostMatch();
```

**Step 4: Verify** — Type "end match" or "show result" in chat → post-match card appears. WhatsApp share button → toast.

**Step 5: Commit**
```bash
git add cricket-flows/live-cricket-companion-chat.html
git commit -m "feat: post-match WhatsApp-style shareable card"
```

---

### Task 8: Wire Up Complete Mega Journey + Season Leaderboard

**Files:**
- Modify: `cricket-flows/live-cricket-companion-chat.html` — JS section

**Step 1: Add CSS for season leaderboard card**

Add before `</style>`:

```css
/* ─── SEASON LEADERBOARD ─── */
.season-lb { background: var(--surface); border: 1px solid rgba(36,38,43,0.12); border-radius: var(--shape-large); padding: 14px; animation: cardIn 0.3s ease; }
.season-lb-title { font-size: 14px; font-weight: 800; color: var(--text-high); margin-bottom: 2px; }
.season-lb-sub { font-size: 11px; color: var(--text-low); margin-bottom: 12px; }
.season-lb-rank { display: flex; align-items: center; gap: 12px; padding: 10px; background: linear-gradient(135deg, var(--primary-20) 0%, var(--surface) 100%); border-radius: var(--shape-medium); margin-bottom: 10px; }
.season-lb-rank-num { font-size: 28px; font-weight: 900; color: var(--primary-50); }
.season-lb-rank-info { flex: 1; }
.season-lb-rank-label { font-size: 12px; font-weight: 700; color: var(--text-high); }
.season-lb-rank-sub { font-size: 10px; color: var(--text-low); }
.season-lb-share { width: 100%; padding: 10px; border: 1px solid var(--primary-30); background: transparent; border-radius: var(--shape-small); font-family: var(--font); font-size: 12px; font-weight: 700; color: var(--primary-50); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
.season-lb-share svg { width: 14px; height: 14px; fill: var(--primary-50); }
```

**Step 2: Add season leaderboard in renderLeaderboardView**

At the end of `renderLeaderboardView()`, after the "Share leaderboard" button widget, add:

```javascript
    // Season leaderboard
    setTimeout(() => {
      addWidget(`<div class="season-lb">
        <div class="season-lb-title">Season Leaderboard</div>
        <div class="season-lb-sub">IPL 2026 · All matches · Your prediction rank</div>
        <div class="season-lb-rank">
          <div class="season-lb-rank-num">#4</div>
          <div class="season-lb-rank-info">
            <div class="season-lb-rank-label">Out of 12,847 players</div>
            <div class="season-lb-rank-sub">Top 0.03% · 24 matches played</div>
          </div>
        </div>
        <div class="stats-grid" style="margin-bottom:10px">
          <div class="stat-cell"><div class="stat-val">73%</div><div class="stat-label">Season Acc.</div><div class="stat-sub">Top 5%</div></div>
          <div class="stat-cell"><div class="stat-val">2840</div><div class="stat-label">Total Pts</div><div class="stat-sub">This season</div></div>
          <div class="stat-cell"><div class="stat-val">12</div><div class="stat-label">Best Streak</div><div class="stat-sub">vs CSK</div></div>
        </div>
        <button class="season-lb-share" onclick="showToast('Season rank card shared!')">${IC.share} Share Season Rank Card</button>
      </div>`);
    }, 800);
```

**Step 3: Verify** — Full journey test:
1. Page loads → match picker
2. Tap MI vs RCB → companion loads with enhanced score banner + 3 action buttons
3. Type "predict" → aggregate polls + prediction cards
4. Type "Rohit ka form" → player card + follow toggle
5. Type "live moments" → moment cards + Bigg Boss buzz
6. View leaderboard → group board + season leaderboard
7. Type "end match" → post-match shareable card

**Step 4: Commit**
```bash
git add cricket-flows/live-cricket-companion-chat.html
git commit -m "feat: season leaderboard and complete mega journey wiring"
```

---

## Summary of All Changes

| Task | What it adds | Functions | CSS classes |
|------|-------------|-----------|-------------|
| 1 | Match picker CSS | — | `.match-picker`, `.mp-*` |
| 2 | Match picker screen + data | `renderMatchPicker()`, `selectMatch()`, `startCompanion()` | — |
| 3 | Enhanced score banner | Modified `renderScoreBanner()` | `.score-v2-*`, `.score-action-*` |
| 4 | Aggregate polls | `renderPollCard()`, `votePoll()` + data | `.poll-*` |
| 5 | Player cards + follow | `showPlayerCard()`, `toggleFollow()` + data | `.player-*`, `.follow-*` |
| 6 | Bigg Boss buzz | Added in `renderMomentsView()` | `.buzz-*` |
| 7 | Post-match card | `renderPostMatch()` + keyword trigger | `.postmatch-*` |
| 8 | Season leaderboard + wiring | Added in `renderLeaderboardView()` | `.season-lb-*` |
