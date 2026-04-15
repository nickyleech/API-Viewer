# PA TV API Viewer — Project Documentation

A client-side web application for exploring the Press Association (PA) TV API (v2). No build step required — runs entirely in the browser using vanilla HTML, CSS and JavaScript.

## Tech Stack

- **Vanilla JS** with IIFE module pattern (`const XxxView = (() => { ... return { render }; })()`)
- **SheetJS** (CDN) for multi-sheet Excel export
- **GitHub Contents API** for shared, version-controlled channel list storage (`data/channel-lists.json`)
- **localStorage** for API key, GitHub token, and offline fallback
- **PA TV API v2** at `https://tv.api.pressassociation.io/v2`, authenticated via `apikey` header

## File Structure

### Root

| File | Purpose |
|------|---------|
| `index.html` | Single-page app shell — header, sidebar nav, content area, Settings modal, toast container. Loads all scripts and the SheetJS CDN. Script version cache-busting via `?v=3` query params. |
| `PROJECT.md` | This file — project documentation. |

### `css/`

| File | Purpose |
|------|---------|
| `styles.css` | All application styles — layout, sidebar, cards, tables, modals, lightbox, badges, buttons, dropdowns, toast notifications, dark mode (`prefers-color-scheme` and `[data-theme="dark"]`), touch targets (`@pointer:coarse`), reduced motion, Unicode highlight styles, Unicode info dropdown, focus-visible indicators, ARIA-accessible modal. |

### `js/`

| File | Purpose |
|------|---------|
| `api.js` | **API helper module** (`API`). Handles all communication with the PA TV API. Provides `fetch()` for API calls, API key management (`getApiKey`, `setApiKey`, `hasApiKey`), and shared UI utilities: `showLoading`, `showError`, `showEmpty`, `toast` (with `aria-live`), `escapeHtml`, `jsonToggle` (collapsible raw JSON viewer with Copy JSON and Review buttons), `extractImages` (pulls image URLs from media arrays), `cancelable(key)` (returns AbortSignal, auto-cancels previous request for same key), `debounce(fn, ms)`, and `smoothScroll(el)` (respects `prefers-reduced-motion`). |
| `github-storage.js` | **GitHub storage module** (`GitHubStorage`). Reads and writes `data/channel-lists.json` via the GitHub Contents API. Provides token management (`getToken`, `setToken`, `hasToken`) and high-level `loadLists()` / `saveLists()` methods. Each save creates a commit in the repo. |
| `review-store.js` | **Review store module** (`ReviewStore`). Manages the review list — programmes flagged for review from Schedule or Image Viewer. Stores items in localStorage with in-memory cache. Provides `openReviewModal()` to flag a programme, and CRUD operations for review items. Syncs badge count in the sidebar. |
| `app.js` | **Application controller** (`App`). Registers all views, handles sidebar navigation and hash-based routing, manages the Settings modal (API key + GitHub token), and defaults to the Image Viewer on load. |

### `js/components/`

Shared components used across multiple views.

| File | Purpose |
|------|---------|
| `channel-dropdown.js` | **Channel dropdown** (`ChannelDropdown`). Reusable searchable channel selector with keyboard navigation and ARIA attributes. `ChannelDropdown.init(config)` accepts `inputId`, `dropdownId`, `hiddenId`, `getChannels`, and `onSelect`. Used by Schedule, Image Viewer, Logos, and EPG views. |
| `programme-detail.js` | **Programme detail renderer** (`ProgrammeDetail`). Shared component that renders full programme metadata into a panel. `ProgrammeDetail.render(panel, item, opts)` displays broadcast info, episode info, summaries, categories, attributes, certification, VOD availability, soundtrack, locations, keywords, mood, themes, media images, related assets, subject codes, contributors (collapsible with Cast/Crew split), and empty field toggle. Used by Schedule and Image Viewer detail views. |

### `js/views/`

Each view module follows the same pattern: an IIFE that returns `{ render }`. The `render(container)` function builds the entire view UI into the given DOM element.

| File | View | Description |
|------|------|-------------|
| `images.js` | **Image Viewer** | The main feature — two tabs: **Image Audit** and **By Schedule**. See detailed section below. |
| `schedule.js` | **Schedule** | Browse the schedule for a channel on a given date from `/schedule`. Shows programme listings with time, title, and details. Includes **Check Unicode** button to scan all programme text fields for encoding issues, with a **?** info dropdown listing all checks performed. Features DST-safe date handling via `localDateStr()` helper. |
| `epg.js` | **EPG Numbers** | Looks up EPG number assignments. Three tabs: **EPG Numbers** (platform channel list sorted by EPG number, filterable by region, CSV download), **Variations** (compare EPG numbers across regions within a platform), **Channel Lookup** (search for channels to see EPG numbers across all platforms). |
| `channels.js` | **Channels** | Lists all channels from `/channel` in a sortable table (Channel, EPG, API ID, Category, Attributes). Includes Excel download with separate TV and Radio sheets, split by the `attribute` array containing `"radio"`. |
| `platforms.js` | **Platforms** | Lists all platforms from `/platform`. Click a platform to see its detail and associated channels. |
| `logos.js` | **Logos** | Browse channel logos. Search for a single channel or load all logos at once. Displays logo images with metadata. Batch loading with progress tracking. |
| `review.js` | **Review List** | Displays programmes flagged for review. Filter by source (Schedule / Images / All). View programme details or remove items. Badge count shown in sidebar nav. |
| `instructions.js` | **Instructions** | Quick reference guide for each section of the app. Displays as a responsive card grid with links to each view. |

