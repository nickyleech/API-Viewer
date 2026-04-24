const PlatformsView = (() => {
    let lastData = null;

    async function render(container) {
        container.innerHTML = `
            <div class="view-header">
                <h2>Platforms</h2>
                <p>Browse available TV platforms and their regions. Click a platform to see its available regions.</p>
                <div style="margin-top:10px">
                    <button class="btn btn-sm btn-secondary" id="vod-catalogue-btn">VOD Catalogue IDs</button>
                </div>
            </div>
            <div id="vod-catalogue-section" style="display:none"></div>
            <div id="platforms-list"></div>
        `;
        document.getElementById('vod-catalogue-btn').addEventListener('click', loadVodCatalogue);
        await loadPlatforms();
    }

    async function loadPlatforms() {
        const list = document.getElementById('platforms-list');
        API.showLoading(list);
        try {
            const data = await API.fetch('/platform');
            lastData = data;
            renderPlatformList(list, data);
        } catch (err) {
            API.showError(list, err.message);
        }
    }

    function renderPlatformList(container, data) {
        container.innerHTML = '';
        if (!data.item || data.item.length === 0) {
            API.showEmpty(container, 'No platforms found.');
            return;
        }

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `${data.total || data.item.length} platform(s)`;
        container.appendChild(info);

        data.item.forEach(platform => {
            const card = document.createElement('div');
            card.className = 'card clickable';
            const codes = (platform.subject || []).map(s => s.code).filter(Boolean);
            card.innerHTML = `
                <div class="card-title">${API.escapeHtml(platform.title)}</div>
                <div class="card-meta">
                    <code style="font-size:12px;color:var(--color-text-secondary);user-select:all">${API.escapeHtml(platform.id)}</code>
                    ${codes.map(c => `<span class="badge badge-blue">${API.escapeHtml(c)}</span>`).join('')}
                </div>
            `;
            card.addEventListener('click', () => showPlatformDetail(platform));
            container.appendChild(card);
        });

        container.firstElementChild.after(API.jsonToggle(data));
    }

    async function showPlatformDetail(platform) {
        const container = document.getElementById('content');
        container.innerHTML = '';

        const back = document.createElement('a');
        back.className = 'back-link';
        back.innerHTML = '&larr; Back to Platforms';
        back.addEventListener('click', () => render(container));
        container.appendChild(back);

        const panel = document.createElement('div');
        panel.className = 'detail-panel';

        const subjects = platform.subject || [];
        panel.innerHTML = `
            <h3>${API.escapeHtml(platform.title)}</h3>
            <div class="detail-row">
                <div class="detail-label">ID</div>
                <div class="detail-value"><code style="font-size:12px;user-select:all">${API.escapeHtml(platform.id)}</code></div>
            </div>
            ${subjects.map(s => `
                <div class="detail-row">
                    <div class="detail-label">${API.escapeHtml(s.profile || 'Code')}</div>
                    <div class="detail-value"><span class="badge badge-blue">${API.escapeHtml(s.code)}</span></div>
                </div>
            `).join('')}
        `;
        panel.firstElementChild.after(API.jsonToggle(platform));
        container.appendChild(panel);

        // Load regions
        const regionsSection = document.createElement('div');
        regionsSection.innerHTML = '<h3 style="margin: 20px 0 12px;">Regions</h3>';
        container.appendChild(regionsSection);

        const regionsList = document.createElement('div');
        regionsList.id = 'regions-list';
        container.appendChild(regionsList);

        API.showLoading(regionsList);
        try {
            const data = await API.fetch(`/platform/${platform.id}/region`);
            renderRegions(regionsList, data, platform);
        } catch (err) {
            API.showError(regionsList, err.message);
        }
    }

    function renderRegions(container, data, platform) {
        container.innerHTML = '';
        const items = data.item || data;
        if (!items || items.length === 0) {
            API.showEmpty(container, 'No regions found for this platform.');
            return;
        }

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `${data.total || items.length} region(s)`;
        container.appendChild(info);

        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Region</th>
                    <th>API ID</th>
                    <th>Code</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        container.appendChild(table);

        const tbody = table.querySelector('tbody');
        items.forEach(region => {
            const tr = document.createElement('tr');
            const codes = (region.subject || []).map(s => s.code).filter(Boolean);
            tr.innerHTML = `
                <td><strong>${API.escapeHtml(region.title || region.name || 'Unnamed')}</strong></td>
                <td><code style="font-size:12px;color:var(--color-accent);user-select:all">${API.escapeHtml(region.id)}</code></td>
                <td>${codes.map(c => `<span class="badge badge-blue">${API.escapeHtml(c)}</span>`).join(' ') || '-'}</td>
            `;
            tbody.appendChild(tr);
        });

        container.firstElementChild.after(API.jsonToggle(data));
    }

    async function loadVodCatalogue() {
        const section = document.getElementById('vod-catalogue-section');
        const btn = document.getElementById('vod-catalogue-btn');

        // Toggle off if already showing
        if (section.style.display !== 'none') {
            section.style.display = 'none';
            btn.textContent = 'VOD Catalogue IDs';
            return;
        }

        section.style.display = 'block';
        btn.textContent = 'Hide VOD Catalogue';
        API.showLoading(section);

        const key = API.getApiKey();
        if (!key) {
            API.showError(section, 'No API key configured. Please set your API key.');
            return;
        }

        try {
            const response = await fetch(`https://tv.api.pressassociation.io/v2/catalogue?apikey=${encodeURIComponent(key)}`);
            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            renderVodCatalogue(section, data);
        } catch (err) {
            API.showError(section, err.message);
        }
    }

    function renderVodCatalogue(container, data) {
        container.innerHTML = '';

        const items = data.item || data.catalogues || (Array.isArray(data) ? data : [data]);
        if (!items || items.length === 0) {
            API.showEmpty(container, 'No VOD catalogues found.');
            return;
        }

        const heading = document.createElement('h3');
        heading.style.margin = '0 0 12px';
        heading.textContent = 'VOD Catalogues';
        container.appendChild(heading);

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `${data.total || items.length} catalogue(s)`;
        container.appendChild(info);

        container.appendChild(API.jsonToggle(data));

        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Catalogue ID</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        container.appendChild(table);

        const tbody = table.querySelector('tbody');
        items.forEach(cat => {
            const tr = document.createElement('tr');
            const title = cat.title || cat.name || 'Unnamed';
            const id = cat.id || cat.catalogueId || '-';
            tr.innerHTML = `
                <td><strong>${API.escapeHtml(title)}</strong></td>
                <td><code style="font-size:12px;color:var(--color-accent);user-select:all">${API.escapeHtml(id)}</code></td>
            `;
            tbody.appendChild(tr);
        });

        // Add separator below
        const hr = document.createElement('hr');
        hr.style.margin = '20px 0';
        container.appendChild(hr);
    }

    return { render };
})();
