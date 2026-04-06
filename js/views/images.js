const ImagesView = (() => {
    // === Schedule tab state ===
    let allChannels = [];
    let scheduleItems = [];
    let savedListView = null;
    let currentFilter = 'all';
    let currentChannelId = '';

    // === Audit tab state ===
    let auditSelectedChannels = [];
    let auditResults = [];
    let auditInProgress = false;
    let auditViewMode = 'any'; // 'any', 'episode', 'series', 'season', 'excluded'
    let showAllMissing = false;

    async function render(container) {
        const today = new Date().toISOString().slice(0, 10);
        container.innerHTML = `
            <div class="view-header">
                <h2>Image Viewer</h2>
            </div>
            <div class="view-tabs">
                <button class="view-tab active" data-tab="audit">Image Audit</button>
                <button class="view-tab" data-tab="schedule">By Schedule</button>
            </div>

            <div id="tab-schedule" class="tab-panel">
                <div class="filter-bar">
                    <div class="form-group" style="min-width:300px;max-width:400px">
                        <label>Channel</label>
                        <input type="text" id="img-channel-search" class="input" placeholder="Type to search and add channels..." style="width:100%" autocomplete="off">
                        <div id="img-channel-dropdown" class="channel-dropdown"></div>
                        <input type="hidden" id="img-channel-id">
                    </div>
                    <div class="form-group">
                        <label>Date</label>
                        <div style="display:flex;align-items:center;gap:8px">
                            <button id="img-prev-day" class="btn btn-sm btn-secondary">&larr;</button>
                            <input type="date" id="img-start" class="input" value="${today}" style="min-width:160px">
                            <button id="img-next-day" class="btn btn-sm btn-secondary">&rarr;</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>&nbsp;</label>
                        <button id="img-load" class="btn btn-primary">Load Programmes</button>
                    </div>
                </div>
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
                <div id="audit-config-summary" style="display:none"></div>
                <div id="audit-config">
                <div id="audit-config-collapse" style="display:none;margin-bottom:8px;text-align:right">
                    <button id="audit-config-done" class="btn btn-sm btn-secondary">&larr; Back to Results</button>
                </div>
                <div class="filter-bar">
                    <div class="form-group" style="min-width:300px;max-width:400px">
                        <label>Channel</label>
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
                        <label>Channel Lists</label>
                        <select id="audit-saved-lists" class="select" style="min-width:180px">
                            <option value="">Select a list...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>&nbsp;</label>
                        <div style="display:flex;gap:6px">
                            <button id="audit-save-list" class="btn btn-sm btn-secondary">Add List</button>
                            <button id="audit-update-list" class="btn btn-sm btn-secondary" disabled>Update</button>
                            <button id="audit-rename-list" class="btn btn-sm btn-secondary" disabled>Rename</button>
                            <button id="audit-delete-list" class="btn btn-sm btn-secondary">Delete</button>
                        </div>
                    </div>
                </div>
                <div id="audit-channel-browser" style="display:none;margin-bottom:16px;border:1px solid var(--color-border);border-radius:6px;background:var(--color-surface)">
                    <div style="display:flex;gap:12px;align-items:center;padding:10px 14px;border-bottom:1px solid var(--color-border)">
                        <span style="font-size:12px;font-weight:600;color:var(--color-text-secondary)">ALL CHANNELS</span>
                        <div style="display:flex;gap:8px;align-items:center">
                            <input type="text" id="audit-browser-search" class="input" placeholder="Filter..." style="width:180px;height:28px;font-size:12px;padding:2px 8px">
                            <button id="audit-unselect-all" class="btn btn-sm btn-secondary" style="font-size:11px;padding:2px 8px">Unselect All</button>
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
        document.getElementById('img-prev-day').addEventListener('click', () => shiftImgDay(-1));
        document.getElementById('img-next-day').addEventListener('click', () => shiftImgDay(1));
        document.getElementById('img-start').addEventListener('change', () => {
            if (document.getElementById('img-channel-id').value) loadProgrammes();
        });
        document.getElementById('img-load').addEventListener('click', loadProgrammes);
        document.getElementById('img-filter-all').addEventListener('click', () => applyFilter('all'));
        document.getElementById('img-filter-with').addEventListener('click', () => applyFilter('with'));
        document.getElementById('img-filter-without').addEventListener('click', () => applyFilter('without'));

        // Audit tab setup
        try {
            await setupAuditTab();
        } catch (err) {
            console.error('Failed to set up audit tab:', err);
        }

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
        ChannelDropdown.init({
            inputId: 'img-channel-search',
            dropdownId: 'img-channel-dropdown',
            hiddenId: 'img-channel-id',
            getChannels: () => allChannels
        });
    }

function getDateRange() {
        const start = document.getElementById('img-start').value;
        if (!start) return null;

        const endDate = new Date(start);
        endDate.setDate(endDate.getDate() + 1);
        const end = endDate.toISOString().slice(0, 10);

        return { start, end };
    }

    async function loadProgrammes() {
        const results = document.getElementById('img-results');
        const channelId = document.getElementById('img-channel-id').value;
        currentChannelId = channelId;

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
            const signal = API.cancelable('img-schedule');
            const data = await API.fetch('/schedule', params, { signal });
            scheduleItems = data.item || [];
            updateCounts();
            document.getElementById('img-filter-bar').style.display = '';
            applyFilter('all');
        } catch (err) {
            if (err.name === 'AbortError') return;
            scheduleItems = [];
            document.getElementById('img-filter-bar').style.display = 'none';
            API.showError(results, err.message);
        }
    }

    function shiftImgDay(offset) {
        const dateInput = document.getElementById('img-start');
        const dt = new Date(dateInput.value);
        dt.setDate(dt.getDate() + offset);
        dateInput.value = dt.toISOString().slice(0, 10);
        if (document.getElementById('img-channel-id').value) loadProgrammes();
    }

    function getImages(item) {
        const asset = item.asset || {};
        const episodeMedia = asset.media || item.media || [];
        const episodeList = Array.isArray(episodeMedia) ? episodeMedia : [episodeMedia];
        const episodeImages = API.extractImages(episodeList.filter(Boolean)).map(img => ({ ...img, source: 'episode' }));

        const seriesImages = [];
        (asset.related || []).forEach(rel => {
            const relMedia = Array.isArray(rel.media) ? rel.media : rel.media ? [rel.media] : [];
            API.extractImages(relMedia.filter(Boolean)).forEach(img => {
                seriesImages.push({ ...img, source: rel.type || 'related', sourceNumber: rel.number, sourceTitle: rel.title });
            });
        });

        return [...episodeImages, ...seriesImages];
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

        const channelName = (document.getElementById('img-channel-search') || {}).value || '';

        items.forEach(item => {
            const images = getImages(item);
            const hasImages = images.length > 0;
            const episodeImages = images.filter(img => img.source === 'episode');
            const seriesImages = images.filter(img => img.source === 'series');
            const seasonImages = images.filter(img => img.source === 'season');
            const copyrights = [...new Set(images.map(img => img.copyright).filter(Boolean))];
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

            const imageBadges = [];
            if (episodeImages.length > 0) imageBadges.push(`<span class="badge badge-green">${episodeImages.length} episode</span>`);
            if (seriesImages.length > 0) imageBadges.push(`<span class="badge badge-green">${seriesImages.length} series</span>`);
            if (seasonImages.length > 0) imageBadges.push(`<span class="badge badge-green">${seasonImages.length} season</span>`);

            card.innerHTML = `
                <div style="display:flex;gap:16px;align-items:start">
                    <div style="min-width:70px;text-align:center">
                        <div style="font-size:18px;font-weight:700;color:var(--color-accent)">${API.escapeHtml(time)}</div>
                        <div style="font-size:11px;color:var(--color-text-secondary)">${API.escapeHtml(date)}</div>
                        ${duration ? `<div style="font-size:11px;color:var(--color-text-secondary)">${API.escapeHtml(duration)}</div>` : ''}
                        ${channelName ? `<div style="font-size:10px;color:var(--color-text-secondary);margin-top:4px;font-weight:600">${API.escapeHtml(channelName)}</div>` : ''}
                    </div>
                    <div style="flex:1">
                        <div class="card-title">${API.escapeHtml(item.title || 'Untitled')}</div>
                        ${summary.short ? `<p style="margin:4px 0 0;font-size:13px;color:var(--color-text-secondary)">${API.escapeHtml(summary.short)}</p>` : ''}
                        <div class="card-meta" style="margin-top:6px">
                            ${hasImages
                                ? imageBadges.join('')
                                : '<span class="badge badge-orange">No images</span>'}
                            ${asset.type ? `<span class="badge badge-purple">${API.escapeHtml(asset.type)}</span>` : ''}
                        </div>
                        ${hasImages && copyrights.length > 0 ? `
                            <div style="margin-top:6px;font-size:12px;color:var(--color-text-secondary)">
                                <span style="font-weight:600">&copy;</span> ${copyrights.map(c => API.escapeHtml(c)).join(' \u00B7 ')}
                            </div>
                        ` : ''}
                        ${episodeImages.length > 0 ? `
                            <div class="img-thumbs" style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
                                ${episodeImages.slice(0, 4).map(r => `<img src="${API.escapeHtml(r.href)}" style="max-width:180px;max-height:120px;border-radius:4px;object-fit:cover;border:1px solid var(--color-border);cursor:pointer" alt="" onclick="event.stopPropagation()">`).join('')}
                                ${episodeImages.length > 4 ? `<span style="align-self:center;font-size:12px;color:var(--color-text-secondary)">+${episodeImages.length - 4} more</span>` : ''}
                            </div>
                        ` : ''}
                        ${seriesImages.length > 0 ? `
                            <div class="img-thumbs" style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
                                ${seriesImages.slice(0, 4).map(r => `<img src="${API.escapeHtml(r.href)}" style="max-width:180px;max-height:120px;border-radius:4px;object-fit:cover;border:1px solid var(--color-border);cursor:pointer;opacity:0.7" alt="" onclick="event.stopPropagation()">`).join('')}
                                ${seriesImages.length > 4 ? `<span style="align-self:center;font-size:12px;color:var(--color-text-secondary)">+${seriesImages.length - 4} more</span>` : ''}
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

    function showProgrammeDetail(item, externalOpts) {
        const container = document.getElementById('content');
        const channelName = (externalOpts && externalOpts.channelName) || (document.getElementById('img-channel-search') || {}).value || '';
        const channelId = (externalOpts && externalOpts.channelId) || currentChannelId || '';
        window.scrollTo(0, 0);

        if (externalOpts && externalOpts.onBack) {
            container.innerHTML = '';
        } else {
            savedListView = document.createDocumentFragment();
            while (container.firstChild) {
                savedListView.appendChild(container.firstChild);
            }
        }

        const back = document.createElement('a');
        back.className = 'back-link';
        if (externalOpts && externalOpts.onBack) {
            back.innerHTML = '&larr; Back to Review List';
            back.addEventListener('click', externalOpts.onBack);
        } else {
            back.innerHTML = '&larr; Back to Image Viewer';
            back.addEventListener('click', () => restoreListView());
        }
        container.appendChild(back);

        const images = getImages(item);
        const copyrights = [...new Set(images.map(img => img.copyright).filter(Boolean))];

        const panel = document.createElement('div');
        panel.className = 'detail-panel';
        container.appendChild(panel);

        ProgrammeDetail.render(panel, item, { channelName, copyrights });

        renderImageGallery(container, images, item.title);

        panel.firstElementChild.after(API.jsonToggle(item, () => {
            ReviewStore.openReviewModal(item, channelName, 'images', channelId);
        }));
    }

    // ============================================================
    // SHARED HELPERS
    // ============================================================

    function renderImageGallery(container, images, title) {
        const gallerySection = document.createElement('div');
        gallerySection.style.marginTop = '20px';

        if (images.length > 0) {
            // Group images by source
            const groups = {};
            images.forEach(img => {
                const key = img.source || 'other';
                if (!groups[key]) groups[key] = [];
                groups[key].push(img);
            });

            const groupOrder = ['episode', 'series', 'season'];
            const sortedKeys = Object.keys(groups).sort((a, b) => {
                const ai = groupOrder.indexOf(a);
                const bi = groupOrder.indexOf(b);
                return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
            });

            // Build flat list of sections for navigation and rendering
            const sections = [];
            sortedKeys.forEach(key => {
                const groupImages = groups[key];
                if (key === 'season') {
                    // Sub-group season images by sourceNumber
                    const subGroups = {};
                    groupImages.forEach(img => {
                        const subKey = img.sourceNumber != null ? String(img.sourceNumber) : 'unknown';
                        if (!subGroups[subKey]) subGroups[subKey] = { images: [], title: img.sourceTitle };
                        subGroups[subKey].images.push(img);
                    });
                    const sortedSubKeys = Object.keys(subGroups).sort((a, b) => {
                        const na = parseInt(a), nb = parseInt(b);
                        if (!isNaN(na) && !isNaN(nb)) return na - nb;
                        return a.localeCompare(b);
                    });
                    sortedSubKeys.forEach(subKey => {
                        const sub = subGroups[subKey];
                        const label = subKey !== 'unknown' ? `Season ${subKey}` : 'Season (unknown)';
                        sections.push({ id: `img-group-season-${subKey}`, label, images: sub.images });
                    });
                } else {
                    const label = key.charAt(0).toUpperCase() + key.slice(1);
                    sections.push({ id: `img-group-${key}`, label: `${label}`, images: groupImages });
                }
            });

            // Jump navigation when multiple sections exist
            if (sections.length > 1) {
                const nav = document.createElement('div');
                nav.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px';
                sections.forEach(section => {
                    const btn = document.createElement('button');
                    btn.className = 'btn btn-sm btn-secondary';
                    btn.textContent = `${section.label} (${section.images.length})`;
                    btn.addEventListener('click', () => {
                        API.smoothScroll(document.getElementById(section.id));
                    });
                    nav.appendChild(btn);
                });
                gallerySection.appendChild(nav);
            }

            sections.forEach(section => {
                const heading = document.createElement('h3');
                heading.id = section.id;
                heading.style.cssText = 'margin:16px 0 12px';
                heading.textContent = `${section.label} Images (${section.images.length})`;
                gallerySection.appendChild(heading);

                const gallery = document.createElement('div');
                gallery.className = 'img-gallery';

                section.images.forEach(img => {
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
                    parts.push(img.copyright ? `\u00A9 ${img.copyright}` : '\u00A9 No copyright');
                    meta.innerHTML = `
                        ${parts.length ? `<span>${API.escapeHtml(parts.join(' \u00B7 '))}</span>` : ''}
                        <a href="${API.escapeHtml(img.href)}" target="_blank" rel="noopener" style="color:var(--color-accent);font-size:12px">Open in new tab</a>
                    `;
                    wrapper.appendChild(meta);

                    gallery.appendChild(wrapper);
                });

                gallerySection.appendChild(gallery);
            });
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

    async function setupAuditTab() {
        setupAuditChannelSearch();

        // Wire up all event listeners first (synchronous, always succeeds)
        document.getElementById('audit-run').addEventListener('click', runAudit);
        document.getElementById('audit-config-done').addEventListener('click', collapseAuditConfig);
        document.getElementById('audit-save-list').addEventListener('click', saveChannelList);
        document.getElementById('audit-update-list').addEventListener('click', updateChannelList);
        document.getElementById('audit-rename-list').addEventListener('click', renameChannelList);
        document.getElementById('audit-delete-list').addEventListener('click', deleteChannelList);
        document.getElementById('audit-saved-lists').addEventListener('change', loadChannelList);
        document.getElementById('audit-clear-all').addEventListener('click', () => {
            auditSelectedChannels = [];
            auditResults = [];
            renderSelectedChips();
            document.getElementById('audit-results').innerHTML = '';
            expandAuditConfig();
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
        document.getElementById('audit-unselect-all').addEventListener('click', () => {
            auditSelectedChannels = [];
            renderSelectedChips();
        });

        // Load lists from GitHub (async) — done last so a failure doesn't block the UI
        await loadSavedChannelLists();
        populateSavedListsDropdown();
    }

    function setupAuditChannelSearch() {
        const selectedIds = () => new Set(auditSelectedChannels.map(ch => ch.id));
        ChannelDropdown.init({
            inputId: 'audit-channel-search',
            dropdownId: 'audit-channel-dropdown',
            getChannels: () => getTypeFilteredChannels(),
            filterFn: (ch) => !selectedIds().has(ch.id),
            onSelect: (ch) => {
                auditSelectedChannels.push({ id: ch.id, title: ch.title });
                renderSelectedChips();
            }
        });
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

    function renderSelectedChips() {
        const wrapper = document.getElementById('audit-selected-chips');
        const container = document.getElementById('audit-chips-container');

        if (auditSelectedChannels.length === 0) {
            wrapper.style.display = 'none';
            renderChannelBrowser();
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

    async function loadSavedChannelLists() {
        try {
            const lists = await GitHubStorage.loadLists();
            savedChannelLists = lists;

            // Migrate: if localStorage has data but GitHub was empty, push it up
            const localData = localStorage.getItem('pa_saved_channel_lists');
            if (localData && savedChannelLists.length === 0) {
                const localLists = JSON.parse(localData);
                if (localLists.length > 0) {
                    savedChannelLists = localLists;
                    if (GitHubStorage.hasToken()) {
                        await GitHubStorage.saveLists(savedChannelLists, 'Migrate channel lists from localStorage');
                        API.toast('Channel lists migrated to GitHub.', 'success');
                    }
                }
            }

            // Keep localStorage in sync as fallback
            localStorage.setItem('pa_saved_channel_lists', JSON.stringify(savedChannelLists));
        } catch (err) {
            // GitHub unavailable — fall back to localStorage
            console.warn('GitHub storage unavailable, using localStorage:', err.message);
            try {
                const stored = localStorage.getItem('pa_saved_channel_lists');
                savedChannelLists = stored ? JSON.parse(stored) : [];
            } catch (e) { savedChannelLists = []; }
        }
    }

    async function persistSavedChannelLists(commitMessage) {
        // Always update localStorage as immediate fallback
        try {
            localStorage.setItem('pa_saved_channel_lists', JSON.stringify(savedChannelLists));
        } catch (e) { /* localStorage failed — not critical if GitHub works */ }

        // Write to GitHub if token is available
        if (GitHubStorage.hasToken()) {
            try {
                await GitHubStorage.saveLists(savedChannelLists, commitMessage || 'Update channel lists');
            } catch (err) {
                API.toast('Failed to save to GitHub: ' + err.message, 'error');
            }
        } else {
            API.toast('No GitHub token — changes saved locally only. Add a token in Settings to persist.', 'warning');
        }
    }

    function populateSavedListsDropdown() {
        const sel = document.getElementById('audit-saved-lists');
        sel.innerHTML = '<option value="">Select a list...</option><option value="__none__">No list</option>';
        savedChannelLists.forEach((list, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = `${list.name} (${list.channels.length} ch)`;
            sel.appendChild(opt);
        });
    }

    async function saveChannelList() {
        const btn = document.getElementById('audit-save-list');
        if (btn.disabled) return;

        const name = prompt('Enter a name for the new list:');
        if (!name || !name.trim()) return;

        btn.disabled = true;
        try {
            const newIdx = savedChannelLists.length;
            savedChannelLists.push({
                name: name.trim(),
                channels: []
            });
            await persistSavedChannelLists(`Add channel list: ${name.trim()}`);
            populateSavedListsDropdown();

            // Auto-select the new list and clear channel selections
            activeListIdx = newIdx;
            document.getElementById('audit-saved-lists').value = newIdx;
            document.getElementById('audit-update-list').disabled = false;
            document.getElementById('audit-rename-list').disabled = false;
            auditSelectedChannels = [];
            renderSelectedChips();

            API.toast(`List "${name.trim()}" added. Select channels and click Update to populate it.`, 'success');
        } finally {
            btn.disabled = false;
        }
    }

    async function deleteChannelList() {
        const btn = document.getElementById('audit-delete-list');
        if (btn.disabled) return;

        const sel = document.getElementById('audit-saved-lists');
        const idx = parseInt(sel.value);
        if (isNaN(idx)) { API.toast('Select a list to delete.', 'warning'); return; }
        if (!confirm(`Delete "${savedChannelLists[idx].name}"?`)) return;

        btn.disabled = true;
        try {
            const deletedName = savedChannelLists[idx].name;
            savedChannelLists.splice(idx, 1);
            activeListIdx = null;
            document.getElementById('audit-update-list').disabled = true;
            document.getElementById('audit-rename-list').disabled = true;
            await persistSavedChannelLists(`Delete channel list: ${deletedName}`);
            populateSavedListsDropdown();
            API.toast('List deleted.', 'success');
        } finally {
            btn.disabled = false;
        }
    }

    function loadChannelList() {
        const sel = document.getElementById('audit-saved-lists');
        if (sel.value === '__none__' || sel.value === '') {
            activeListIdx = null;
            document.getElementById('audit-update-list').disabled = true;
            document.getElementById('audit-rename-list').disabled = true;
            if (sel.value === '__none__') {
                auditSelectedChannels = [];
                renderSelectedChips();
            }
            return;
        }
        const idx = parseInt(sel.value);

        activeListIdx = idx;
        auditSelectedChannels = [...savedChannelLists[idx].channels];
        renderSelectedChips();
        document.getElementById('audit-update-list').disabled = false;
        document.getElementById('audit-rename-list').disabled = false;
        if (auditSelectedChannels.length === 0) {
            API.toast(`"${savedChannelLists[idx].name}" has no channels — select channels and click Update to add them.`, 'warning');
        } else {
            API.toast(`Loaded "${savedChannelLists[idx].name}".`, 'success');
        }
    }

    async function updateChannelList() {
        const btn = document.getElementById('audit-update-list');
        if (activeListIdx === null || !savedChannelLists[activeListIdx]) {
            API.toast('No list selected to update.', 'warning');
            return;
        }
        if (auditSelectedChannels.length === 0) {
            API.toast('Select channels first.', 'warning');
            return;
        }

        btn.disabled = true;
        try {
            const name = savedChannelLists[activeListIdx].name;
            savedChannelLists[activeListIdx].channels = auditSelectedChannels.map(ch => ({ id: ch.id, title: ch.title }));
            await persistSavedChannelLists(`Update channel list: ${name}`);
            populateSavedListsDropdown();
            document.getElementById('audit-saved-lists').value = activeListIdx;
            API.toast(`Updated "${name}".`, 'success');
        } finally {
            btn.disabled = false;
        }
    }

    async function renameChannelList() {
        const btn = document.getElementById('audit-rename-list');
        if (activeListIdx === null || !savedChannelLists[activeListIdx]) {
            API.toast('No list selected to rename.', 'warning');
            return;
        }

        const oldName = savedChannelLists[activeListIdx].name;
        const newName = prompt('Enter a new name for this list:', oldName);
        if (!newName || !newName.trim() || newName.trim() === oldName) return;

        btn.disabled = true;
        try {
            savedChannelLists[activeListIdx].name = newName.trim();
            await persistSavedChannelLists(`Rename channel list: ${oldName} → ${newName.trim()}`);
            populateSavedListsDropdown();
            document.getElementById('audit-saved-lists').value = activeListIdx;
            API.toast(`Renamed to "${newName.trim()}".`, 'success');
        } finally {
            btn.disabled = false;
        }
    }

    // --- Config collapse/expand ---

    function collapseAuditConfig() {
        const config = document.getElementById('audit-config');
        const summary = document.getElementById('audit-config-summary');
        config.style.display = 'none';

        const channelCount = auditSelectedChannels.length;
        const startDate = document.getElementById('audit-start').value;
        const days = document.getElementById('audit-days').value;
        const formattedDate = new Date(startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        summary.style.display = '';
        summary.style.cssText = 'margin-bottom:16px;padding:10px 16px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:6px;display:flex;align-items:center;justify-content:space-between';
        summary.innerHTML = `
            <span style="font-size:13px;color:var(--color-text-secondary)">${channelCount} channel(s) &middot; ${formattedDate} &middot; ${days} day(s)</span>
            <button class="btn btn-sm btn-secondary" id="audit-config-edit">Edit</button>
        `;
        document.getElementById('audit-config-edit').addEventListener('click', expandAuditConfig);
    }

    function expandAuditConfig() {
        document.getElementById('audit-config').style.display = '';
        document.getElementById('audit-config-summary').style.display = 'none';
        document.getElementById('audit-config-collapse').style.display = auditResults.length > 0 ? '' : 'none';
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
        const auditSignal = API.cancelable('audit');

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
            if (auditSignal.aborted) { auditInProgress = false; return; }
            const result = {
                channelTitle: channel.title,
                channelId: channel.id,
                programmes: []
            };

            // Batch dates 5 at a time
            for (let i = 0; i < dates.length; i += 5) {
                if (auditSignal.aborted) { auditInProgress = false; return; }
                const batch = dates.slice(i, i + 5);
                const promises = batch.map(date => {
                    const nextDay = new Date(date);
                    nextDay.setDate(nextDay.getDate() + 1);
                    return API.fetch('/schedule', {
                        channelId: channel.id,
                        start: `${date}T00:00:00`,
                        end: `${nextDay.toISOString().slice(0, 10)}T00:00:00`
                    }, { signal: auditSignal }).then(data => ({ date, items: data.item || [] }))
                      .catch(err => {
                          if (err.name === 'AbortError') throw err;
                          return { date, items: [] };
                      });
                });

                const batchResults = await Promise.all(promises);
                batchResults.forEach(({ date, items }) => {
                    items.forEach(item => {
                        const images = getImages(item);
                        const sources = new Set(images.map(img => img.source));
                        const asset = item.asset || {};
                        const dt = item.dateTime ? new Date(item.dateTime) : null;
                        const categories = (asset.category || []).map(c => (c.name || '').toUpperCase());
                        const related = asset.related || [];
                        const seasonNumbers = related.filter(r => r.type === 'season').map(r => r.number).filter(Boolean);
                        const seriesId = (related.find(r => r.type === 'series') || {}).id || null;
                        const assetType = (asset.type || '').toLowerCase();
                        result.programmes.push({
                            title: item.title || 'Untitled',
                            dateTime: dt ? dt.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-',
                            assetId: asset.id || '-',
                            date,
                            assetType,
                            hasAnyImage: images.length > 0,
                            hasEpisodeImage: sources.has('episode'),
                            hasSeriesImage: sources.has('series'),
                            hasSeasonImage: sources.has('season'),
                            isOffAir: categories.includes('OFF-AIR'),
                            seasonNumbers,
                            seriesId
                        });
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
        collapseAuditConfig();
        API.smoothScroll(document.getElementById('audit-results'));
    }

    // --- Audit results rendering ---

    function getImageFlag(prog, mode) {
        if (mode === 'episode') return prog.hasEpisodeImage;
        if (mode === 'series') return prog.hasSeriesImage;
        if (mode === 'season') return prog.hasSeasonImage;
        return prog.hasAnyImage;
    }

    const STANDALONE_TYPES = new Set(['movie', 'one-off']);

    function getAuditCounts(result, mode) {
        if (mode === 'excluded') {
            const excluded = result.programmes.filter(p => p.isOffAir);
            return { total: excluded.length, withImages: 0, withoutImages: 0, missingProgrammes: excluded };
        }
        let progs = result.programmes.filter(p => !p.isOffAir);
        // Movies and one-offs don't have series/season images — exclude them from those counts
        if (mode === 'series' || mode === 'season') {
            progs = progs.filter(p => !STANDALONE_TYPES.has(p.assetType));
        }
        const withImages = progs.filter(p => getImageFlag(p, mode)).length;
        return {
            total: progs.length,
            withImages,
            withoutImages: progs.length - withImages,
            missingProgrammes: progs.filter(p => !getImageFlag(p, mode))
        };
    }

    function renderAuditResults() {
        const container = document.getElementById('audit-results');
        container.innerHTML = '';

        if (auditResults.length === 0) {
            API.showEmpty(container, 'No audit results.');
            return;
        }

        const mode = auditViewMode;
        const modeLabel = { any: 'Any Image', episode: 'Episode', series: 'Series', season: 'Season', excluded: 'Excluded' }[mode];

        // Compute totals for current view mode
        const totals = auditResults.reduce((acc, r) => {
            const c = getAuditCounts(r, mode);
            return { total: acc.total + c.total, with: acc.with + c.withImages, without: acc.without + c.withoutImages };
        }, { total: 0, with: 0, without: 0 });

        const totalPct = totals.total > 0 ? Math.round((totals.with / totals.total) * 100) : 0;

        // Count excluded programmes across all channels
        const totalExcluded = auditResults.reduce((sum, r) => sum + r.programmes.filter(p => p.isOffAir).length, 0);
        const totalAll = auditResults.reduce((sum, r) => sum + r.programmes.length, 0);
        const isExcluded = mode === 'excluded';

        // Summary info
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'results-info';
        summaryDiv.style.cssText = 'margin:0 0 12px 0';
        if (isExcluded) {
            summaryDiv.innerHTML = `${auditResults.length} channel(s) audited &mdash; ${totalAll} programmes total, <strong style="color:var(--color-text-secondary)">${totalExcluded}</strong> excluded (off-air)`;
        } else {
            const excludedNote = totalExcluded > 0 ? ` <span style="color:var(--color-text-secondary);font-size:13px">(${totalExcluded} off-air excluded)</span>` : '';
            const withLabel = mode === 'any' ? 'with at least one image' : `with ${modeLabel.toLowerCase()} images`;
            summaryDiv.innerHTML = `${auditResults.length} channel(s) audited &mdash; ${totals.total} programmes, <strong style="color:var(--color-success)">${totals.with}</strong> ${withLabel} (${totalPct}%), <strong style="color:${totals.without > 0 ? 'var(--color-error)' : 'var(--color-success)'}">${totals.without}</strong> missing${excludedNote}`;
        }
        // Sticky header for summary + toolbar
        const stickyHeader = document.createElement('div');
        stickyHeader.style.cssText = 'position:sticky;top:0;z-index:10;background:var(--color-bg);padding:12px 0 4px;margin:0 0 8px';
        stickyHeader.appendChild(summaryDiv);

        // Toolbar: view mode selector + action buttons in one row
        const toolbar = document.createElement('div');
        toolbar.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:4px;flex-wrap:wrap';

        const modes = [
            { key: 'any', label: 'Any Image' },
            { key: 'episode', label: 'Episode' },
            { key: 'series', label: 'Series' },
            { key: 'season', label: 'Season' }
        ];
        if (totalExcluded > 0) {
            modes.push({ key: 'excluded', label: `Excluded (${totalExcluded})` });
        }
        modes.forEach(m => {
            const btn = document.createElement('button');
            btn.className = `filter-btn${m.key === mode ? ' active' : ''}`;
            btn.textContent = m.label;
            btn.addEventListener('click', () => {
                auditViewMode = m.key;
                showAllMissing = false;
                renderAuditResults();
            });
            toolbar.appendChild(btn);
        });

        // Separator before action buttons
        const sep = document.createElement('div');
        sep.style.cssText = 'width:1px;height:24px;background:var(--color-border);margin:0 6px';
        toolbar.appendChild(sep);

        if (!isExcluded && totals.without > 0) {
            const viewAllBtn = document.createElement('button');
            viewAllBtn.className = 'btn btn-sm btn-secondary';
            viewAllBtn.textContent = showAllMissing ? 'Hide All Missing' : `View All Missing (${totals.without})`;
            viewAllBtn.addEventListener('click', () => {
                showAllMissing = !showAllMissing;
                renderAuditResults();
            });
            toolbar.appendChild(viewAllBtn);
        }

        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn btn-sm btn-secondary';
        exportBtn.textContent = 'Export to Excel';
        exportBtn.addEventListener('click', exportAuditExcel);
        toolbar.appendChild(exportBtn);
        stickyHeader.appendChild(toolbar);
        container.appendChild(stickyHeader);

        // Results table
        const table = document.createElement('table');
        table.className = 'data-table';

        if (isExcluded || (!isExcluded && showAllMissing)) {
            // Flat programme list: either all missing or excluded programmes
            const allProgs = [];
            auditResults.forEach(r => {
                const list = isExcluded
                    ? r.programmes.filter(p => p.isOffAir)
                    : getAuditCounts(r, mode).missingProgrammes;
                list.forEach(prog => allProgs.push({ channel: r.channelTitle, ...prog }));
            });

            // Deduplicate by assetId for series/season modes
            const shouldDedup = !isExcluded && (mode === 'series' || mode === 'season');
            let displayProgs = allProgs;
            let totalBroadcasts = allProgs.length;
            if (shouldDedup) {
                const grouped = new Map();
                allProgs.forEach(p => {
                    const key = p.assetId || p.title;
                    if (!grouped.has(key)) {
                        grouped.set(key, { ...p, count: 1 });
                    } else {
                        grouped.get(key).count++;
                    }
                });
                displayProgs = [...grouped.values()];
            }

            const isSeason = mode === 'season' && !isExcluded;
            const seasonCol = isSeason ? '<th>Season</th>' : '';

            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Channel</th>
                        <th>Programme</th>
                        ${seasonCol}
                        <th>Date/Time</th>
                        <th>Asset ID</th>
                        ${shouldDedup ? '<th style="text-align:center">Broadcasts</th>' : ''}
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');

            displayProgs.forEach(prog => {
                const seasonCell = isSeason ? `<td>${(prog.seasonNumbers || []).join(', ') || '-'}</td>` : '';
                const countCell = shouldDedup ? `<td style="text-align:center">${prog.count}</td>` : '';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${API.escapeHtml(prog.channel)}</strong></td>
                    <td>${API.escapeHtml(prog.title)}</td>
                    ${seasonCell}
                    <td>${API.escapeHtml(prog.dateTime)}</td>
                    <td><code style="font-size:11px;user-select:all">${API.escapeHtml(prog.assetId)}</code></td>
                    ${countCell}
                `;
                tbody.appendChild(tr);
            });

            if (shouldDedup && displayProgs.length !== totalBroadcasts) {
                const summaryRow = document.createElement('tr');
                summaryRow.style.cssText = 'font-weight:700;border-top:2px solid var(--color-border)';
                const colCount = isSeason ? 6 : 5;
                summaryRow.innerHTML = `<td colspan="${colCount}">${displayProgs.length} unique assets across ${totalBroadcasts} broadcasts</td>`;
                tbody.appendChild(summaryRow);
            }
        } else {
            // Normal coverage view
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Channel</th>
                        <th style="text-align:center">Total</th>
                        <th style="text-align:center">With Images</th>
                        <th style="text-align:center">Missing</th>
                        <th style="text-align:right">Coverage</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');

            auditResults.forEach(result => {
                const counts = getAuditCounts(result, mode);
                const pct = counts.total > 0 ? Math.round((counts.withImages / counts.total) * 100) : 0;
                let pctColor, pctBg;
                if (pct >= 90) { pctColor = '#1a7f37'; pctBg = '#e6f7ec'; }
                else if (pct >= 70) { pctColor = '#c77c00'; pctBg = '#fff3e0'; }
                else { pctColor = '#cf222e'; pctBg = '#ffeef0'; }

                const row = document.createElement('tr');
                row.className = 'clickable';
                row.innerHTML = `
                    <td><strong>${API.escapeHtml(result.channelTitle)}</strong></td>
                    <td style="text-align:center">${counts.total}</td>
                    <td style="text-align:center"><span style="color:#1a7f37;font-weight:600">${counts.withImages}</span></td>
                    <td style="text-align:center">${counts.withoutImages > 0 ? `<span style="color:#cf222e;font-weight:600">${counts.withoutImages}</span>` : '<span style="color:#1a7f37">0</span>'}</td>
                    <td style="text-align:right"><span style="display:inline-block;padding:2px 10px;border-radius:12px;font-weight:700;font-size:13px;background:${pctBg};color:${pctColor}">${pct}%</span></td>
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
                    if (!isOpen) {
                        drillCell.innerHTML = '';
                        renderAuditDrillDown(drillCell, result);
                    }
                });

                tbody.appendChild(row);
                tbody.appendChild(drillRow);
            });

            // Totals row
            const totalsRow = document.createElement('tr');
            totalsRow.style.cssText = 'font-weight:700;border-top:2px solid var(--color-border)';
            let tPctColor, tPctBg;
            if (totalPct >= 90) { tPctColor = '#1a7f37'; tPctBg = '#e6f7ec'; }
            else if (totalPct >= 70) { tPctColor = '#c77c00'; tPctBg = '#fff3e0'; }
            else { tPctColor = '#cf222e'; tPctBg = '#ffeef0'; }
            totalsRow.innerHTML = `
                <td>TOTAL</td>
                <td style="text-align:center">${totals.total}</td>
                <td style="text-align:center"><span style="color:#1a7f37">${totals.with}</span></td>
                <td style="text-align:center">${totals.without > 0 ? `<span style="color:#cf222e">${totals.without}</span>` : '<span style="color:#1a7f37">0</span>'}</td>
                <td style="text-align:right"><span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:13px;background:${tPctBg};color:${tPctColor}">${totalPct}%</span></td>
            `;
            tbody.appendChild(totalsRow);
        }

        container.appendChild(table);
    }

    function renderAuditDrillDown(cell, result) {
        const mode = auditViewMode;
        const isExcluded = mode === 'excluded';
        const modeLabel = { any: 'any', episode: 'episode', series: 'series', season: 'season', excluded: 'excluded' }[mode];
        const progs = isExcluded
            ? result.programmes.filter(p => p.isOffAir)
            : getAuditCounts(result, mode).missingProgrammes;

        if (progs.length === 0) {
            cell.innerHTML = isExcluded
                ? '<div style="padding:16px;color:var(--color-text-secondary)">No excluded programmes.</div>'
                : `<div style="padding:16px;color:var(--color-success);font-weight:600">All programmes have ${modeLabel} images!</div>`;
            return;
        }

        // Deduplicate for series/season
        const shouldDedup = !isExcluded && (mode === 'series' || mode === 'season');
        let displayProgs = progs;
        const totalCount = progs.length;
        if (shouldDedup) {
            const grouped = new Map();
            progs.forEach(p => {
                const key = p.assetId || p.title;
                if (!grouped.has(key)) grouped.set(key, { ...p, count: 1 });
                else grouped.get(key).count++;
            });
            displayProgs = [...grouped.values()];
        }

        const isSeason = mode === 'season' && !isExcluded;
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'padding:12px 16px;max-height:400px;overflow-y:auto';

        const heading = document.createElement('div');
        heading.style.cssText = 'font-size:13px;font-weight:600;color:var(--color-text-secondary);margin-bottom:8px';
        if (isExcluded) {
            heading.textContent = `Excluded Off-Air Programmes (${progs.length})`;
        } else if (shouldDedup && displayProgs.length !== totalCount) {
            heading.textContent = `Missing ${modeLabel.charAt(0).toUpperCase() + modeLabel.slice(1)} Images — ${displayProgs.length} unique assets (${totalCount} broadcasts)`;
        } else {
            heading.textContent = `Programmes Missing ${modeLabel.charAt(0).toUpperCase() + modeLabel.slice(1)} Images (${displayProgs.length})`;
        }
        wrapper.appendChild(heading);

        const seasonColH = isSeason ? '<th>Season</th>' : '';
        const countColH = shouldDedup ? '<th style="text-align:center">Broadcasts</th>' : '';
        const miniTable = document.createElement('table');
        miniTable.className = 'data-table';
        miniTable.style.fontSize = '13px';
        miniTable.innerHTML = `<thead><tr><th>Programme</th>${seasonColH}<th>Date/Time</th><th>Asset ID</th>${countColH}</tr></thead><tbody></tbody>`;
        const miniBody = miniTable.querySelector('tbody');

        displayProgs.forEach(prog => {
            const seasonCell = isSeason ? `<td>${(prog.seasonNumbers || []).join(', ') || '-'}</td>` : '';
            const countCell = shouldDedup ? `<td style="text-align:center">${prog.count}</td>` : '';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${API.escapeHtml(prog.title)}</td>
                ${seasonCell}
                <td>${API.escapeHtml(prog.dateTime)}</td>
                <td><code style="font-size:11px;user-select:all">${API.escapeHtml(prog.assetId)}</code></td>
                ${countCell}
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
        const modes = ['any', 'episode', 'series', 'season'];

        // Summary sheet with all image type breakdowns
        const summaryRows = auditResults.map(r => {
            const excluded = r.programmes.filter(p => p.isOffAir).length;
            const row = { 'Channel': r.channelTitle, 'Total Programmes': r.programmes.length, 'Excluded (Off-Air)': excluded };
            modes.forEach(m => {
                const label = { any: 'Any', episode: 'Episode', series: 'Series', season: 'Season' }[m];
                const c = getAuditCounts(r, m);
                row[`${label} — With`] = c.withImages;
                row[`${label} — Missing`] = c.withoutImages;
                row[`${label} — Coverage %`] = c.total > 0 ? Math.round((c.withImages / c.total) * 100) : 0;
            });
            return row;
        });

        // Totals row
        const totalExcluded = auditResults.reduce((sum, r) => sum + r.programmes.filter(p => p.isOffAir).length, 0);
        const totalAllProgs = auditResults.reduce((sum, r) => sum + r.programmes.length, 0);
        const totalsRow = { 'Channel': 'TOTAL', 'Total Programmes': totalAllProgs, 'Excluded (Off-Air)': totalExcluded };
        modes.forEach(m => {
            const label = { any: 'Any', episode: 'Episode', series: 'Series', season: 'Season' }[m];
            const t = auditResults.reduce((acc, r) => {
                const c = getAuditCounts(r, m);
                return { total: acc.total + c.total, with: acc.with + c.withImages };
            }, { total: 0, with: 0 });
            totalsRow[`${label} — With`] = t.with;
            totalsRow[`${label} — Missing`] = t.total - t.with;
            totalsRow[`${label} — Coverage %`] = t.total > 0 ? Math.round((t.with / t.total) * 100) : 0;
        });
        summaryRows.push(totalsRow);

        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Summary');

        // Missing images sheets per type
        modes.forEach(m => {
            const label = { any: 'Any', episode: 'Episode', series: 'Series', season: 'Season' }[m];
            const missingRows = [];
            auditResults.forEach(r => {
                getAuditCounts(r, m).missingProgrammes.forEach(p => {
                    missingRows.push({
                        'Channel': r.channelTitle,
                        'Programme': p.title,
                        'Date/Time': p.dateTime,
                        'Asset ID': p.assetId
                    });
                });
            });
            if (missingRows.length > 0) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(missingRows), `Missing ${label}`);
            }
        });

        // Excluded (off-air) sheet
        const excludedRows = [];
        auditResults.forEach(r => {
            r.programmes.filter(p => p.isOffAir).forEach(p => {
                excludedRows.push({
                    'Channel': r.channelTitle,
                    'Programme': p.title,
                    'Date/Time': p.dateTime,
                    'Asset ID': p.assetId
                });
            });
        });
        if (excludedRows.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(excludedRows), 'Excluded Off-Air');
        }

        const fileName = `Image_Audit_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
        API.toast('Audit exported.', 'success');
    }

    return { render, showProgrammeDetail };
})();