## Schedule View — Check Unicode

The Schedule view includes a **Check Unicode** button that scans all programme text fields for encoding issues. A **?** info button next to it shows a dropdown listing everything the checker looks for.

### Unicode Errors (flagged as issues)

- **Replacement character** (`U+FFFD`) — indicates failed decoding
- **Mojibake / double-encoded UTF-8** — e.g. `Ã©` instead of `é`
- **Unresolved HTML entities** — e.g. `&amp;`, `&#233;`
- **Invisible / zero-width characters** — 20 types including Non-Breaking Space (`U+00A0`), Soft Hyphen (`U+00AD`), Zero-Width Space/Joiner/Non-Joiner (`U+200B–D`), LTR/RTL marks (`U+200E–F`), Line/Paragraph separators (`U+2028–9`), Bidi controls (`U+202A–E`), Word Joiner (`U+2060`), Directional Isolates (`U+2066–9`), BOM (`U+FEFF`)
- **C0/C1 control characters** — `U+0000–001F` and `U+007F–9F` (except tab, newline, carriage return)
- **Private Use Area** — `U+E000–F8FF`

### Non-ASCII Summary

All characters with codepoint > 127 are categorised by Unicode range (40+ ranges defined including Latin-1 Supplement, Latin Extended, Greek, Cyrillic, Arabic, Hebrew, CJK, Emoji, Arrows, Math Operators, Currency Symbols, Box Drawing, etc.). Displayed as a collapsible summary table with count, unique characters, and affected programmes per range. Each range row is expandable to show the individual programmes with time, title, fields, and characters found.

### Text Fields Checked

Title, Episode Title, Summaries (Short/Medium/Long at programme and asset level), Contributor names and character names, Categories, Keywords, Locations, Mood, Themes, Soundtrack.

## Image Viewer — Detail

The Image Viewer (`images.js`) is the most complex view with two tabs:

### Image Audit Tab (default)

Audits image coverage across multiple channels over a date range.

**Channel selection:**
- Search box to find and add channels one at a time
- TV/Radio checkboxes to filter channels by type
- "Browse All Channels" button opens a scrollable checkbox list for easy multi-select
- Selected channels appear as removable chips

**Saved channel lists:**
- Save the current selection as a named list (stored in `data/channel-lists.json` in the GitHub repo via the Contents API)
- Load, update, or delete saved lists — each change creates a descriptive commit
- Lists are shared across all users with repo access
- Falls back to `localStorage` if GitHub is unavailable; existing localStorage lists auto-migrate to GitHub on first load with a token
- Update button overwrites the active list with the current selection

**Audit execution:**
- Fetches schedule data for each selected channel across the chosen date range
- Batches API calls (5 concurrent per channel) with a progress bar
- Results table shows per-channel image coverage (total, with images, missing, percentage)
- Click a row to drill down and see which programmes are missing images
- Export results to Excel (Summary + Missing Images sheets)

### By Schedule Tab

Browse programme images for a single channel on a given date.

- Channel search dropdown, date picker, and day range selector
- Filter results by: All / With Images / Without Images
- Day navigation (previous/next day buttons)
- Click a programme to see full detail: broadcast info, images gallery with lightbox, raw JSON toggle

### `data/`

| File | Purpose |
|------|---------|
| `channel-lists.json` | Saved channel lists, managed via the GitHub Contents API. Format: `{ "version": 1, "lists": [{ "name": "...", "channels": [{ "id": "...", "title": "..." }] }] }`. Each save/update/delete creates a commit. |

## GitHub Storage

Channel lists are stored as a JSON file in the repository rather than in browser localStorage. This means lists are shared across team members and persist across browsers/devices.

**Setup:** In Settings, provide a fine-grained GitHub Personal Access Token scoped to this repository with "Contents: Read and write" permission. Without a token, existing lists can be loaded (if the repo is public) but not saved.

**How it works:**
- `GitHubStorage.loadLists()` reads `data/channel-lists.json` via `GET /repos/{owner}/{repo}/contents/{path}`
- `GitHubStorage.saveLists()` writes the file via `PUT`, creating a commit with a descriptive message
- The GitHub API requires the file's current SHA for updates, tracked internally to prevent conflicts
- localStorage is always kept in sync as an offline fallback

**Migration:** If a user has existing lists in localStorage and configures a GitHub token, lists are automatically pushed to GitHub on the next page load.

## Data Conventions

- **TV vs Radio channels**: A channel is classified as radio if its `attribute` array contains `"radio"`, otherwise it's TV.
- **Images**: Extracted from `media` arrays on assets and related items via `API.extractImages()`.
- **Dates**: API expects ISO format (`YYYY-MM-DDT00:00:00`). Date range capped at 21 days for audits. Schedule view uses `localDateStr()` for DST-safe local date formatting (avoids `toISOString()` which converts to UTC and breaks on BST clock-change days).
- **Dark mode**: Automatically follows `prefers-color-scheme`; also supports manual toggle via `[data-theme="dark"]` attribute on `<body>`.
- **Accessibility**: ARIA attributes on modals (`role=dialog`, `aria-modal`), focus trap and Escape-to-close on modal, `aria-live` on toast notifications, `focus-visible` indicators, keyboard navigation on channel dropdowns.
