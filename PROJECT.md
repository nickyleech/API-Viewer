# PA TV API Viewer — Project Documentation

A client-side web application for exploring the Press Association (PA) TV API (v2). No build step required — runs entirely in the browser using vanilla HTML, CSS and JavaScript.

## Tech Stack

- **Vanilla JS** with IIFE module pattern (`const XxxView = (() => { ... return { render }; })()`)
- **SheetJS** (CDN) for multi-sheet Excel export
- **localStorage** for API key and saved channel lists persistence
- **PA TV API v2** at `https://tv.api.pressassociation.io/v2`, authenticated via `apikey` header

## File Structure

### Root

| File | Purpose |
|------|---------|
| `index.html` | Single-page app shell — header, sidebar nav, content area, API key modal, toast container. Loads all scripts and the SheetJS CDN. |
| `PROJECT.md` | This file — project documentation. |

### `css/`

| File | Purpose |
|------|---------|
| `styles.css` | All application styles — layout, sidebar, cards, tables, modals, lightbox, badges, buttons, dropdowns, toast notifications. |

### `js/`

| File | Purpose |
|------|---------|
| `api.js` | **API helper module** (`API`). Handles all communication with the PA TV API. Provides `fetch()` for API calls, API key management (`getApiKey`, `setApiKey`, `hasApiKey`), and shared UI utilities: `showLoading`, `showError`, `showEmpty`, `toast`, `escapeHtml`, `jsonToggle` (collapsible raw JSON viewer), and `extractImages` (pulls image URLs from media arrays). |
| `app.js` | **Application controller** (`App`). Registers all views, handles sidebar navigation and hash-based routing, manages the API key modal, and defaults to the Image Viewer on load. |

### `js/views/`

Each view module follows the same pattern: an IIFE that returns `{ render }`. The `render(container)` function builds the entire view UI into the given DOM element.

| File | View | Description |
|------|------|-------------|
| `platforms.js` | **Platforms** | Lists all platforms from `/platform`. Click a platform to see its detail and associated channels. |
| `channels.js` | **Channels** | Lists all channels from `/channel` in a sortable table (Channel, EPG, API ID, Category, Attributes). Includes Excel download with separate TV and Radio sheets, split by the `attribute` array containing `"radio"`. |
| `epg.js` | **EPG Numbers** | Looks up EPG number assignments. Select a platform, then view channel-to-EPG mappings from `/epg`. |
| `schedule.js` | **Schedule** | Browse the schedule for a channel on a given date from `/schedule`. Shows programme listings with time, title, and details. |
| `images.js` | **Image Viewer** | The main feature — two tabs: **Image Audit** and **By Schedule**. |

### `js/views/` — Unused Files

These view files exist in the repo but are **not loaded** in `index.html` or registered in `app.js`:

| File | Notes |
|------|-------|
| `assets.js` | Previously used for asset browsing — now removed from the app. |
| `catalogues.js` | Previously used for catalogue browsing — now removed from the app. |
| `contributors.js` | Previously used for contributor browsing — now removed from the app. |
| `features.js` | Previously used for feature browsing — now removed from the app. |

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
- Save the current selection as a named list (stored in `localStorage` under `pa_saved_channel_lists`)
- Load, update, or delete saved lists
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

## Data Conventions

- **TV vs Radio channels**: A channel is classified as radio if its `attribute` array contains `"radio"`, otherwise it's TV.
- **Images**: Extracted from `media` arrays on assets and related items via `API.extractImages()`.
- **Dates**: API expects ISO format (`YYYY-MM-DDT00:00:00`), date range capped at 21 days.
