const AssetsView = (() => {
    let currentOffset = 0;
    let currentLimit = 20;
    let lastParams = {};
    let allItems = [];

    async function render(container) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        container.innerHTML = `
            <div class="view-header">
                <h2>Assets</h2>
                <p>Browse movies, episodes, series, and seasons.</p>
            </div>
            <div class="filter-bar">
                <div class="form-group">
                    <label>Updated After</label>
                    <input type="datetime-local" id="asset-updated" class="input" value="${yesterday.toISOString().slice(0, 16)}">
                </div>
                <div class="form-group">
                    <label>Limit</label>
                    <select id="asset-limit" class="select" style="min-width:80px">
                        <option value="10">10</option>
                        <option value="20" selected>20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>&nbsp;</label>
                    <button id="asset-search" class="btn btn-primary">Search</button>
                </div>
            </div>
            <div id="assets-results"></div>
        `;

        document.getElementById('asset-search').addEventListener('click', searchAssets);
    }

    async function searchAssets() {
        const results = document.getElementById('assets-results');
        const updatedAfter = document.getElementById('asset-updated').value;
        const limit = document.getElementById('asset-limit').value;

        const params = {};
        if (updatedAfter) params.updatedAfter = updatedAfter + ':00.000Z';
        params.limit = limit;

        currentLimit = parseInt(limit);
        lastParams = params;
        allItems = [];

        API.showLoading(results);
        try {
            const data = await API.fetch('/asset', params);
            renderAssets(results, data);
        } catch (err) {
            API.showError(results, err.message);
        }
    }

    function renderAssets(container, data) {
        container.innerHTML = '';
        const items = data.item || [];
        allItems = items;

        if (items.length === 0) {
            API.showEmpty(container, 'No assets found. Try a more recent date.');
            return;
        }

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `Showing ${items.length} asset(s)${data.hasNext ? ' (more available)' : ''}`;
        container.appendChild(info);

        const listEl = document.createElement('div');
        listEl.id = 'assets-list';
        container.appendChild(listEl);

        items.forEach(asset => {
            const card = document.createElement('div');
            card.className = 'card clickable';

            const typeBadge = getTypeBadge(asset.type);
            const cats = (asset.category || []).map(c => c.name).join(', ');
            const year = asset.productionYear || '';

            card.innerHTML = `
                <div style="display:flex;gap:12px;align-items:start;">
                    ${getAssetThumb(asset)}
                    <div style="flex:1">
                        <div class="card-title">${API.escapeHtml(asset.title || 'Untitled')}</div>
                        <div class="card-meta">
                            ${typeBadge}
                            ${year ? `<span class="badge badge-gray">${year}</span>` : ''}
                            ${cats ? `<span class="card-subtitle">${API.escapeHtml(cats)}</span>` : ''}
                        </div>
                        ${asset.summary && asset.summary.short ? `<p style="margin-top:6px;font-size:13px;color:var(--color-text-secondary)">${API.escapeHtml(asset.summary.short)}</p>` : ''}
                    </div>
                </div>
            `;
            card.addEventListener('click', () => showAssetDetail(asset.id));
            listEl.appendChild(card);
        });

        container.appendChild(API.jsonToggle(data));
    }

    function getTypeBadge(type) {
        const colors = { movie: 'badge-orange', episode: 'badge-blue', series: 'badge-purple', season: 'badge-green' };
        const cls = colors[type] || 'badge-gray';
        return `<span class="badge ${cls}">${API.escapeHtml(type || 'unknown')}</span>`;
    }

    function getAssetThumb(asset) {
        const imgs = API.extractImages(asset.media);
        if (imgs.length > 0) {
            return `<img src="${API.escapeHtml(imgs[0].href)}" class="thumb" alt="">`;
        }
        return '';
    }

    async function showAssetDetail(assetId) {
        const container = document.getElementById('content');
        container.innerHTML = '';

        const back = document.createElement('a');
        back.className = 'back-link';
        back.innerHTML = '&larr; Back to Assets';
        back.addEventListener('click', () => render(container));
        container.appendChild(back);

        const panel = document.createElement('div');
        panel.className = 'detail-panel';
        API.showLoading(panel);
        container.appendChild(panel);

        try {
            const asset = await API.fetch(`/asset/${assetId}`);
            renderAssetDetail(panel, asset);

            // Load contributors
            const contSection = document.createElement('div');
            contSection.innerHTML = '<h3 style="margin:20px 0 12px">Contributors</h3>';
            container.appendChild(contSection);

            const contList = document.createElement('div');
            container.appendChild(contList);
            API.showLoading(contList);

            try {
                const contData = await API.fetch(`/asset/${assetId}/contributor`);
                renderContributors(contList, contData);
            } catch (err) {
                API.showEmpty(contList, 'No contributors found.');
            }
        } catch (err) {
            API.showError(panel, err.message);
        }
    }

    function renderAssetDetail(panel, asset) {
        const cats = (asset.category || []).map(c => c.name).join(', ');
        const attrs = (asset.attribute || []).join(', ');
        const summary = asset.summary || {};

        panel.innerHTML = `
            <h3>${API.escapeHtml(asset.title || 'Untitled')}</h3>
            <div class="detail-row"><div class="detail-label">ID</div><div class="detail-value">${API.escapeHtml(asset.id)}</div></div>
            <div class="detail-row"><div class="detail-label">Type</div><div class="detail-value">${getTypeBadge(asset.type)}</div></div>
            ${asset.productionYear ? `<div class="detail-row"><div class="detail-label">Year</div><div class="detail-value">${asset.productionYear}</div></div>` : ''}
            ${asset.runtime ? `<div class="detail-row"><div class="detail-label">Runtime</div><div class="detail-value">${asset.runtime} min</div></div>` : ''}
            ${cats ? `<div class="detail-row"><div class="detail-label">Categories</div><div class="detail-value">${API.escapeHtml(cats)}</div></div>` : ''}
            ${attrs ? `<div class="detail-row"><div class="detail-label">Attributes</div><div class="detail-value">${API.escapeHtml(attrs)}</div></div>` : ''}
            ${summary.short ? `<div class="detail-row"><div class="detail-label">Summary</div><div class="detail-value">${API.escapeHtml(summary.short)}</div></div>` : ''}
            ${summary.medium ? `<div class="detail-row"><div class="detail-label">Description</div><div class="detail-value">${API.escapeHtml(summary.medium)}</div></div>` : ''}
            ${summary.long ? `<div class="detail-row"><div class="detail-label">Full Description</div><div class="detail-value">${API.escapeHtml(summary.long)}</div></div>` : ''}
        `;

        // Show images
        if (asset.media && asset.media.length > 0) {
            const imgs = API.extractImages(asset.media);
            if (imgs.length > 0) {
                const mediaRow = document.createElement('div');
                mediaRow.className = 'detail-row';
                mediaRow.innerHTML = `<div class="detail-label">Media</div><div class="detail-value">${
                    imgs.slice(0, 4).map(r => `<img src="${API.escapeHtml(r.href)}" style="max-width:200px;height:auto;margin:4px;border-radius:4px;" alt="">`).join('')
                }</div>`;
                panel.appendChild(mediaRow);
            }
        }

        // Show certifications
        if (asset.certification) {
            const certs = Object.entries(asset.certification).map(([k, v]) => `${k}: ${v}`).join(', ');
            const certRow = document.createElement('div');
            certRow.className = 'detail-row';
            certRow.innerHTML = `<div class="detail-label">Certifications</div><div class="detail-value">${API.escapeHtml(certs)}</div>`;
            panel.appendChild(certRow);
        }

        panel.appendChild(API.jsonToggle(asset));
    }

    function renderContributors(container, data) {
        container.innerHTML = '';
        const items = data.item || data || [];
        if (!items || items.length === 0) {
            API.showEmpty(container, 'No contributors found for this asset.');
            return;
        }

        items.forEach(cont => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-title">${API.escapeHtml(cont.name || cont.title || 'Unknown')}</div>
                ${cont.character ? `<div class="card-subtitle">as ${API.escapeHtml(cont.character)}</div>` : ''}
                ${cont.role ? `<div class="card-meta"><span class="badge badge-blue">${API.escapeHtml(cont.role)}</span></div>` : ''}
            `;
            container.appendChild(card);
        });

        container.appendChild(API.jsonToggle(data));
    }

    return { render };
})();
