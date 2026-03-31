const ImagesView = (() => {
    // === Schedule tab state ===
    let allChannels = [];
    let scheduleItems = [];
    let savedListView = null;
    let currentFilter = 'all';

    // === Programme tab state ===
    let catalogues = [];
    let programmeResults = [];
    let savedProgrammeView = null;
    let currentCatalogueId = '';

    // === Audit tab state ===
    let auditSelectedChannels = [];
    let auditResults = [];
    let auditInProgress = false;

    async function render(container) {
        const today = new Date().toISOString().slice(0, 10);
        container.innerHTML = `
            <div class="view-header">
                <h2>Image Viewer</h2>
                <p>Browse programme images by schedule or search for a programme by name.</p>
            </div>
            <div class="view-tabs">
                <button class="view-tab active" data-tab="schedule">By Schedule</button>
                <button class="view-tab" data-tab="programme">By Programme</button>
                <button class="view-tab" data-tab="audit">Image Audit</button>
            </div>

            <div id="tab-schedule" class="tab-panel active">
                <div class="filter-bar">
                    <div class="form-group" style="flex:1;min-width:250px">
                        <label>Channel</label>
                        <input type="text" id="img-channel-search" class="input" placeholder="Type to search channels..." style="width:100%" autocomplete="off">
                        <div id="img-channel-dropdown" class="channel-dropdown"></div>
                        <input type="hidden" id="img-channel-id">
                    </div>
                    <div class="form-group">
                        <label>Start Date</label>
                        <input type="date" id="img-start" class="input" style="min-width:160px" value="${today}">
                    </div>
                    <div class="form-group">
                        <label>Date Range</label>
                        <div style="display:flex;gap:8px;align-items:center">
                            <select id="img-range-type" class="select" style="min-width:120px">
                                <option value="days">Number of days</option>
                                <option value="end">End date</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group" id="img-days-group">
                        <label>Days</label>
                        <select id="img-days" class="select" style="min-width:80px">
                            <option value="1" selected>1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="5">5</option>
                            <option value="7">7</option>
                            <option value="14">14</option>
                            <option value="21">21</option>
                        </select>
                    </div>
                    <div class="form-group" id="img-end-group" style="display:none">
                        <label>End Date</label>
                        <input type="date" id="img-end" class="input" style="min-width:160px">
                    </div>
                    <div class="form-group">
                        <label>&nbsp;</label>
                        <button id="img-load" class="btn btn-primary">Load Programmes</button>
                    </div>
                </div>
                <div id="img-day-nav" style="display:none"></div>
                <div id="img-filter-bar" style="display:none">
                    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
                        <span style="font-size:14px;font-weight:600;color:var(--color-text-secondary)">Show:</span>
                        <button id="img-filter-all" class="btn btn-sm btn-primary">All Programmes</button>
                        <button id="img-filter-with" class="btn btn-sm btn-secondary">With Images <span id="img-count-with" class="badge badge-green" style="margin-left:4px">0</span></button>
                        <button id="img-filter-without" class="btn btn-sm btn-secondary">Without Images <span id="img-count-without" class="badge badge-orange" style="margin-left:4px">0</span></button>
                    </div>
                </div>
                <div id="img-results"></div>
            </div>

            <div id="tab-programme" class="tab-panel">
                <div class="filter-bar">
                    <div class="form-group">
                        <label>Catalogue</label>
                        <select id="prog-catalogue" class="select" style="min-width:200px">
                            <option value="">Loading...</option>
                        </select>
                    </div>
                    <div class="form-group" style="flex:1;min-width:250px">
                        <label>Programme Name</label>
                        <input type="text" id="prog-title" class="input" placeholder="e.g. Coronation Street, Peppa Pig..." style="width:100%">
                    </div>
                    <div class="form-group">
                        <label>&nbsp;</label>
                        <button id="prog-search" class="btn btn-primary">Search</button>
                    </div>
                </div>
                <div id="prog-results"></div>
            </div>

            <div id="tab-audit" class="tab-panel">
                <div class="filter-bar">
                    <div class="form-group" style="flex:1;min-width:300px">
                        <label>Add Channels</label>
                        <input type="text" id="audit-channel-search" class="input" placeholder="Type to search and add channels..." style="width:100%" autocomplete="off">
                        <div id="audit-channel-dropdown" class="channel-dropdown"></div>
                    </div>
                    <div class="form-group">
                        <label>Saved Lists</label>
                        <select id="audit-saved-lists" class="select" style="min-width:180px">
                            <option value="">Load a saved list...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>&nbsp;</label>
                        <div style="display:flex;gap:6px">
                            <button id="audit-save-list" class="btn btn-sm btn-secondary">Save List</button>
                            <button id="audit-update-list" class="btn btn-sm btn-secondary" disabled>Update</button>
                            <button id="audit-delete-list" class="btn btn-sm btn-secondary">Delete</button>
                        </div>
                    </div>
                </div>
                <div id="audit-selected-chips" style="display:none;margin-bottom:16px">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                        <span style="font-size:12px;font-weight:600;color:var(--color-text-secondary)">SELECTED CHANNELS</span>
                        <button id="audit-clear-all" class="btn btn-sm btn-secondary" style="font-size:11px;padding:2px 8px">Clear All</button>
                    </div>
                    <div id="audit-chips-container" style="display:flex;gap:6px;flex-wrap:wrap"></div>
                </div>
                <div class="filter-bar">
                    <div class="form-group">
                        <label>Start Date</label>
                        <input type="date" id="audit-start" class="input" style="min-width:160px" value="${today}">
                    </div>
                    <div class="form-group">
                        <label>Number of Days</label>
                        <select id="audit-days" class="select" style="min-width:120px">
                            <option value="1" selected>1 day</option>
                            <option value="2">2 days</option>
                            <option value="3">3 days</option>
                            <option value="5">5 days</option>
                            <option value="7">7 days</option>
                            <option value="14">14 days</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>&nbsp;</label>
                        <button id="audit-run" class="btn btn-primary">Run Audit</button>
                    </div>
                </div>
                <div id="audit-progress" style="display:none"></div>
                <div id="audit-results"></div>
            </div>
        `;

        // Tab switching
        container.querySelectorAll('.view-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                container.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
                container.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
            });
        });

        // Schedule tab setup
        setupChannelSearch();
        setupRangeToggle();
        document.getElementById('img-load').addEventListener('click', loadProgrammes);
        document.getElementById('img-filter-all').addEventListener('click', () => applyFilter('all'));
        document.getElementById('img-filter-with').addEventListener('click', () => applyFilter('with'));
        document.getElementById('img-filter-without').addEventListener('click', () => applyFilter('without'));

        // Programme tab setup
        document.getElementById('prog-search').addEventListener('click', searchProgrammes);
        document.getElementById('prog-title').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') searchProgrammes();
        });

        // Audit tab setup
        setupAuditTab();

        // Load data for all tabs in parallel
        await Promise.all([loadAllChannels(), loadCatalogues()]);
    }

    // ============================================================
    // SCHEDULE TAB — existing functionality
    // ============================================================

    async function loadAllChannels() {
        try {
            const data = await API.fetch('/channel');
            allChannels = (data.item || []).sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        } catch (err) {
            allChannels = [];
        }
    }

    function setupChannelSearch() {
        const input = document.getElementById('img-channel-search');
        const dropdown = document.getElementById('img-channel-dropdown');
        const hiddenId = document.getElementById('img-channel-id');

        input.addEventListener('focus', () => {
            if (input.value.trim()) showDropdown();
        });
        input.addEventListener('input', () => showDropdown());

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#img-channel-search') && !e.target.closest('#img-channel-dropdown')) {
                dropdown.style.display = 'none';
            }
        });

        function showDropdown() {
            const query = (input.value || '').toLowerCase().trim();

            if (allChannels.length === 0) {
                dropdown.innerHTML = '<div class="dropdown-empty">Loading channels...</div>';
                dropdown.style.display = 'block';
                return;
            }

            if (!query) {
                dropdown.style.display = 'none';
                return;
            }

            const filtered = allChannels.filter(ch => (ch.title || '').toLowerCase().includes(query));

            if (filtered.length === 0) {
                dropdown.innerHTML = '<div class="dropdown-empty">No channels found</div>';
                dropdown.style.display = 'block';
                return;
            }

            dropdown.innerHTML = '';
            filtered.slice(0, 50).forEach(ch => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.innerHTML = `<strong>${API.escapeHtml(ch.title)}</strong><span class="dropdown-id">${API.escapeHtml(ch.id)}</span>`;
                item.addEventListener('click', () => {
                    input.value = ch.title;
                    hiddenId.value = ch.id;
                    dropdown.style.display = 'none';
                });
                dropdown.appendChild(item);
            });

            if (filtered.length > 50) {
                const more = document.createElement('div');
                more.className = 'dropdown-empty';
                more.textContent = `${filtered.length - 50} more \u2014 keep typing to narrow results`;
                dropdown.appendChild(more);
            }

            dropdown.style.display = 'block';
        }
    }

    function setupRangeToggle() {
        const rangeType = document.getElementById('img-range-type');
        const daysGroup = document.getElementById('img-days-group');
        const endGroup = document.getElementById('img-end-group');

        rangeType.addEventListener('change', () => {
            if (rangeType.value === 'days') {
                daysGroup.style.display = '';
                endGroup.style.display = 'none';
            } else {
                daysGroup.style.display = 'none';
                endGroup.style.display = '';
            }
        });
    }

    function getDateRange() {
        const start = document.getElementById('img-start').value;
        if (!start) return null;

        const rangeType = document.getElementById('img-range-type').value;
        let end;

        if (rangeType === 'days') {
            const days = parseInt(document.getElementById('img-days').value);
            const endDate = new Date(start);
            endDate.setDate(endDate.getDate() + days);
            end = endDate.toISOString().slice(0, 10);
        } else {
            end = document.getElementById('img-end').value;
            if (!end) return null;
        }

        const diffDays = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24);
        if (diffDays > 21) {
            API.toast('Date range cannot exceed 21 days.', 'warning');
            return null;
        }
        if (diffDays <= 0) {
            API.toast('End date must be after start date.', 'warning');
            return null;
        }

        return { start, end };
    }

    async function loadProgrammes() {
        const results = document.getElementById('img-results');
        const channelId = document.getElementById('img-channel-id').value;

        if (!channelId) {
            API.toast('Please select a channel.', 'warning');
            return;
        }

        const range = getDateRange();
        if (!range) return;

        const params = {
            channelId,
            start: `${range.start}T00:00:00`,
            end: `${range.end}T00:00:00`
        };

        API.showLoading(results);
        try {
            const data = await API.fetch('/schedule', params);
            scheduleItems = data.item || [];
            updateCounts();
            document.getElementById('img-filter-bar').style.display = '';
            renderImgDayNav();
            applyFilter('all');
        } catch (err) {
            scheduleItems = [];
            document.getElementById('img-filter-bar').style.display = 'none';
            document.getElementById('img-day-nav').style.display = 'none';
            API.showError(results, err.message);
        }
    }

    function renderImgDayNav() {
        const nav = document.getElementById('img-day-nav');
        const startDate = document.getElementById('img-start').value;
        const dt = new Date(startDate);
        const dateStr = dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

        nav.style.display = '';
        nav.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:16px;">
                <button id="img-prev-day" class="btn btn-sm btn-secondary">&larr; Previous Day</button>
                <span style="font-weight:600;font-size:15px;min-width:260px;text-align:center">${API.escapeHtml(dateStr)}</span>
                <button id="img-next-day" class="btn btn-sm btn-secondary">Next Day &rarr;</button>
            </div>
        `;

        document.getElementById('img-prev-day').addEventListener('click', () => shiftImgDay(-1));
        document.getElementById('img-next-day').addEventListener('click', () => shiftImgDay(1));
    }

    function shiftImgDay(offset) {
        const dateInput = document.getElementById('img-start');
        const dt = new Date(dateInput.value);
        dt.setDate(dt.getDate() + offset);
        dateInput.value = dt.toISOString().slice(0, 10);
        loadProgrammes();
    }

    function getImages(item) {
        const asset = item.asset || {};
        const allMedia = [];
        const assetMedia = asset.media || item.media || [];
        (Array.isArray(assetMedia) ? assetMedia : [assetMedia]).forEach(m => { if (m) allMedia.push(m); });
        (asset.related || []).forEach(rel => {
            (Array.isArray(rel.media) ? rel.media : rel.media ? [rel.media] : []).forEach(m => { if (m) allMedia.push(m); });
        });
        return API.extractImages(allMedia);
    }

    function updateCounts() {
        const withImages = scheduleItems.filter(item => getImages(item).length > 0).length;
        const withoutImages = scheduleItems.length - withImages;
        document.getElementById('img-count-with').textContent = withImages;
        document.getElementById('img-count-without').textContent = withoutImages;
    }

    function applyFilter(filter) {
        currentFilter = filter;
        ['all', 'with', 'without'].forEach(f => {
            const btn = document.getElementById(`img-filter-${f}`);
            btn.className = `btn btn-sm ${f === filter ? 'btn-primary' : 'btn-secondary'}`;
        });

        let filtered;
        if (filter === 'with') {
            filtered = scheduleItems.filter(item => getImages(item).length > 0);
        } else if (filter === 'without') {
            filtered = scheduleItems.filter(item => getImages(item).length === 0);
        } else {
            filtered = scheduleItems;
        }

        renderProgrammes(document.getElementById('img-results'), filtered, filter);
    }

    function renderProgrammes(container, items, filter) {
        container.innerHTML = '';

        if (items.length === 0) {
            const msgs = {
                all: 'No programmes found for this channel and date range.',
                with: 'No programmes with images found.',
                without: 'All programmes have images!'
            };
            API.showEmpty(container, msgs[filter] || msgs.all);
            return;
        }

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `${items.length} programme(s)`;
        container.appendChild(info);

        items.forEach(item => {
            const images = getImages(item);
            const hasImages = images.length > 0;
            const dt = item.dateTime ? new Date(item.dateTime) : null;
            const time = dt ? dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-';
            const date = dt ? dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
            const duration = item.duration ? `${item.duration} min` : '';
            const asset = item.asset || {};
            const summary = item.summary || asset.summary || {};

            const card = document.createElement('div');
            card.className = 'card clickable';
            if (!hasImages) {
                card.style.borderLeftColor = 'var(--color-warning)';
                card.style.borderLeftWidth = '3px';
            }

            card.innerHTML = `
                <div style="display:flex;gap:16px;align-items:start">
                    <div style="min-width:70px;text-align:center">
                        <div style="font-size:18px;font-weight:700;color:var(--color-accent)">${API.escapeHtml(time)}</div>
                        <div style="font-size:11px;color:var(--color-text-secondary)">${API.escapeHtml(date)}</div>
                        ${duration ? `<div style="font-size:11px;color:var(--color-text-secondary)">${API.escapeHtml(duration)}</div>` : ''}
                    </div>
                    <div style="flex:1">
                        <div class="card-title">${API.escapeHtml(item.title || 'Untitled')}</div>
                        ${summary.short ? `<p style="margin:4px 0 0;font-size:13px;color:var(--color-text-secondary)">${API.escapeHtml(summary.short)}</p>` : ''}
                        <div class="card-meta" style="margin-top:6px">
                            ${hasImages
                                ? `<span class="badge badge-green">${images.length} image(s)</span>`
                                : '<span class="badge badge-orange">No images</span>'}
                            ${asset.type ? `<span class="badge badge-purple">${API.escapeHtml(asset.type)}</span>` : ''}
                        </div>
                        ${hasImages ? `
                            <div class="img-thumbs" style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
                                ${images.slice(0, 4).map(r => `<img src="${API.escapeHtml(r.href)}" style="max-width:180px;max-height:120px;border-radius:4px;object-fit:cover;border:1px solid var(--color-border);cursor:pointer" alt="" onclick="event.stopPropagation()">`).join('')}
                                ${images.length > 4 ? `<span style="align-self:center;font-size:12px;color:var(--color-text-secondary)">+${images.length - 4} more</span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;

            card.addEventListener('click', () => showProgrammeDetail(item));
            container.appendChild(card);
        });
    }

    function restoreListView() {
        const container = document.getElementById('content');
        if (savedListView) {
            container.innerHTML = '';
            container.appendChild(savedListView);
            savedListView = null;
        } else {
            render(container);
        }
    }

    function showProgrammeDetail(item) {
        const container = document.getElementById('content');

        savedListView = document.createDocumentFragment();
        while (container.firstChild) {
            savedListView.appendChild(container.firstChild);
        }

        const back = document.createElement('a');
        back.className = 'back-link';
        back.innerHTML = '&larr; Back to Image Viewer';
        back.addEventListener('click', () => restoreListView());
        container.appendChild(back);

        const images = getImages(item);
        const dt = item.dateTime ? new Date(item.dateTime) : null;
        const timeStr = dt ? dt.toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
        const asset = item.asset || {};
        const summary = item.summary || asset.summary || {};
        const cats = (asset.category || []).map(c => c.name).join(', ');
        const certification = item.certification || asset.certification || {};
        const certEntries = Object.entries(certification).map(([k, v]) => `${k}: ${v}`).join(', ');

        const panel = document.createElement('div');
        panel.className = 'detail-panel';
        panel.innerHTML = `
            <h3>${API.escapeHtml(item.title || 'Untitled')}</h3>
            <div class="detail-row"><div class="detail-label">Broadcast</div><div class="detail-value">${API.escapeHtml(timeStr)}</div></div>
            ${item.duration ? `<div class="detail-row"><div class="detail-label">Duration</div><div class="detail-value">${item.duration} minutes</div></div>` : ''}
            ${asset.type ? `<div class="detail-row"><div class="detail-label">Type</div><div class="detail-value"><span class="badge badge-purple">${API.escapeHtml(asset.type)}</span></div></div>` : ''}
            ${asset.id ? `<div class="detail-row"><div class="detail-label">Asset ID</div><div class="detail-value"><code style="font-size:12px;user-select:all">${API.escapeHtml(asset.id)}</code></div></div>` : ''}
            ${cats ? `<div class="detail-row"><div class="detail-label">Categories</div><div class="detail-value">${API.escapeHtml(cats)}</div></div>` : ''}
            ${certEntries ? `<div class="detail-row"><div class="detail-label">Certification</div><div class="detail-value">${API.escapeHtml(certEntries)}</div></div>` : ''}
            ${summary.short ? `<div class="detail-row"><div class="detail-label">Summary</div><div class="detail-value">${API.escapeHtml(summary.short)}</div></div>` : ''}
            ${summary.medium ? `<div class="detail-row"><div class="detail-label">Description</div><div class="detail-value">${API.escapeHtml(summary.medium)}</div></div>` : ''}
            ${summary.long ? `<div class="detail-row"><div class="detail-label">Full Description</div><div class="detail-value">${API.escapeHtml(summary.long)}</div></div>` : ''}
        `;
        container.appendChild(panel);

        renderImageGallery(container, images, item.title);

        const jsonSection = document.createElement('div');
        jsonSection.style.marginTop = '16px';
        jsonSection.appendChild(API.jsonToggle(item));
        container.appendChild(jsonSection);
    }

    // ============================================================
    // PROGRAMME TAB — new functionality
    // ============================================================

    async function loadCatalogues() {
        const sel = document.getElementById('prog-catalogue');
        try {
            const data = await API.fetch('/catalogue');
            catalogues = data.item || data.items || [];
            sel.innerHTML = '';
            catalogues.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.id;
                opt.textContent = cat.name || cat.title || cat.id;
                sel.appendChild(opt);
            });
            if (catalogues.length === 0) {
                sel.innerHTML = '<option value="">No catalogues available</option>';
            }
        } catch (err) {
            sel.innerHTML = '<option value="">Error loading catalogues</option>';
        }
    }

    // Extract type from catalogue asset - may be at top level or nested in .asset
    function getAssetType(item) {
        return item.type || (item.asset && item.asset.type) || '';
    }

    // Extract the actual asset ID - may be at top level or nested in .asset
    function getAssetId(item) {
        return item.id || (item.asset && item.asset.id) || '';
    }

    async function searchProgrammes() {
        const results = document.getElementById('prog-results');
        const catalogueId = document.getElementById('prog-catalogue').value;
        const title = document.getElementById('prog-title').value.trim();

        if (!catalogueId) {
            API.toast('Please select a catalogue.', 'warning');
            return;
        }
        if (!title) {
            API.toast('Please enter a programme name.', 'warning');
            return;
        }

        currentCatalogueId = catalogueId;
        API.showLoading(results);
        try {
            const data = await API.fetch(`/catalogue/${catalogueId}/asset`, { title, limit: 50 });
            const basicItems = data.item || [];
            if (basicItems.length === 0) {
                API.showEmpty(results, 'No programmes found matching your search.');
                return;
            }

            // Fetch full details for each result to get type, season/episode info
            results.innerHTML = '';
            const progress = document.createElement('div');
            progress.className = 'results-info';
            progress.textContent = `Loading details for ${basicItems.length} result(s)...`;
            results.appendChild(progress);

            const fullItems = [];
            for (let i = 0; i < basicItems.length; i += 5) {
                const batch = basicItems.slice(i, i + 5);
                const batchResults = await Promise.all(
                    batch.map(item => {
                        const id = getAssetId(item);
                        return API.fetch(`/catalogue/${catalogueId}/asset/${id}`).catch(() => item);
                    })
                );
                fullItems.push(...batchResults);
                progress.textContent = `Loaded ${Math.min(i + 5, basicItems.length)} of ${basicItems.length} result(s)...`;
            }

            programmeResults = fullItems;
            renderProgrammeResults(results, fullItems);
        } catch (err) {
            programmeResults = [];
            API.showError(results, err.message);
        }
    }

    function renderProgrammeResults(container, items) {
        container.innerHTML = '';

        if (items.length === 0) {
            API.showEmpty(container, 'No programmes found matching your search.');
            return;
        }

        // Now we have full details — group by type
        const seriesItems = items.filter(a => a.type === 'series');
        const movieItems = items.filter(a => a.type === 'movie');
        const episodeItems = items.filter(a => a.type === 'episode');
        const otherItems = items.filter(a => !['series', 'movie', 'episode'].includes(a.type || ''));

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `${items.length} result(s)`;
        container.appendChild(info);

        // Render series (clickable to drill down)
        if (seriesItems.length > 0) {
            renderAssetGroup(container, 'Series', seriesItems, 'series');
        }

        // Render movies
        if (movieItems.length > 0) {
            renderAssetGroup(container, 'Movies', movieItems, 'movie');
        }

        // Render episodes grouped by season
        if (episodeItems.length > 0) {
            renderEpisodesBySeason(container, episodeItems);
        }

        // Render other
        if (otherItems.length > 0) {
            renderAssetGroup(container, 'Other', otherItems, 'other');
        }
    }

    function renderAssetGroup(container, label, items, groupType) {
        const heading = document.createElement('h3');
        heading.style.cssText = 'margin:16px 0 8px;font-size:16px;';
        heading.textContent = `${label} (${items.length})`;
        container.appendChild(heading);

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card clickable';

            const typeColors = { movie: 'badge-orange', episode: 'badge-blue', series: 'badge-purple', season: 'badge-green' };
            const typeBadge = `<span class="badge ${typeColors[item.type] || 'badge-gray'}">${API.escapeHtml(item.type || 'unknown')}</span>`;
            const summary = item.summary || {};
            const imgs = API.extractImages(item.media);

            card.innerHTML = `
                <div style="display:flex;gap:12px;align-items:start">
                    ${imgs.length > 0 ? `<img src="${API.escapeHtml(imgs[0].href)}" class="thumb" alt="">` : ''}
                    <div style="flex:1">
                        <div class="card-title">${API.escapeHtml(item.title || 'Untitled')}</div>
                        <div class="card-meta">
                            ${typeBadge}
                            ${item.productionYear ? `<span class="badge badge-gray">${item.productionYear}</span>` : ''}
                            ${imgs.length > 0 ? `<span class="badge badge-green">${imgs.length} image(s)</span>` : ''}
                        </div>
                        ${summary.short ? `<p style="margin:4px 0 0;font-size:13px;color:var(--color-text-secondary)">${API.escapeHtml(summary.short)}</p>` : ''}
                    </div>
                </div>
            `;

            if (item.type === 'series') {
                card.addEventListener('click', () => showSeriesDetail(item));
            } else {
                card.addEventListener('click', () => showAssetImageDetail(item));
            }
            container.appendChild(card);
        });
    }

    function renderEpisodesBySeason(container, episodes) {
        // Group episodes by their parent season (from related links)
        const seasonMap = new Map();
        const noSeason = [];

        episodes.forEach(ep => {
            const seasonRel = (ep.related || []).find(r => r.type === 'season');
            if (seasonRel) {
                if (!seasonMap.has(seasonRel.id)) {
                    seasonMap.set(seasonRel.id, { id: seasonRel.id, episodes: [] });
                }
                seasonMap.get(seasonRel.id).episodes.push(ep);
            } else {
                noSeason.push(ep);
            }
        });

        const heading = document.createElement('h3');
        heading.style.cssText = 'margin:16px 0 8px;font-size:16px;';
        heading.textContent = `Episodes (${episodes.length})`;
        container.appendChild(heading);

        // Sort seasons - try to determine season number from episode data
        const seasonGroups = [...seasonMap.values()];
        seasonGroups.forEach(sg => {
            // Try to extract season number from episode titles or seasonNumber field
            sg.seasonNum = Infinity;
            sg.episodes.forEach(ep => {
                const num = ep.seasonNumber || ep.seriesNumber;
                if (num && num < sg.seasonNum) sg.seasonNum = num;
            });
            if (sg.seasonNum === Infinity) {
                // Try to extract from related season title patterns
                const match = (sg.episodes[0]?.title || '').match(/S(\d+)/i);
                sg.seasonNum = match ? parseInt(match[1]) : 999;
            }
        });
        seasonGroups.sort((a, b) => a.seasonNum - b.seasonNum);

        // Render each season as an accordion
        seasonGroups.forEach(sg => {
            // Sort episodes within season
            sg.episodes.sort((a, b) => {
                const numA = a.episodeNumber || parseInt((a.title || '').match(/(?:Ep(?:isode)?\.?\s*)(\d+)/i)?.[1]) || parseInt((a.title || '').match(/\d+/)?.[0]) || 0;
                const numB = b.episodeNumber || parseInt((b.title || '').match(/(?:Ep(?:isode)?\.?\s*)(\d+)/i)?.[1]) || parseInt((b.title || '').match(/\d+/)?.[0]) || 0;
                return numA - numB;
            });

            const seasonLabel = sg.seasonNum < 999 ? `Season ${sg.seasonNum}` : 'Unknown Season';
            const imgCount = sg.episodes.reduce((sum, ep) => sum + API.extractImages(ep.media).length, 0);

            const wrapper = document.createElement('div');
            wrapper.style.marginBottom = '4px';

            const header = document.createElement('div');
            header.className = 'season-header';
            header.innerHTML = `
                <h4>
                    ${API.escapeHtml(seasonLabel)}
                    <span class="badge badge-gray" style="margin-left:8px">${sg.episodes.length} episode(s)</span>
                    ${imgCount > 0 ? `<span class="badge badge-green" style="margin-left:4px">${imgCount} image(s)</span>` : ''}
                </h4>
                <span class="season-toggle">\u25BC</span>
            `;

            const episodesPanel = document.createElement('div');
            episodesPanel.className = 'season-episodes';

            // Render episode cards inside the panel
            sg.episodes.forEach(ep => {
                renderEpisodeCard(episodesPanel, ep);
            });

            header.addEventListener('click', () => {
                episodesPanel.classList.toggle('open');
                header.querySelector('.season-toggle').classList.toggle('open');
            });

            wrapper.appendChild(header);
            wrapper.appendChild(episodesPanel);
            container.appendChild(wrapper);
        });

        // Episodes with no season
        if (noSeason.length > 0) {
            const wrapper = document.createElement('div');
            wrapper.style.marginBottom = '4px';

            const header = document.createElement('div');
            header.className = 'season-header';
            header.innerHTML = `
                <h4>Unsorted Episodes <span class="badge badge-gray" style="margin-left:8px">${noSeason.length} episode(s)</span></h4>
                <span class="season-toggle">\u25BC</span>
            `;

            const episodesPanel = document.createElement('div');
            episodesPanel.className = 'season-episodes';

            noSeason.forEach(ep => {
                renderEpisodeCard(episodesPanel, ep);
            });

            header.addEventListener('click', () => {
                episodesPanel.classList.toggle('open');
                header.querySelector('.season-toggle').classList.toggle('open');
            });

            wrapper.appendChild(header);
            wrapper.appendChild(episodesPanel);
            container.appendChild(wrapper);
        }
    }

    function renderEpisodeCard(container, ep) {
        const epImgs = API.extractImages(ep.media);
        const summary = ep.summary || {};
        const epNum = ep.episodeNumber;

        const card = document.createElement('div');
        card.className = 'card clickable';
        card.style.marginBottom = '8px';

        card.innerHTML = `
            <div style="display:flex;gap:12px;align-items:start">
                ${epImgs.length > 0 ? `<img src="${API.escapeHtml(epImgs[0].href)}" class="thumb" alt="">` : ''}
                <div style="flex:1">
                    <div class="card-title">
                        ${epNum ? `<span style="color:var(--color-accent);font-weight:700">Ep ${epNum}</span> \u2014 ` : ''}${API.escapeHtml(ep.title || 'Untitled')}
                    </div>
                    <div class="card-meta">
                        <span class="badge badge-blue">episode</span>
                        ${ep.productionYear ? `<span class="badge badge-gray">${ep.productionYear}</span>` : ''}
                        ${epImgs.length > 0 ? `<span class="badge badge-green">${epImgs.length} image(s)</span>` : '<span class="badge badge-orange">No images</span>'}
                    </div>
                    ${summary.short ? `<p style="margin:4px 0 0;font-size:13px;color:var(--color-text-secondary)">${API.escapeHtml(summary.short)}</p>` : ''}
                </div>
            </div>
        `;

        card.addEventListener('click', () => showAssetImageDetail(ep));
        container.appendChild(card);
    }

    function restoreProgrammeView() {
        const container = document.getElementById('content');
        if (savedProgrammeView) {
            container.innerHTML = '';
            container.appendChild(savedProgrammeView);
            savedProgrammeView = null;
        } else {
            render(container);
        }
    }

    async function showSeriesDetail(seriesItem) {
        const container = document.getElementById('content');
        const assetId = getAssetId(seriesItem);

        // Save current view
        savedProgrammeView = document.createDocumentFragment();
        while (container.firstChild) {
            savedProgrammeView.appendChild(container.firstChild);
        }

        const back = document.createElement('a');
        back.className = 'back-link';
        back.innerHTML = '&larr; Back to Search Results';
        back.addEventListener('click', () => restoreProgrammeView());
        container.appendChild(back);

        // Series header
        const panel = document.createElement('div');
        panel.className = 'detail-panel';
        container.appendChild(panel);

        API.showLoading(panel);

        try {
            // Fetch full series detail via catalogue endpoint
            const series = await API.fetch(`/catalogue/${currentCatalogueId}/asset/${assetId}`);
            const summary = series.summary || {};
            const cats = (series.category || []).map(c => c.name).join(', ');
            const seriesImgs = API.extractImages(series.media);

            panel.innerHTML = `
                <h3>${API.escapeHtml(series.title || 'Untitled')}</h3>
                <div class="detail-row"><div class="detail-label">ID</div><div class="detail-value"><code style="font-size:12px;user-select:all">${API.escapeHtml(series.id)}</code></div></div>
                <div class="detail-row"><div class="detail-label">Type</div><div class="detail-value"><span class="badge badge-purple">${API.escapeHtml(series.type || '')}</span></div></div>
                ${series.productionYear ? `<div class="detail-row"><div class="detail-label">Year</div><div class="detail-value">${series.productionYear}</div></div>` : ''}
                ${cats ? `<div class="detail-row"><div class="detail-label">Categories</div><div class="detail-value">${API.escapeHtml(cats)}</div></div>` : ''}
                ${summary.short ? `<div class="detail-row"><div class="detail-label">Summary</div><div class="detail-value">${API.escapeHtml(summary.short)}</div></div>` : ''}
                ${summary.medium ? `<div class="detail-row"><div class="detail-label">Description</div><div class="detail-value">${API.escapeHtml(summary.medium)}</div></div>` : ''}
            `;

            // Series images
            if (seriesImgs.length > 0) {
                const mediaRow = document.createElement('div');
                mediaRow.className = 'detail-row';
                mediaRow.innerHTML = `<div class="detail-label">Series Images</div><div class="detail-value">${
                    seriesImgs.slice(0, 4).map(r => `<img src="${API.escapeHtml(r.href)}" style="max-width:200px;height:auto;margin:4px;border-radius:4px;cursor:pointer" alt="">`).join('')
                }</div>`;
                mediaRow.querySelectorAll('img').forEach((img, i) => {
                    img.addEventListener('click', () => openLightbox(seriesImgs[i].href, series.title));
                });
                panel.appendChild(mediaRow);
            }

            panel.appendChild(API.jsonToggle(series));

            // Find related seasons
            const relatedSeasons = (series.related || []).filter(r => r.type === 'season');

            if (relatedSeasons.length === 0) {
                const noSeasons = document.createElement('div');
                noSeasons.className = 'detail-panel';
                noSeasons.style.marginTop = '16px';
                noSeasons.innerHTML = '<p style="color:var(--color-text-secondary)">No seasons found for this series.</p>';
                container.appendChild(noSeasons);
                return;
            }

            // Progress indicator
            const progress = document.createElement('div');
            progress.className = 'results-info';
            progress.textContent = `Loading ${relatedSeasons.length} season(s)...`;
            container.appendChild(progress);

            // Fetch seasons in batches of 5 via catalogue endpoint
            const seasons = [];
            for (let i = 0; i < relatedSeasons.length; i += 5) {
                const batch = relatedSeasons.slice(i, i + 5);
                const batchResults = await Promise.all(
                    batch.map(r => API.fetch(`/catalogue/${currentCatalogueId}/asset/${r.id}`).catch(() => null))
                );
                batchResults.forEach(s => { if (s) seasons.push(s); });
                progress.textContent = `Loaded ${Math.min(i + 5, relatedSeasons.length)} of ${relatedSeasons.length} season(s)...`;
            }

            // Sort seasons by title (Season 1, Season 2, etc.)
            seasons.sort((a, b) => {
                const numA = parseInt((a.title || '').match(/\d+/)?.[0]) || 0;
                const numB = parseInt((b.title || '').match(/\d+/)?.[0]) || 0;
                return numA - numB;
            });

            progress.textContent = `${seasons.length} season(s)`;

            // Render season accordions
            const seasonsContainer = document.createElement('div');
            seasonsContainer.style.marginTop = '8px';
            container.appendChild(seasonsContainer);

            seasons.forEach(season => {
                const seasonImgs = API.extractImages(season.media);
                const relatedEpisodes = (season.related || []).filter(r => r.type === 'episode');

                const wrapper = document.createElement('div');
                wrapper.style.marginBottom = '4px';

                const header = document.createElement('div');
                header.className = 'season-header';
                header.innerHTML = `
                    <h4>
                        ${API.escapeHtml(season.title || 'Unnamed Season')}
                        ${seasonImgs.length > 0 ? `<span class="badge badge-green" style="margin-left:8px">${seasonImgs.length} img</span>` : ''}
                        <span class="badge badge-gray" style="margin-left:4px">${relatedEpisodes.length} episode(s)</span>
                    </h4>
                    <span class="season-toggle">\u25BC</span>
                `;

                const episodesPanel = document.createElement('div');
                episodesPanel.className = 'season-episodes';

                let episodesLoaded = false;

                header.addEventListener('click', async () => {
                    const isOpen = episodesPanel.classList.contains('open');
                    episodesPanel.classList.toggle('open');
                    header.querySelector('.season-toggle').classList.toggle('open');

                    if (!isOpen && !episodesLoaded) {
                        episodesLoaded = true;
                        await loadSeasonEpisodes(episodesPanel, season, seasonImgs, relatedEpisodes);
                    }
                });

                wrapper.appendChild(header);
                wrapper.appendChild(episodesPanel);
                seasonsContainer.appendChild(wrapper);
            });

        } catch (err) {
            API.showError(panel, err.message);
        }
    }

    async function loadSeasonEpisodes(container, season, seasonImgs, relatedEpisodes) {
        API.showLoading(container);

        // Show season images first
        if (seasonImgs.length > 0) {
            const seasonImgSection = document.createElement('div');
            seasonImgSection.style.cssText = 'margin:12px 0 16px;';
            seasonImgSection.innerHTML = `<h4 style="margin:0 0 8px;font-size:14px;">Season Images (${seasonImgs.length})</h4>`;
            const gallery = document.createElement('div');
            gallery.className = 'img-gallery';
            seasonImgs.forEach(img => {
                const wrapper = document.createElement('div');
                wrapper.className = 'img-gallery-item';
                const imgEl = document.createElement('img');
                imgEl.src = img.href;
                imgEl.alt = season.title || '';
                imgEl.className = 'img-gallery-img';
                imgEl.addEventListener('click', () => openLightbox(img.href, season.title));
                wrapper.appendChild(imgEl);
                const meta = document.createElement('div');
                meta.className = 'img-gallery-meta';
                const parts = [];
                if (img.label) parts.push(img.label);
                if (img.width && img.height) parts.push(`${img.width} x ${img.height}`);
                meta.innerHTML = `${parts.length ? `<span>${API.escapeHtml(parts.join(' \u00B7 '))}</span>` : ''}<a href="${API.escapeHtml(img.href)}" target="_blank" rel="noopener" style="color:var(--color-accent);font-size:12px">Open</a>`;
                wrapper.appendChild(meta);
                gallery.appendChild(wrapper);
            });
            seasonImgSection.appendChild(gallery);
            container.innerHTML = '';
            container.appendChild(seasonImgSection);
        } else {
            container.innerHTML = '';
        }

        if (relatedEpisodes.length === 0) {
            const noEp = document.createElement('p');
            noEp.style.cssText = 'color:var(--color-text-secondary);margin:8px 0;';
            noEp.textContent = 'No episodes found for this season.';
            container.appendChild(noEp);
            return;
        }

        const epProgress = document.createElement('div');
        epProgress.className = 'results-info';
        epProgress.textContent = `Loading ${relatedEpisodes.length} episode(s)...`;
        container.appendChild(epProgress);

        // Fetch episodes in batches of 5 via catalogue endpoint
        const episodes = [];
        for (let i = 0; i < relatedEpisodes.length; i += 5) {
            const batch = relatedEpisodes.slice(i, i + 5);
            const batchResults = await Promise.all(
                batch.map(r => API.fetch(`/catalogue/${currentCatalogueId}/asset/${r.id}`).catch(() => null))
            );
            batchResults.forEach(ep => { if (ep) episodes.push(ep); });
            epProgress.textContent = `Loaded ${Math.min(i + 5, relatedEpisodes.length)} of ${relatedEpisodes.length} episode(s)...`;
        }

        // Sort episodes by episode number or title
        episodes.sort((a, b) => {
            const numA = parseInt((a.title || '').match(/\d+/)?.[0]) || 0;
            const numB = parseInt((b.title || '').match(/\d+/)?.[0]) || 0;
            return numA - numB;
        });

        epProgress.textContent = `${episodes.length} episode(s)`;

        // Render episode cards
        episodes.forEach(ep => {
            const epImgs = API.extractImages(ep.media);
            const summary = ep.summary || {};

            const card = document.createElement('div');
            card.className = 'card clickable';
            card.style.marginBottom = '8px';

            card.innerHTML = `
                <div style="display:flex;gap:12px;align-items:start">
                    ${epImgs.length > 0 ? `<img src="${API.escapeHtml(epImgs[0].href)}" class="thumb" alt="">` : ''}
                    <div style="flex:1">
                        <div class="card-title">${API.escapeHtml(ep.title || 'Untitled')}</div>
                        <div class="card-meta">
                            <span class="badge badge-blue">episode</span>
                            ${ep.productionYear ? `<span class="badge badge-gray">${ep.productionYear}</span>` : ''}
                            ${epImgs.length > 0 ? `<span class="badge badge-green">${epImgs.length} image(s)</span>` : '<span class="badge badge-orange">No images</span>'}
                        </div>
                        ${summary.short ? `<p style="margin:4px 0 0;font-size:13px;color:var(--color-text-secondary)">${API.escapeHtml(summary.short)}</p>` : ''}
                    </div>
                </div>
            `;

            card.addEventListener('click', () => showAssetImageDetail(ep));
            container.appendChild(card);
        });
    }

    async function showAssetImageDetail(item) {
        const container = document.getElementById('content');
        const assetId = getAssetId(item);

        // Save current view
        if (!savedProgrammeView) {
            savedProgrammeView = document.createDocumentFragment();
            while (container.firstChild) {
                savedProgrammeView.appendChild(container.firstChild);
            }
        }

        container.innerHTML = '';

        const back = document.createElement('a');
        back.className = 'back-link';
        back.innerHTML = '&larr; Back';
        back.addEventListener('click', () => restoreProgrammeView());
        container.appendChild(back);

        const panel = document.createElement('div');
        panel.className = 'detail-panel';
        API.showLoading(panel);
        container.appendChild(panel);

        try {
            // Fetch full asset detail via catalogue endpoint
            const fullAsset = await API.fetch(`/catalogue/${currentCatalogueId}/asset/${assetId}`);
            const summary = fullAsset.summary || {};
            const cats = (fullAsset.category || []).map(c => c.name).join(', ');
            const attrs = (fullAsset.attribute || []).join(', ');
            const images = API.extractImages(fullAsset.media);

            panel.innerHTML = `
                <h3>${API.escapeHtml(fullAsset.title || 'Untitled')}</h3>
                <div class="detail-row"><div class="detail-label">ID</div><div class="detail-value"><code style="font-size:12px;user-select:all">${API.escapeHtml(fullAsset.id)}</code></div></div>
                <div class="detail-row"><div class="detail-label">Type</div><div class="detail-value"><span class="badge badge-purple">${API.escapeHtml(fullAsset.type || '')}</span></div></div>
                ${fullAsset.productionYear ? `<div class="detail-row"><div class="detail-label">Year</div><div class="detail-value">${fullAsset.productionYear}</div></div>` : ''}
                ${fullAsset.runtime ? `<div class="detail-row"><div class="detail-label">Runtime</div><div class="detail-value">${fullAsset.runtime} min</div></div>` : ''}
                ${cats ? `<div class="detail-row"><div class="detail-label">Categories</div><div class="detail-value">${API.escapeHtml(cats)}</div></div>` : ''}
                ${attrs ? `<div class="detail-row"><div class="detail-label">Attributes</div><div class="detail-value">${API.escapeHtml(attrs)}</div></div>` : ''}
                ${summary.short ? `<div class="detail-row"><div class="detail-label">Summary</div><div class="detail-value">${API.escapeHtml(summary.short)}</div></div>` : ''}
                ${summary.medium ? `<div class="detail-row"><div class="detail-label">Description</div><div class="detail-value">${API.escapeHtml(summary.medium)}</div></div>` : ''}
                ${summary.long ? `<div class="detail-row"><div class="detail-label">Full Description</div><div class="detail-value">${API.escapeHtml(summary.long)}</div></div>` : ''}
            `;

            panel.appendChild(API.jsonToggle(fullAsset));

            renderImageGallery(container, images, fullAsset.title);

        } catch (err) {
            API.showError(panel, err.message);
        }
    }

    // ============================================================
    // SHARED HELPERS
    // ============================================================

    function renderImageGallery(container, images, title) {
        const gallerySection = document.createElement('div');
        gallerySection.style.marginTop = '20px';

        if (images.length > 0) {
            gallerySection.innerHTML = `<h3 style="margin-bottom:12px">Images (${images.length})</h3>`;
            const gallery = document.createElement('div');
            gallery.className = 'img-gallery';

            images.forEach(img => {
                const wrapper = document.createElement('div');
                wrapper.className = 'img-gallery-item';

                const imgEl = document.createElement('img');
                imgEl.src = img.href;
                imgEl.alt = title || '';
                imgEl.className = 'img-gallery-img';
                imgEl.addEventListener('click', () => openLightbox(img.href, title));

                wrapper.appendChild(imgEl);

                const meta = document.createElement('div');
                meta.className = 'img-gallery-meta';
                const parts = [];
                if (img.label) parts.push(img.label);
                if (img.width && img.height) parts.push(`${img.width} x ${img.height}`);
                meta.innerHTML = `
                    ${parts.length ? `<span>${API.escapeHtml(parts.join(' \u00B7 '))}</span>` : ''}
                    <a href="${API.escapeHtml(img.href)}" target="_blank" rel="noopener" style="color:var(--color-accent);font-size:12px">Open in new tab</a>
                `;
                wrapper.appendChild(meta);

                gallery.appendChild(wrapper);
            });

            gallerySection.appendChild(gallery);
        } else {
            gallerySection.innerHTML = `
                <div class="detail-panel" style="text-align:center;padding:32px">
                    <div style="font-size:48px;margin-bottom:8px;opacity:0.3">&#128247;</div>
                    <p style="color:var(--color-text-secondary)">No images available for this programme.</p>
                </div>
            `;
        }
        container.appendChild(gallerySection);
    }

    function openLightbox(src, title) {
        const overlay = document.createElement('div');
        overlay.className = 'lightbox-overlay';
        overlay.innerHTML = `
            <div class="lightbox-content">
                <button class="lightbox-close" aria-label="Close">&times;</button>
                <img src="${API.escapeHtml(src)}" alt="${API.escapeHtml(title || '')}" class="lightbox-img">
            </div>
        `;
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target.classList.contains('lightbox-close')) {
                overlay.remove();
            }
        });
        document.body.appendChild(overlay);
    }

    // ============================================================
    // AUDIT TAB
    // ============================================================

    function setupAuditTab() {
        loadSavedChannelLists();
        setupAuditChannelSearch();
        populateSavedListsDropdown();

        document.getElementById('audit-run').addEventListener('click', runAudit);
        document.getElementById('audit-save-list').addEventListener('click', saveChannelList);
        document.getElementById('audit-update-list').addEventListener('click', updateChannelList);
        document.getElementById('audit-delete-list').addEventListener('click', deleteChannelList);
        document.getElementById('audit-saved-lists').addEventListener('change', loadChannelList);
        document.getElementById('audit-clear-all').addEventListener('click', () => {
            auditSelectedChannels = [];
            renderSelectedChips();
        });
    }

    function setupAuditChannelSearch() {
        const input = document.getElementById('audit-channel-search');
        const dropdown = document.getElementById('audit-channel-dropdown');

        input.addEventListener('focus', () => { if (input.value.trim()) showAuditDropdown(); });
        input.addEventListener('input', () => showAuditDropdown());

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#audit-channel-search') && !e.target.closest('#audit-channel-dropdown')) {
                dropdown.style.display = 'none';
            }
        });
    }

    function showAuditDropdown() {
        const input = document.getElementById('audit-channel-search');
        const dropdown = document.getElementById('audit-channel-dropdown');
        const query = (input.value || '').toLowerCase().trim();

        if (!query) { dropdown.style.display = 'none'; return; }

        if (allChannels.length === 0) {
            dropdown.innerHTML = '<div class="dropdown-empty">Loading channels...</div>';
            dropdown.style.display = 'block';
            return;
        }

        const selectedIds = new Set(auditSelectedChannels.map(ch => ch.id));
        const filtered = allChannels.filter(ch =>
            !selectedIds.has(ch.id) && (ch.title || '').toLowerCase().includes(query)
        );

        if (filtered.length === 0) {
            dropdown.innerHTML = '<div class="dropdown-empty">No channels found</div>';
            dropdown.style.display = 'block';
            return;
        }

        dropdown.innerHTML = '';
        filtered.slice(0, 50).forEach(ch => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.innerHTML = `<strong>${API.escapeHtml(ch.title)}</strong><span class="dropdown-id">${API.escapeHtml(ch.id)}</span>`;
            item.addEventListener('click', () => {
                auditSelectedChannels.push({ id: ch.id, title: ch.title });
                renderSelectedChips();
                input.value = '';
                dropdown.style.display = 'none';
                input.focus();
            });
            dropdown.appendChild(item);
        });

        if (filtered.length > 50) {
            const more = document.createElement('div');
            more.className = 'dropdown-empty';
            more.textContent = `${filtered.length - 50} more \u2014 keep typing to narrow results`;
            dropdown.appendChild(more);
        }
        dropdown.style.display = 'block';
    }

    function renderSelectedChips() {
        const wrapper = document.getElementById('audit-selected-chips');
        const container = document.getElementById('audit-chips-container');

        if (auditSelectedChannels.length === 0) {
            wrapper.style.display = 'none';
            return;
        }

        wrapper.style.display = 'block';
        container.innerHTML = '';
        auditSelectedChannels.forEach(ch => {
            const chip = document.createElement('span');
            chip.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:4px 8px 4px 10px;background:var(--color-accent);color:#fff;border-radius:14px;font-size:12px;font-weight:500';
            chip.innerHTML = `${API.escapeHtml(ch.title)}<button style="background:none;border:none;color:#fff;cursor:pointer;font-size:15px;line-height:1;padding:0 2px" title="Remove">&times;</button>`;
            chip.querySelector('button').addEventListener('click', () => {
                auditSelectedChannels = auditSelectedChannels.filter(c => c.id !== ch.id);
                renderSelectedChips();
            });
            container.appendChild(chip);
        });
    }

    // --- Saved channel lists ---

    let savedChannelLists = [];
    let activeListIdx = null;

    function loadSavedChannelLists() {
        try {
            const stored = localStorage.getItem('pa_saved_channel_lists');
            savedChannelLists = stored ? JSON.parse(stored) : [];
        } catch (e) { savedChannelLists = []; }
    }

    function persistSavedChannelLists() {
        try {
            localStorage.setItem('pa_saved_channel_lists', JSON.stringify(savedChannelLists));
        } catch (e) {
            API.toast('Failed to save to localStorage.', 'error');
        }
    }

    function populateSavedListsDropdown() {
        const sel = document.getElementById('audit-saved-lists');
        sel.innerHTML = '<option value="">Load a saved list...</option>';
        savedChannelLists.forEach((list, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = `${list.name} (${list.channels.length} ch)`;
            sel.appendChild(opt);
        });
    }

    function saveChannelList() {
        if (auditSelectedChannels.length === 0) {
            API.toast('Select channels first.', 'warning');
            return;
        }
        const name = prompt('Enter a name for this channel list:');
        if (!name || !name.trim()) return;

        savedChannelLists.push({
            name: name.trim(),
            channels: auditSelectedChannels.map(ch => ({ id: ch.id, title: ch.title }))
        });
        persistSavedChannelLists();
        populateSavedListsDropdown();
        API.toast('Channel list saved.', 'success');
    }

    function deleteChannelList() {
        const sel = document.getElementById('audit-saved-lists');
        const idx = parseInt(sel.value);
        if (isNaN(idx)) { API.toast('Select a list to delete.', 'warning'); return; }
        if (!confirm(`Delete "${savedChannelLists[idx].name}"?`)) return;

        savedChannelLists.splice(idx, 1);
        activeListIdx = null;
        document.getElementById('audit-update-list').disabled = true;
        persistSavedChannelLists();
        populateSavedListsDropdown();
        API.toast('List deleted.', 'success');
    }

    function loadChannelList() {
        const sel = document.getElementById('audit-saved-lists');
        const idx = parseInt(sel.value);
        if (isNaN(idx)) {
            activeListIdx = null;
            document.getElementById('audit-update-list').disabled = true;
            return;
        }

        activeListIdx = idx;
        auditSelectedChannels = [...savedChannelLists[idx].channels];
        renderSelectedChips();
        document.getElementById('audit-update-list').disabled = false;
        API.toast(`Loaded "${savedChannelLists[idx].name}".`, 'success');
    }

    function updateChannelList() {
        if (activeListIdx === null || !savedChannelLists[activeListIdx]) {
            API.toast('No list selected to update.', 'warning');
            return;
        }
        if (auditSelectedChannels.length === 0) {
            API.toast('Select channels first.', 'warning');
            return;
        }
        const name = savedChannelLists[activeListIdx].name;
        savedChannelLists[activeListIdx].channels = auditSelectedChannels.map(ch => ({ id: ch.id, title: ch.title }));
        persistSavedChannelLists();
        populateSavedListsDropdown();
        // Re-select the active list in the dropdown
        document.getElementById('audit-saved-lists').value = activeListIdx;
        API.toast(`Updated "${name}".`, 'success');
    }

    // --- Audit execution ---

    async function runAudit() {
        if (auditInProgress) { API.toast('Audit already running.', 'warning'); return; }
        if (auditSelectedChannels.length === 0) { API.toast('Select at least one channel.', 'warning'); return; }

        const startDate = document.getElementById('audit-start').value;
        if (!startDate) { API.toast('Select a start date.', 'warning'); return; }

        const days = parseInt(document.getElementById('audit-days').value);
        const dates = [];
        for (let i = 0; i < days; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            dates.push(d.toISOString().slice(0, 10));
        }

        auditInProgress = true;
        auditResults = [];

        const progressDiv = document.getElementById('audit-progress');
        const resultsDiv = document.getElementById('audit-results');
        const totalTasks = auditSelectedChannels.length * dates.length;
        let completedTasks = 0;

        progressDiv.style.display = 'block';
        resultsDiv.innerHTML = '';
        progressDiv.innerHTML = `
            <div class="card" style="margin-bottom:16px">
                <div style="font-weight:600;margin-bottom:8px">Auditing ${auditSelectedChannels.length} channel(s) over ${days} day(s)...</div>
                <div style="background:var(--color-border);height:8px;border-radius:4px;overflow:hidden">
                    <div id="audit-progress-bar" style="background:var(--color-accent);height:100%;width:0%;transition:width 0.3s"></div>
                </div>
                <div id="audit-progress-text" style="margin-top:6px;font-size:13px;color:var(--color-text-secondary)">0 / ${totalTasks} tasks</div>
            </div>
        `;

        for (const channel of auditSelectedChannels) {
            const result = {
                channelTitle: channel.title,
                channelId: channel.id,
                totalProgrammes: 0,
                withImages: 0,
                withoutImages: 0,
                missingProgrammes: []
            };

            // Batch dates 5 at a time
            for (let i = 0; i < dates.length; i += 5) {
                const batch = dates.slice(i, i + 5);
                const promises = batch.map(date => {
                    const nextDay = new Date(date);
                    nextDay.setDate(nextDay.getDate() + 1);
                    return API.fetch('/schedule', {
                        channelId: channel.id,
                        start: `${date}T00:00:00`,
                        end: `${nextDay.toISOString().slice(0, 10)}T00:00:00`
                    }).then(data => ({ date, items: data.item || [] }))
                      .catch(() => ({ date, items: [] }));
                });

                const batchResults = await Promise.all(promises);
                batchResults.forEach(({ date, items }) => {
                    items.forEach(item => {
                        result.totalProgrammes++;
                        if (getImages(item).length > 0) {
                            result.withImages++;
                        } else {
                            result.withoutImages++;
                            const asset = item.asset || {};
                            const dt = item.dateTime ? new Date(item.dateTime) : null;
                            result.missingProgrammes.push({
                                title: item.title || 'Untitled',
                                dateTime: dt ? dt.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-',
                                assetId: asset.id || '-',
                                date
                            });
                        }
                    });
                    completedTasks++;
                    const pct = Math.round((completedTasks / totalTasks) * 100);
                    const bar = document.getElementById('audit-progress-bar');
                    const text = document.getElementById('audit-progress-text');
                    if (bar) bar.style.width = `${pct}%`;
                    if (text) text.textContent = `${completedTasks} / ${totalTasks} tasks (${pct}%)`;
                });
            }

            auditResults.push(result);
        }

        auditInProgress = false;
        progressDiv.style.display = 'none';
        renderAuditResults();
    }

    // --- Audit results rendering ---

    function renderAuditResults() {
        const container = document.getElementById('audit-results');
        container.innerHTML = '';

        if (auditResults.length === 0) {
            API.showEmpty(container, 'No audit results.');
            return;
        }

        const totals = auditResults.reduce((acc, r) => ({
            total: acc.total + r.totalProgrammes,
            with: acc.with + r.withImages,
            without: acc.without + r.withoutImages
        }), { total: 0, with: 0, without: 0 });

        const totalPct = totals.total > 0 ? Math.round((totals.with / totals.total) * 100) : 0;

        // Header row with info + export button
        const header = document.createElement('div');
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px';
        header.innerHTML = `<div class="results-info" style="margin:0">
            ${auditResults.length} channel(s) audited &mdash; ${totals.total} programmes, ${totals.with} with images (${totalPct}%), ${totals.without} missing
        </div>`;

        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn btn-sm btn-secondary';
        exportBtn.textContent = 'Export to Excel';
        exportBtn.addEventListener('click', exportAuditExcel);
        header.appendChild(exportBtn);
        container.appendChild(header);

        // Results table
        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Channel</th>
                    <th style="text-align:right">Total</th>
                    <th style="text-align:right">With Images</th>
                    <th style="text-align:right">Missing</th>
                    <th style="text-align:right">Coverage</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        auditResults.forEach(result => {
            const pct = result.totalProgrammes > 0 ? Math.round((result.withImages / result.totalProgrammes) * 100) : 0;
            let color = 'var(--color-error)';
            if (pct >= 90) color = 'var(--color-success)';
            else if (pct >= 70) color = '#e67e00';

            const row = document.createElement('tr');
            row.className = 'clickable';
            row.innerHTML = `
                <td><strong>${API.escapeHtml(result.channelTitle)}</strong></td>
                <td style="text-align:right">${result.totalProgrammes}</td>
                <td style="text-align:right">${result.withImages}</td>
                <td style="text-align:right">${result.withoutImages}</td>
                <td style="text-align:right;font-weight:700;color:${color}">${pct}%</td>
            `;

            // Expandable drill-down row
            const drillRow = document.createElement('tr');
            drillRow.style.display = 'none';
            const drillCell = document.createElement('td');
            drillCell.colSpan = 5;
            drillCell.style.cssText = 'padding:0;background:var(--color-bg)';
            drillRow.appendChild(drillCell);

            row.addEventListener('click', () => {
                const isOpen = drillRow.style.display !== 'none';
                drillRow.style.display = isOpen ? 'none' : '';
                if (!isOpen && drillCell.children.length === 0) {
                    renderAuditDrillDown(drillCell, result);
                }
            });

            tbody.appendChild(row);
            tbody.appendChild(drillRow);
        });

        // Totals row
        const totalsRow = document.createElement('tr');
        totalsRow.style.cssText = 'font-weight:700;border-top:2px solid var(--color-border)';
        let totalColor = 'var(--color-error)';
        if (totalPct >= 90) totalColor = 'var(--color-success)';
        else if (totalPct >= 70) totalColor = '#e67e00';
        totalsRow.innerHTML = `
            <td>TOTAL</td>
            <td style="text-align:right">${totals.total}</td>
            <td style="text-align:right">${totals.with}</td>
            <td style="text-align:right">${totals.without}</td>
            <td style="text-align:right;color:${totalColor}">${totalPct}%</td>
        `;
        tbody.appendChild(totalsRow);

        container.appendChild(table);
    }

    function renderAuditDrillDown(cell, result) {
        if (result.missingProgrammes.length === 0) {
            cell.innerHTML = '<div style="padding:16px;color:var(--color-success);font-weight:600">All programmes have images!</div>';
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'padding:12px 16px;max-height:400px;overflow-y:auto';

        const heading = document.createElement('div');
        heading.style.cssText = 'font-size:13px;font-weight:600;color:var(--color-text-secondary);margin-bottom:8px';
        heading.textContent = `Programmes Missing Images (${result.missingProgrammes.length})`;
        wrapper.appendChild(heading);

        const miniTable = document.createElement('table');
        miniTable.className = 'data-table';
        miniTable.style.fontSize = '13px';
        miniTable.innerHTML = `<thead><tr><th>Programme</th><th>Date/Time</th><th>Asset ID</th></tr></thead><tbody></tbody>`;
        const miniBody = miniTable.querySelector('tbody');

        result.missingProgrammes.forEach(prog => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${API.escapeHtml(prog.title)}</td>
                <td>${API.escapeHtml(prog.dateTime)}</td>
                <td><code style="font-size:11px;user-select:all">${API.escapeHtml(prog.assetId)}</code></td>
            `;
            miniBody.appendChild(tr);
        });

        wrapper.appendChild(miniTable);
        cell.appendChild(wrapper);
    }

    // --- Excel export ---

    function exportAuditExcel() {
        if (auditResults.length === 0) { API.toast('No results to export.', 'warning'); return; }

        const wb = XLSX.utils.book_new();

        // Summary sheet
        const summaryRows = auditResults.map(r => {
            const pct = r.totalProgrammes > 0 ? Math.round((r.withImages / r.totalProgrammes) * 100) : 0;
            return {
                'Channel': r.channelTitle,
                'Total Programmes': r.totalProgrammes,
                'With Images': r.withImages,
                'Missing Images': r.withoutImages,
                'Coverage %': pct
            };
        });

        const totals = auditResults.reduce((a, r) => ({
            total: a.total + r.totalProgrammes, with: a.with + r.withImages, without: a.without + r.withoutImages
        }), { total: 0, with: 0, without: 0 });
        const totalPct = totals.total > 0 ? Math.round((totals.with / totals.total) * 100) : 0;

        summaryRows.push({
            'Channel': 'TOTAL',
            'Total Programmes': totals.total,
            'With Images': totals.with,
            'Missing Images': totals.without,
            'Coverage %': totalPct
        });

        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Summary');

        // Missing images sheet
        const missingRows = [];
        auditResults.forEach(r => {
            r.missingProgrammes.forEach(p => {
                missingRows.push({
                    'Channel': r.channelTitle,
                    'Programme': p.title,
                    'Date/Time': p.dateTime,
                    'Asset ID': p.assetId
                });
            });
        });

        if (missingRows.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(missingRows), 'Missing Images');
        }

        const fileName = `Image_Audit_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
        API.toast('Audit exported.', 'success');
    }

    return { render };
})();

