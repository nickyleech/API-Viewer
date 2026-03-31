const ScheduleView = (() => {
    let allChannels = [];

    async function render(container) {
        const today = new Date().toISOString().slice(0, 10);
        container.innerHTML = `
            <div class="view-header">
                <h2>Schedule</h2>
                <p>Pick a channel and date to view the full schedule. Click any programme for full details.</p>
            </div>
            <div class="filter-bar">
                <div class="form-group" style="min-width:300px;max-width:400px">
                    <label>Channel</label>
                    <input type="text" id="sch-channel-search" class="input" placeholder="Type to search channels..." style="width:100%" autocomplete="off">
                    <div id="sch-channel-dropdown" class="channel-dropdown"></div>
                    <input type="hidden" id="sch-channel-id">
                </div>
                <div class="form-group">
                    <label>Date</label>
                    <div style="display:flex;align-items:center;gap:8px">
                        <button id="sch-prev-day" class="btn btn-sm btn-secondary">&larr;</button>
                        <input type="date" id="sch-date" class="input" style="min-width:160px" value="${today}">
                        <button id="sch-next-day" class="btn btn-sm btn-secondary">&rarr;</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>&nbsp;</label>
                    <button id="sch-search" class="btn btn-primary">Load Schedule</button>
                </div>
            </div>
            <div id="schedule-results"></div>
        `;

        setupChannelSearch();
        document.getElementById('sch-search').addEventListener('click', loadSchedule);
        document.getElementById('sch-date').addEventListener('change', () => {
            if (document.getElementById('sch-channel-id').value) loadSchedule();
        });
        document.getElementById('sch-prev-day').addEventListener('click', () => shiftDay(-1));
        document.getElementById('sch-next-day').addEventListener('click', () => shiftDay(1));

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
        const input = document.getElementById('sch-channel-search');
        const dropdown = document.getElementById('sch-channel-dropdown');
        const hiddenId = document.getElementById('sch-channel-id');

        input.addEventListener('focus', () => {
            input.select();
        });
        input.addEventListener('input', () => showDropdown());

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#sch-channel-search') && !e.target.closest('#sch-channel-dropdown')) {
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
                    loadSchedule();
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

    function shiftDay(offset) {
        const dateInput = document.getElementById('sch-date');
        const dt = new Date(dateInput.value);
        dt.setDate(dt.getDate() + offset);
        dateInput.value = dt.toISOString().slice(0, 10);
        if (document.getElementById('sch-channel-id').value) loadSchedule();
    }

    async function loadSchedule() {
        const results = document.getElementById('schedule-results');
        const channelId = document.getElementById('sch-channel-id').value;
        const date = document.getElementById('sch-date').value;

        if (!channelId) {
            API.toast('Please select a channel from the dropdown.', 'warning');
            return;
        }
        if (!date) {
            API.toast('Please select a date.', 'warning');
            return;
        }

        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const params = {
            channelId,
            start: `${date}T00:00:00`,
            end: `${nextDay.toISOString().slice(0, 10)}T00:00:00`
        };

        API.showLoading(results);
        try {
            const data = await API.fetch('/schedule', params);
            renderSchedule(results, data);
        } catch (err) {
            API.showError(results, err.message);
        }
    }

    function shiftDay(offset) {
        const dateInput = document.getElementById('sch-date');
        const dt = new Date(dateInput.value);
        dt.setDate(dt.getDate() + offset);
        dateInput.value = dt.toISOString().slice(0, 10);
        loadSchedule();
    }

    function renderSchedule(container, data) {
        container.innerHTML = '';
        const items = data.item || [];
        if (items.length === 0) {
            API.showEmpty(container, 'No schedule data found for this channel and date.');
            return;
        }

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `${data.total || items.length} programme(s)`;
        container.appendChild(info);

        const list = document.createElement('div');
        list.id = 'schedule-list';
        container.appendChild(list);

        const channelName = (document.getElementById('sch-channel-search') || {}).value || '';

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card clickable';

            const dt = item.dateTime ? new Date(item.dateTime) : null;
            const time = dt ? dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-';
            const duration = item.duration ? `${item.duration} min` : '';
            const asset = item.asset || {};
            const summary = item.summary || asset.summary || {};
            const shortDesc = summary.short || '';
            const attrs = (item.attribute || []).map(a =>
                `<span class="badge ${a === 'hd' ? 'badge-green' : a === 'subtitles' ? 'badge-blue' : 'badge-gray'}">${API.escapeHtml(a)}</span>`
            ).join(' ');

            card.innerHTML = `
                <div style="display:flex;gap:16px;align-items:start">
                    <div style="min-width:56px;text-align:center">
                        <div style="font-size:20px;font-weight:700;color:var(--color-accent)">${API.escapeHtml(time)}</div>
                        ${duration ? `<div style="font-size:12px;color:var(--color-text-secondary)">${API.escapeHtml(duration)}</div>` : ''}
                        ${channelName ? `<div style="font-size:10px;color:var(--color-text-secondary);margin-top:4px;font-weight:600">${API.escapeHtml(channelName)}</div>` : ''}
                    </div>
                    <div style="flex:1">
                        <div class="card-title">${API.escapeHtml(item.title || 'Untitled')}</div>
                        ${shortDesc ? `<p style="margin:4px 0 0;font-size:13px;color:var(--color-text-secondary)">${API.escapeHtml(shortDesc)}</p>` : ''}
                        ${attrs ? `<div class="card-meta" style="margin-top:6px">${attrs}</div>` : ''}
                    </div>
                </div>
            `;
            card.addEventListener('click', () => showProgrammeDetail(item));
            list.appendChild(card);
        });

        container.firstElementChild.after(API.jsonToggle(data));
    }

    async function showProgrammeDetail(item) {
        const container = document.getElementById('content');
        window.scrollTo(0, 0);
        container.innerHTML = '';

        const back = document.createElement('a');
        back.className = 'back-link';
        back.innerHTML = '&larr; Back to Schedule';
        back.addEventListener('click', () => render(container));
        container.appendChild(back);

        const panel = document.createElement('div');
        panel.className = 'detail-panel';
        container.appendChild(panel);

        const dt = item.dateTime ? new Date(item.dateTime) : null;
        const timeStr = dt ? dt.toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
        const asset = item.asset || {};
        const summary = item.summary || asset.summary || {};
        const cats = (asset.category || []).map(c => `<span class="badge badge-blue">${API.escapeHtml(c.name)}</span>`).join(' ');
        const attrs = (item.attribute || []).map(a => `<span class="badge badge-gray">${API.escapeHtml(a)}</span>`).join(' ');
        const certification = item.certification || asset.certification || {};
        const certEntries = Object.entries(certification).map(([k, v]) => `${k}: ${v}`).join(', ');

        panel.innerHTML = `
            <h3>${API.escapeHtml(item.title || 'Untitled')}</h3>

            <div class="detail-row"><div class="detail-label">Schedule ID</div><div class="detail-value"><code style="font-size:12px;user-select:all">${API.escapeHtml(item.id || '')}</code></div></div>
            <div class="detail-row"><div class="detail-label">Broadcast</div><div class="detail-value">${API.escapeHtml(timeStr)}</div></div>
            ${item.duration ? `<div class="detail-row"><div class="detail-label">Duration</div><div class="detail-value">${item.duration} minutes</div></div>` : ''}
            ${asset.type ? `<div class="detail-row"><div class="detail-label">Type</div><div class="detail-value"><span class="badge badge-purple">${API.escapeHtml(asset.type)}</span></div></div>` : ''}
            ${asset.id ? `<div class="detail-row"><div class="detail-label">Asset ID</div><div class="detail-value"><code style="font-size:12px;user-select:all">${API.escapeHtml(asset.id)}</code></div></div>` : ''}
            ${cats ? `<div class="detail-row"><div class="detail-label">Categories</div><div class="detail-value">${cats}</div></div>` : ''}
            ${certEntries ? `<div class="detail-row"><div class="detail-label">Certification</div><div class="detail-value">${API.escapeHtml(certEntries)}</div></div>` : ''}
            ${attrs ? `<div class="detail-row"><div class="detail-label">Attributes</div><div class="detail-value">${attrs}</div></div>` : ''}
            ${summary.short ? `<div class="detail-row"><div class="detail-label">Summary</div><div class="detail-value">${API.escapeHtml(summary.short)}</div></div>` : ''}
            ${summary.medium ? `<div class="detail-row"><div class="detail-label">Description</div><div class="detail-value">${API.escapeHtml(summary.medium)}</div></div>` : ''}
            ${summary.long ? `<div class="detail-row"><div class="detail-label">Full Description</div><div class="detail-value">${API.escapeHtml(summary.long)}</div></div>` : ''}
        `;

        // Show images from asset media
        const imgs = API.extractImages(asset.media);
        if (imgs.length > 0) {
            const mediaRow = document.createElement('div');
            mediaRow.className = 'detail-row';
            mediaRow.innerHTML = `<div class="detail-label">Media</div><div class="detail-value">${
                imgs.slice(0, 4).map(r => `<img src="${API.escapeHtml(r.href)}" style="max-width:240px;height:auto;margin:4px;border-radius:4px;" alt="">`).join('')
            }</div>`;
            panel.appendChild(mediaRow);
        }

        // Show related assets (series, season links)
        if (asset.related && asset.related.length > 0) {
            const relatedRow = document.createElement('div');
            relatedRow.className = 'detail-row';
            relatedRow.innerHTML = `<div class="detail-label">Related</div><div class="detail-value">${
                asset.related.map(r => {
                    const label = r.type || 'related';
                    return `<span class="badge badge-orange" style="margin:2px">${API.escapeHtml(label)}: <code style="font-size:11px;user-select:all">${API.escapeHtml(r.id || '')}</code></span>`;
                }).join(' ')
            }</div>`;
            panel.appendChild(relatedRow);
        }

        // Show subject codes
        const subjects = [...(item.subject || []), ...(asset.subject || [])];
        if (subjects.length > 0) {
            const codes = [...new Set(subjects.map(s => s.code))];
            const subRow = document.createElement('div');
            subRow.className = 'detail-row';
            subRow.innerHTML = `<div class="detail-label">Subject Codes</div><div class="detail-value">${codes.map(c => `<code style="font-size:12px;margin:2px;padding:2px 6px;background:var(--color-bg);border-radius:3px">${API.escapeHtml(c)}</code>`).join(' ')}</div>`;
            panel.appendChild(subRow);
        }

        panel.firstElementChild.after(API.jsonToggle(item));
    }

    return { render };
})();
