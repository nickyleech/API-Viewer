const ChannelsView = (() => {
    let platforms = [];
    let regions = [];

    async function render(container) {
        container.innerHTML = `
            <div class="view-header">
                <h2>Channels</h2>
                <p>Search channels by platform, region, and date.</p>
            </div>
            <div class="filter-bar">
                <div class="form-group">
                    <label>Platform</label>
                    <select id="ch-platform" class="select">
                        <option value="">Loading...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Region</label>
                    <select id="ch-region" class="select">
                        <option value="">Select a platform first</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Date</label>
                    <input type="date" id="ch-date" class="input" style="min-width:160px">
                </div>
                <div class="form-group">
                    <label>&nbsp;</label>
                    <button id="ch-search" class="btn btn-primary">Search</button>
                </div>
            </div>
            <div id="channels-results"></div>
        `;

        await loadPlatforms();
        document.getElementById('ch-platform').addEventListener('change', onPlatformChange);
        document.getElementById('ch-search').addEventListener('click', searchChannels);
    }

    async function loadPlatforms() {
        const sel = document.getElementById('ch-platform');
        try {
            const data = await API.fetch('/platform');
            platforms = data.item || [];
            sel.innerHTML = '<option value="">-- Select Platform --</option>';
            platforms.forEach(p => {
                sel.innerHTML += `<option value="${API.escapeHtml(p.id)}">${API.escapeHtml(p.title)}</option>`;
            });
        } catch (err) {
            sel.innerHTML = '<option value="">Error loading platforms</option>';
        }
    }

    async function onPlatformChange() {
        const platformId = document.getElementById('ch-platform').value;
        const sel = document.getElementById('ch-region');
        if (!platformId) {
            sel.innerHTML = '<option value="">Select a platform first</option>';
            regions = [];
            return;
        }
        sel.innerHTML = '<option value="">Loading regions...</option>';
        try {
            const data = await API.fetch(`/platform/${platformId}/region`);
            regions = data.item || data || [];
            sel.innerHTML = '<option value="">-- All Regions --</option>';
            regions.forEach(r => {
                const name = r.title || r.name || 'Unnamed';
                sel.innerHTML += `<option value="${API.escapeHtml(r.id)}">${API.escapeHtml(name)}</option>`;
            });
        } catch (err) {
            sel.innerHTML = '<option value="">Error loading regions</option>';
        }
    }

    async function searchChannels() {
        const results = document.getElementById('channels-results');
        const platformId = document.getElementById('ch-platform').value;
        const regionId = document.getElementById('ch-region').value;
        const date = document.getElementById('ch-date').value;

        const params = {};
        if (platformId) params.platformId = platformId;
        if (regionId) params.regionId = regionId;
        if (date) params.date = date;

        API.showLoading(results);
        try {
            const data = await API.fetch('/channel', params);
            renderChannels(results, data);
        } catch (err) {
            API.showError(results, err.message);
        }
    }

    function renderChannels(container, data) {
        container.innerHTML = '';
        const items = data.item || [];
        if (items.length === 0) {
            API.showEmpty(container, 'No channels found. Try different filters.');
            return;
        }

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `${data.total || items.length} channel(s)`;
        container.appendChild(info);

        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>EPG</th>
                    <th>Channel</th>
                    <th>Category</th>
                    <th>Attributes</th>
                </tr>
            </thead>
            <tbody id="ch-tbody"></tbody>
        `;
        container.appendChild(table);

        const tbody = table.querySelector('tbody');
        items.forEach(ch => {
            const tr = document.createElement('tr');
            tr.className = 'clickable';
            const cats = (ch.category || []).map(c => c.name).join(', ');
            const attrs = (ch.attribute || []).map(a =>
                `<span class="badge ${a === 'hd' ? 'badge-green' : 'badge-gray'}">${API.escapeHtml(a)}</span>`
            ).join(' ');
            tr.innerHTML = `
                <td>${API.escapeHtml(ch.epg || '-')}</td>
                <td><strong>${API.escapeHtml(ch.title)}</strong></td>
                <td>${API.escapeHtml(cats || '-')}</td>
                <td>${attrs || '-'}</td>
            `;
            tr.addEventListener('click', () => showChannelDetail(ch));
            tbody.appendChild(tr);
        });

        container.appendChild(API.jsonToggle(data));
    }

    async function showChannelDetail(channel) {
        const container = document.getElementById('content');
        container.innerHTML = '';

        const back = document.createElement('a');
        back.className = 'back-link';
        back.innerHTML = '&larr; Back to Channels';
        back.addEventListener('click', () => render(container));
        container.appendChild(back);

        // Fetch full detail
        const panel = document.createElement('div');
        panel.className = 'detail-panel';
        API.showLoading(panel);
        container.appendChild(panel);

        try {
            const data = await API.fetch(`/channel/${channel.id}`);
            renderChannelDetail(panel, data);
        } catch (err) {
            API.showError(panel, err.message);
        }
    }

    function renderChannelDetail(panel, ch) {
        const cats = (ch.category || []).map(c => c.name).join(', ');
        const attrs = (ch.attribute || []).join(', ');
        const subjects = (ch.subject || []).map(s => s.code).join(', ');

        panel.innerHTML = `
            <h3>${API.escapeHtml(ch.title)}</h3>
            <div class="detail-row">
                <div class="detail-label">ID</div>
                <div class="detail-value">${API.escapeHtml(ch.id)}</div>
            </div>
            ${ch.epg ? `<div class="detail-row"><div class="detail-label">EPG Number</div><div class="detail-value">${API.escapeHtml(ch.epg)}</div></div>` : ''}
            ${cats ? `<div class="detail-row"><div class="detail-label">Categories</div><div class="detail-value">${API.escapeHtml(cats)}</div></div>` : ''}
            ${attrs ? `<div class="detail-row"><div class="detail-label">Attributes</div><div class="detail-value">${API.escapeHtml(attrs)}</div></div>` : ''}
            ${subjects ? `<div class="detail-row"><div class="detail-label">Subject Codes</div><div class="detail-value">${API.escapeHtml(subjects)}</div></div>` : ''}
        `;

        // Show media/images if present
        if (ch.media && ch.media.length > 0) {
            const mediaHtml = ch.media.map(m => {
                const renditions = m.rendition || [];
                const img = renditions.find(r => r.href) || {};
                return img.href ? `<img src="${API.escapeHtml(img.href)}" class="thumb" alt="Channel logo" style="width:120px;height:auto;margin:4px;">` : '';
            }).join('');
            if (mediaHtml) {
                const mediaRow = document.createElement('div');
                mediaRow.className = 'detail-row';
                mediaRow.innerHTML = `<div class="detail-label">Media</div><div class="detail-value">${mediaHtml}</div>`;
                panel.appendChild(mediaRow);
            }
        }

        panel.appendChild(API.jsonToggle(ch));
    }

    return { render };
})();
