const ImagesView = (() => {
    let allChannels = [];
    let scheduleItems = [];

    async function render(container) {
        const today = new Date().toISOString().slice(0, 10);
        container.innerHTML = `
            <div class="view-header">
                <h2>Image Viewer</h2>
                <p>Browse programme images for a channel. View which programmes have images and which are missing them.</p>
            </div>
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
            <div id="img-filter-bar" style="display:none">
                <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
                    <span style="font-size:14px;font-weight:600;color:var(--color-text-secondary)">Show:</span>
                    <button id="img-filter-all" class="btn btn-sm btn-primary">All Programmes</button>
                    <button id="img-filter-with" class="btn btn-sm btn-secondary">With Images <span id="img-count-with" class="badge badge-green" style="margin-left:4px">0</span></button>
                    <button id="img-filter-without" class="btn btn-sm btn-secondary">Without Images <span id="img-count-without" class="badge badge-orange" style="margin-left:4px">0</span></button>
                </div>
            </div>
            <div id="img-results"></div>
        `;

        setupChannelSearch();
        setupRangeToggle();
        document.getElementById('img-load').addEventListener('click', loadProgrammes);
        document.getElementById('img-filter-all').addEventListener('click', () => applyFilter('all'));
        document.getElementById('img-filter-with').addEventListener('click', () => applyFilter('with'));
        document.getElementById('img-filter-without').addEventListener('click', () => applyFilter('without'));

        await loadAllChannels();
    }

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

        input.addEventListener('focus', () => showDropdown());
        input.addEventListener('input', () => showDropdown());

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#img-channel-search') && !e.target.closest('#img-channel-dropdown')) {
                dropdown.style.display = 'none';
            }
        });

        function showDropdown() {
            const query = (input.value || '').toLowerCase().trim();
            const filtered = query
                ? allChannels.filter(ch => (ch.title || '').toLowerCase().includes(query))
                : allChannels;

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
                more.textContent = `${filtered.length - 50} more — keep typing to narrow results`;
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

        // Validate max 21 days
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
            applyFilter('all');
        } catch (err) {
            scheduleItems = [];
            document.getElementById('img-filter-bar').style.display = 'none';
            API.showError(results, err.message);
        }
    }

    function getImages(item) {
        const asset = item.asset || {};
        const media = asset.media || item.media || [];
        const mediaArr = Array.isArray(media) ? media : [media];
        const images = [];
        mediaArr.forEach(m => {
            if (!m) return;
            const renditions = m.rendition || [];
            const rendArr = Array.isArray(renditions) ? renditions : [renditions];
            rendArr.forEach(r => {
                if (r && r.href) images.push(r);
            });
        });
        return images;
    }

    function updateCounts() {
        const withImages = scheduleItems.filter(item => getImages(item).length > 0).length;
        const withoutImages = scheduleItems.length - withImages;
        document.getElementById('img-count-with').textContent = withImages;
        document.getElementById('img-count-without').textContent = withoutImages;
    }

    function applyFilter(filter) {
        // Update button styles
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

    function showProgrammeDetail(item) {
        const container = document.getElementById('content');
        container.innerHTML = '';

        const back = document.createElement('a');
        back.className = 'back-link';
        back.innerHTML = '&larr; Back to Image Viewer';
        back.addEventListener('click', () => render(container));
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

        // Image gallery
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
                imgEl.alt = item.title || '';
                imgEl.className = 'img-gallery-img';
                imgEl.addEventListener('click', () => openLightbox(img.href, item.title));

                wrapper.appendChild(imgEl);

                // Show image metadata
                const meta = document.createElement('div');
                meta.className = 'img-gallery-meta';
                const parts = [];
                if (img.width && img.height) parts.push(`${img.width} x ${img.height}`);
                if (img.type) parts.push(img.type);
                meta.innerHTML = `
                    ${parts.length ? `<span>${API.escapeHtml(parts.join(' · '))}</span>` : ''}
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

        // JSON toggle for full data
        const jsonSection = document.createElement('div');
        jsonSection.style.marginTop = '16px';
        jsonSection.appendChild(API.jsonToggle(item));
        container.appendChild(jsonSection);
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

    return { render };
})();
