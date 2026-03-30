const ScheduleView = (() => {
    let platforms = [];

    async function render(container) {
        const today = new Date().toISOString().slice(0, 10);
        container.innerHTML = `
            <div class="view-header">
                <h2>Schedule</h2>
                <p>View the TV schedule for a channel within a date range (max 21 days).</p>
            </div>
            <div class="filter-bar">
                <div class="form-group">
                    <label>Platform</label>
                    <select id="sch-platform" class="select">
                        <option value="">Loading...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Region</label>
                    <select id="sch-region" class="select">
                        <option value="">Select platform first</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Channel</label>
                    <select id="sch-channel" class="select">
                        <option value="">Select platform & region</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Start Date</label>
                    <input type="date" id="sch-start" class="input" style="min-width:150px" value="${today}">
                </div>
                <div class="form-group">
                    <label>End Date</label>
                    <input type="date" id="sch-end" class="input" style="min-width:150px">
                </div>
                <div class="form-group">
                    <label>&nbsp;</label>
                    <button id="sch-search" class="btn btn-primary">Load Schedule</button>
                </div>
            </div>
            <div id="schedule-results"></div>
        `;

        // Set default end date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('sch-end').value = tomorrow.toISOString().slice(0, 10);

        await loadPlatforms();
        document.getElementById('sch-platform').addEventListener('change', onPlatformChange);
        document.getElementById('sch-region').addEventListener('change', onRegionChange);
        document.getElementById('sch-search').addEventListener('click', loadSchedule);
    }

    async function loadPlatforms() {
        const sel = document.getElementById('sch-platform');
        try {
            const data = await API.fetch('/platform');
            platforms = data.item || [];
            sel.innerHTML = '<option value="">-- Select Platform --</option>';
            platforms.forEach(p => {
                sel.innerHTML += `<option value="${API.escapeHtml(p.id)}">${API.escapeHtml(p.title)}</option>`;
            });
        } catch (err) {
            sel.innerHTML = '<option value="">Error loading</option>';
        }
    }

    async function onPlatformChange() {
        const platformId = document.getElementById('sch-platform').value;
        const regSel = document.getElementById('sch-region');
        const chSel = document.getElementById('sch-channel');
        chSel.innerHTML = '<option value="">Select region first</option>';

        if (!platformId) {
            regSel.innerHTML = '<option value="">Select platform first</option>';
            return;
        }

        regSel.innerHTML = '<option value="">Loading...</option>';
        try {
            const data = await API.fetch(`/platform/${platformId}/region`);
            const regions = data.item || data || [];
            regSel.innerHTML = '<option value="">-- Select Region --</option>';
            regions.forEach(r => {
                const name = r.title || r.name || 'Unnamed';
                regSel.innerHTML += `<option value="${API.escapeHtml(r.id)}">${API.escapeHtml(name)}</option>`;
            });
        } catch (err) {
            regSel.innerHTML = '<option value="">Error loading</option>';
        }
    }

    async function onRegionChange() {
        const platformId = document.getElementById('sch-platform').value;
        const regionId = document.getElementById('sch-region').value;
        const chSel = document.getElementById('sch-channel');

        if (!platformId || !regionId) {
            chSel.innerHTML = '<option value="">Select platform & region</option>';
            return;
        }

        chSel.innerHTML = '<option value="">Loading channels...</option>';
        try {
            const data = await API.fetch('/channel', { platformId, regionId });
            const channels = data.item || [];
            chSel.innerHTML = '<option value="">-- Select Channel --</option>';
            channels.forEach(ch => {
                const label = ch.epg ? `${ch.epg}. ${ch.title}` : ch.title;
                chSel.innerHTML += `<option value="${API.escapeHtml(ch.id)}">${API.escapeHtml(label)}</option>`;
            });
        } catch (err) {
            chSel.innerHTML = '<option value="">Error loading</option>';
        }
    }

    async function loadSchedule() {
        const results = document.getElementById('schedule-results');
        const channelId = document.getElementById('sch-channel').value;
        const start = document.getElementById('sch-start').value;
        const end = document.getElementById('sch-end').value;

        if (!channelId) {
            API.toast('Please select a channel.', 'warning');
            return;
        }
        if (!start) {
            API.toast('Please select a start date.', 'warning');
            return;
        }

        // Validate max 21 days
        if (start && end) {
            const diffMs = new Date(end) - new Date(start);
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            if (diffDays > 21) {
                API.toast('Date range cannot exceed 21 days.', 'warning');
                return;
            }
            if (diffDays < 0) {
                API.toast('End date must be after start date.', 'warning');
                return;
            }
        }

        const params = { channelId, start: `${start}T00:00:00` };
        if (end) params.end = `${end}T23:59:59`;

        API.showLoading(results);
        try {
            const data = await API.fetch('/schedule', params);
            renderSchedule(results, data);
        } catch (err) {
            API.showError(results, err.message);
        }
    }

    function renderSchedule(container, data) {
        container.innerHTML = '';
        const items = data.item || [];
        if (items.length === 0) {
            API.showEmpty(container, 'No schedule data found for this channel and date range.');
            return;
        }

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `${data.total || items.length} programme(s)`;
        container.appendChild(info);

        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Time</th>
                    <th>Title</th>
                    <th>Duration</th>
                    <th>Rating</th>
                    <th>Attributes</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        container.appendChild(table);

        const tbody = table.querySelector('tbody');
        items.forEach(item => {
            const tr = document.createElement('tr');
            const dt = item.dateTime ? new Date(item.dateTime) : null;
            const time = dt ? dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-';
            const date = dt ? dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
            const duration = item.duration ? `${item.duration} min` : '-';
            const rating = item.certification ? Object.values(item.certification)[0] || '-' : '-';
            const attrs = (item.attribute || []).map(a =>
                `<span class="badge badge-gray">${API.escapeHtml(a)}</span>`
            ).join(' ');

            tr.innerHTML = `
                <td><strong>${API.escapeHtml(time)}</strong><br><small style="color:var(--color-text-secondary)">${API.escapeHtml(date)}</small></td>
                <td>${API.escapeHtml(item.title || 'Untitled')}</td>
                <td>${API.escapeHtml(duration)}</td>
                <td>${API.escapeHtml(String(rating))}</td>
                <td>${attrs || '-'}</td>
            `;

            if (item.asset) {
                tr.className = 'clickable';
                tr.addEventListener('click', () => showScheduleItemDetail(item));
            }
            tbody.appendChild(tr);
        });

        container.appendChild(API.jsonToggle(data));
    }

    function showScheduleItemDetail(item) {
        const container = document.getElementById('content');
        const existingDetail = document.getElementById('schedule-detail');
        if (existingDetail) existingDetail.remove();

        const results = document.getElementById('schedule-results');

        const panel = document.createElement('div');
        panel.id = 'schedule-detail';
        panel.className = 'detail-panel';
        panel.style.marginBottom = '20px';

        const dt = item.dateTime ? new Date(item.dateTime) : null;
        const timeStr = dt ? dt.toLocaleString('en-GB') : '-';
        const asset = item.asset || {};
        const summary = item.summary || asset.summary || {};

        panel.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:start;">
                <h3>${API.escapeHtml(item.title || 'Untitled')}</h3>
                <button class="btn btn-sm btn-secondary" onclick="this.closest('.detail-panel').remove()">Close</button>
            </div>
            <div class="detail-row"><div class="detail-label">Broadcast</div><div class="detail-value">${API.escapeHtml(timeStr)}</div></div>
            <div class="detail-row"><div class="detail-label">Duration</div><div class="detail-value">${item.duration ? item.duration + ' min' : '-'}</div></div>
            ${asset.type ? `<div class="detail-row"><div class="detail-label">Type</div><div class="detail-value"><span class="badge badge-purple">${API.escapeHtml(asset.type)}</span></div></div>` : ''}
            ${summary.short ? `<div class="detail-row"><div class="detail-label">Summary</div><div class="detail-value">${API.escapeHtml(summary.short)}</div></div>` : ''}
            ${summary.medium ? `<div class="detail-row"><div class="detail-label">Description</div><div class="detail-value">${API.escapeHtml(summary.medium)}</div></div>` : ''}
            ${summary.long ? `<div class="detail-row"><div class="detail-label">Full Description</div><div class="detail-value">${API.escapeHtml(summary.long)}</div></div>` : ''}
        `;

        panel.appendChild(API.jsonToggle(item));
        results.parentNode.insertBefore(panel, results);
    }

    return { render };
})();
