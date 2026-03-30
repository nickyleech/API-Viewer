const ChannelsView = (() => {
    let platforms = [];
    let regions = [];
    let allChannels = [];

    async function render(container) {
        container.innerHTML = `
            <div class="view-header">
                <h2>Channels</h2>
                <p>Browse all TV and radio channels. Use the search box to find a channel by name, or filter by platform and region.</p>
            </div>
            <div class="filter-bar">
                <div class="form-group" style="flex:1;min-width:250px">
                    <label>Search</label>
                    <input type="text" id="ch-search-input" class="input" placeholder="Type to filter by channel name..." style="width:100%">
                </div>
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
                    <label>Channel State Date</label>
                    <input type="date" id="ch-date" class="input" style="min-width:160px" title="View channel names and attributes as they were/will be on this date">
                </div>
                <div class="form-group">
                    <label>&nbsp;</label>
                    <button id="ch-fetch" class="btn btn-primary">Load Channels</button>
                </div>
            </div>
            <div id="channels-results"></div>
        `;

        await loadPlatforms();
        document.getElementById('ch-platform').addEventListener('change', onPlatformChange);
        document.getElementById('ch-fetch').addEventListener('click', fetchChannels);
        document.getElementById('ch-search-input').addEventListener('input', filterChannels);

        // Auto-load all channels on render
        await fetchChannels();
    }

    async function loadPlatforms() {
        const sel = document.getElementById('ch-platform');
        try {
            const data = await API.fetch('/platform');
            platforms = data.item || [];
            sel.innerHTML = '<option value="">-- All Platforms --</option>';
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

    async function fetchChannels() {
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
            allChannels = data.item || [];
            renderChannels(results, allChannels, data);
        } catch (err) {
            allChannels = [];
            API.showError(results, err.message);
        }
    }

    function filterChannels() {
        const query = (document.getElementById('ch-search-input').value || '').toLowerCase().trim();
        const results = document.getElementById('channels-results');

        if (!allChannels.length) return;

        const filtered = query
            ? allChannels.filter(ch => (ch.title || '').toLowerCase().includes(query))
            : allChannels;

        renderChannels(results, filtered, null);
    }

    function renderChannels(container, items, rawData) {
        container.innerHTML = '';
        if (items.length === 0) {
            API.showEmpty(container, 'No channels found matching your search.');
            return;
        }

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `Showing ${items.length} of ${allChannels.length} channel(s)`;
        container.appendChild(info);

        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Channel</th>
                    <th>EPG</th>
                    <th>API ID</th>
                    <th>Category</th>
                    <th>Attributes</th>
                </tr>
            </thead>
            <tbody></tbody>
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
                <td><strong>${API.escapeHtml(ch.title)}</strong></td>
                <td>${API.escapeHtml(ch.epg || '-')}</td>
                <td><code style="font-size:12px;color:var(--color-accent);user-select:all">${API.escapeHtml(ch.id)}</code> <button class="copy-id-btn" data-id="${API.escapeHtml(ch.id)}" style="background:none;border:1px solid var(--color-border);border-radius:3px;cursor:pointer;font-size:11px;padding:1px 5px;color:var(--color-text-secondary)" title="Copy ID">Copy</button></td>
                <td>${API.escapeHtml(cats || '-')}</td>
                <td>${attrs || '-'}</td>
            `;
            tr.addEventListener('click', (e) => {
                if (e.target.closest('.copy-id-btn')) return;
                showChannelDetail(ch);
            });
            tbody.appendChild(tr);
        });

        // Copy ID button handler
        table.addEventListener('click', (e) => {
            const btn = e.target.closest('.copy-id-btn');
            if (!btn) return;
            e.stopPropagation();
            const id = btn.dataset.id;
            navigator.clipboard.writeText(id).then(() => {
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
            });
        });

        // Download Excel button
        const dlBtn = document.createElement('button');
        dlBtn.className = 'btn btn-secondary';
        dlBtn.style.marginTop = '12px';
        dlBtn.textContent = 'Download Excel (TV / Radio)';
        dlBtn.addEventListener('click', () => downloadChannelsExcel(items));
        container.appendChild(dlBtn);

        if (rawData) {
            container.appendChild(API.jsonToggle(rawData));
        }
    }

    function downloadChannelsExcel(channels) {
        const toRow = ch => ({
            'Channel': ch.title || '',
            'EPG': ch.epg || '',
            'API ID': ch.id || '',
            'Category': (ch.category || []).map(c => c.name).join(', '),
            'Attributes': (ch.attribute || []).join(', ')
        });

        const radio = channels.filter(ch => (ch.attribute || []).includes('radio'));
        const tv = channels.filter(ch => !(ch.attribute || []).includes('radio'));

        const wb = XLSX.utils.book_new();
        const tvSheet = XLSX.utils.json_to_sheet(tv.map(toRow));
        const radioSheet = XLSX.utils.json_to_sheet(radio.map(toRow));

        // Set column widths
        const colWidths = [{ wch: 30 }, { wch: 8 }, { wch: 40 }, { wch: 20 }, { wch: 20 }];
        tvSheet['!cols'] = colWidths;
        radioSheet['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, tvSheet, 'TV');
        XLSX.utils.book_append_sheet(wb, radioSheet, 'Radio');
        XLSX.writeFile(wb, 'Channels_TV_Radio.xlsx');
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
        const subjects = (ch.subject || []).map(s => `${s.profile}: ${s.code}`).join(', ');

        panel.innerHTML = `
            <h3>${API.escapeHtml(ch.title)}</h3>
            <div class="detail-row">
                <div class="detail-label">ID</div>
                <div class="detail-value"><code style="font-size:12px;user-select:all">${API.escapeHtml(ch.id)}</code> <button onclick="navigator.clipboard.writeText('${API.escapeHtml(ch.id)}').then(()=>{this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',1500)})" style="background:none;border:1px solid var(--color-border);border-radius:3px;cursor:pointer;font-size:11px;padding:1px 5px;color:var(--color-text-secondary)">Copy</button></div>
            </div>
            ${ch.epg ? `<div class="detail-row"><div class="detail-label">EPG Number</div><div class="detail-value">${API.escapeHtml(ch.epg)}</div></div>` : ''}
            ${cats ? `<div class="detail-row"><div class="detail-label">Categories</div><div class="detail-value">${API.escapeHtml(cats)}</div></div>` : ''}
            ${attrs ? `<div class="detail-row"><div class="detail-label">Attributes</div><div class="detail-value">${API.escapeHtml(attrs)}</div></div>` : ''}
            ${subjects ? `<div class="detail-row"><div class="detail-label">Subject Codes</div><div class="detail-value">${API.escapeHtml(subjects)}</div></div>` : ''}
        `;

        // Show meta fields (e.g. live-stream URLs)
        const meta = ch.meta || {};
        const metaEntries = Object.entries(meta).filter(([, v]) => v);
        if (metaEntries.length > 0) {
            metaEntries.forEach(([key, val]) => {
                const row = document.createElement('div');
                row.className = 'detail-row';
                const isUrl = typeof val === 'string' && val.startsWith('http');
                row.innerHTML = `
                    <div class="detail-label">${API.escapeHtml(key)}</div>
                    <div class="detail-value">${isUrl
                        ? `<a href="${API.escapeHtml(val)}" target="_blank" rel="noopener" style="word-break:break-all">${API.escapeHtml(val)}</a>`
                        : API.escapeHtml(String(val))
                    }</div>
                `;
                panel.appendChild(row);
            });
        }

        // Show media/images if present
        const chImgs = API.extractImages(ch.media);
        if (chImgs.length > 0) {
            const mediaHtml = chImgs.map(img =>
                `<img src="${API.escapeHtml(img.href)}" alt="Channel logo" style="width:120px;height:auto;margin:4px;border-radius:4px;border:1px solid var(--color-border);">`
            ).join('');
            const mediaRow = document.createElement('div');
            mediaRow.className = 'detail-row';
            mediaRow.innerHTML = `<div class="detail-label">Media</div><div class="detail-value">${mediaHtml}</div>`;
            panel.appendChild(mediaRow);
        }

        panel.appendChild(API.jsonToggle(ch));
    }

    return { render };
})();
