const ImagesView = (() => {
    // === Schedule tab state ===
    let allChannels = [];
    let scheduleItems = [];
    let savedListView = null;
    let currentFilter = 'all';

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
                <button class="view-tab active" data-tab="audit">Image Audit</button>
                <button class="view-tab" data-tab="schedule">By Schedule</button>
            </div>

            <div id="tab-schedule" class="tab-panel">
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

            <div id="tab-audit" class="tab-panel active">
                <div class="filter-bar">
                    <div class="form-group" style="flex:1;min-width:300px">
                        <label>Add Channels</label>
                        <input type="text" id="audit-channel-search" class="input" placeholder="Type to search and add channels..." style="width:100%" autocomplete="off">
                        <div id="audit-channel-dropdown" class="channel-dropdown"></div>
                    </div>
                    <div class="form-group">
                        <label>Channel Type</label>
                        <div style="display:flex;gap:12px;align-items:center;height:36px">
                            <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-weight:400;font-size:13px">
                                <input type="checkbox" id="audit-filter-tv" checked> TV
                            </label>
                            <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-weight:400;font-size:13px">
                                <input type="checkbox" id="audit-filter-radio" checked> Radio
                            </label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>&nbsp;</label>
                        <button id="audit-browse-all" class="btn btn-sm btn-secondary">Browse All Channels</button>
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
                <div id="audit-channel-browser" style="display:none;margin-bottom:16px;border:1px solid var(--color-border);border-radius:6px;background:var(--color-surface)">
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid var(--color-border)">
                        <span style="font-size:12px;font-weight:600;color:var(--color-text-secondary)">ALL CHANNELS</span>
                        <div style="display:flex;gap:8px;align-items:center">
                            <input type="text" id="audit-browser-search" class="input" placeholder="Filter..." style="width:180px;height:28px;font-size:12px;padding:2px 8px">
                            <button id="audit-select-all-visible" class="btn btn-sm btn-secondary" style="font-size:11px;padding:2px 8px">Select All Visible</button>
                            <button id="audit-browser-close" class="btn btn-sm btn-secondary" style="font-size:11px;padding:2px 8px">Close</button>
                        </div>
                    </div>
                    <div id="audit-browser-list" style="max-height:300px;overflow-y:auto;padding:8px 14px"></div>
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

        // Audit tab setup
        setupAuditTab();

        // Load data
        await loadAllChannels();
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

        // TV/Radio filter checkboxes
        document.getElementById('audit-filter-tv').addEventListener('change', () => renderChannelBrowser());
        document.getElementById('audit-filter-radio').addEventListener('change', () => renderChannelBrowser());

        // Browse All Channels
        document.getElementById('audit-browse-all').addEventListener('click', toggleChannelBrowser);
        document.getElementById('audit-browser-close').addEventListener('click', () => {
            document.getElementById('audit-channel-browser').style.display = 'none';
        });
        document.getElementById('audit-browser-search').addEventListener('input', () => renderChannelBrowser());
        document.getElementById('audit-select-all-visible').addEventListener('click', selectAllVisibleChannels);
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
        const typeFiltered = getTypeFilteredChannels();
        const filtered = typeFiltered.filter(ch =>
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

    // --- Channel type helpers ---

    function isRadioChannel(ch) {
        return (ch.attribute || []).includes('radio');
    }

    function getTypeFilteredChannels() {
        const showTv = document.getElementById('audit-filter-tv').checked;
        const showRadio = document.getElementById('audit-filter-radio').checked;
        return allChannels.filter(ch => {
            const radio = isRadioChannel(ch);
            return (radio && showRadio) || (!radio && showTv);
        });
    }

    // --- Channel browser ---

    function toggleChannelBrowser() {
        const browser = document.getElementById('audit-channel-browser');
        const isVisible = browser.style.display !== 'none';
        if (isVisible) {
            browser.style.display = 'none';
        } else {
            browser.style.display = '';
            renderChannelBrowser();
        }
    }

    function renderChannelBrowser() {
        const browser = document.getElementById('audit-channel-browser');
        if (browser.style.display === 'none') return;

        const listDiv = document.getElementById('audit-browser-list');
        const searchQuery = (document.getElementById('audit-browser-search').value || '').toLowerCase().trim();
        const filtered = getTypeFilteredChannels();
        const selectedIds = new Set(auditSelectedChannels.map(ch => ch.id));

        const matched = searchQuery
            ? filtered.filter(ch => (ch.title || '').toLowerCase().includes(searchQuery))
            : filtered;

        if (matched.length === 0) {
            listDiv.innerHTML = '<div style="padding:12px;color:var(--color-text-secondary);font-size:13px">No channels match the current filters.</div>';
            return;
        }

        listDiv.innerHTML = '';
        matched.forEach(ch => {
            const row = document.createElement('label');
            row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;font-size:13px';
            const isRadio = isRadioChannel(ch);
            const badge = isRadio
                ? '<span style="font-size:10px;padding:1px 5px;border-radius:3px;background:#7c3aed;color:#fff;margin-left:4px">Radio</span>'
                : '';
            row.innerHTML = `
                <input type="checkbox" data-channel-id="${API.escapeHtml(ch.id)}" ${selectedIds.has(ch.id) ? 'checked' : ''}>
                <span>${API.escapeHtml(ch.title)}${badge}</span>
            `;
            row.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) {
                    if (!selectedIds.has(ch.id)) {
                        auditSelectedChannels.push({ id: ch.id, title: ch.title });
                        selectedIds.add(ch.id);
                        renderSelectedChips();
                    }
                } else {
                    auditSelectedChannels = auditSelectedChannels.filter(c => c.id !== ch.id);
                    selectedIds.delete(ch.id);
                    renderSelectedChips();
                }
            });
            listDiv.appendChild(row);
        });
    }

    function selectAllVisibleChannels() {
        const listDiv = document.getElementById('audit-browser-list');
        const checkboxes = listDiv.querySelectorAll('input[type="checkbox"]:not(:checked)');
        checkboxes.forEach(cb => {
            cb.checked = true;
            cb.dispatchEvent(new Event('change'));
        });
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

        // Sync browser checkboxes if open
        renderChannelBrowser();
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

