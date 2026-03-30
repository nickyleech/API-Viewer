const CataloguesView = (() => {
    async function render(container) {
        container.innerHTML = `
            <div class="view-header">
                <h2>Catalogues</h2>
                <p>Browse streaming platform catalogues and their content.</p>
            </div>
            <div id="catalogues-list"></div>
        `;
        await loadCatalogues();
    }

    async function loadCatalogues() {
        const list = document.getElementById('catalogues-list');
        API.showLoading(list);
        try {
            const data = await API.fetch('/catalogue');
            renderCatalogueList(list, data);
        } catch (err) {
            API.showError(list, err.message);
        }
    }

    function renderCatalogueList(container, data) {
        container.innerHTML = '';
        const items = data.item || data.items || [];
        if (items.length === 0) {
            API.showEmpty(container, 'No catalogues found.');
            return;
        }

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `${data.total || items.length} catalogue(s)`;
        container.appendChild(info);

        items.forEach(cat => {
            const card = document.createElement('div');
            card.className = 'card clickable';
            card.innerHTML = `
                <div class="card-title">${API.escapeHtml(cat.name || cat.title || 'Unnamed')}</div>
                <div class="card-subtitle">${API.escapeHtml(cat.id)}</div>
                ${cat.namespace ? `<div class="card-meta"><span class="badge badge-purple">${API.escapeHtml(cat.namespace)}</span></div>` : ''}
            `;
            card.addEventListener('click', () => showCatalogueDetail(cat));
            container.appendChild(card);
        });

        container.appendChild(API.jsonToggle(data));
    }

    async function showCatalogueDetail(catalogue) {
        const container = document.getElementById('content');
        container.innerHTML = '';

        const back = document.createElement('a');
        back.className = 'back-link';
        back.innerHTML = '&larr; Back to Catalogues';
        back.addEventListener('click', () => render(container));
        container.appendChild(back);

        const panel = document.createElement('div');
        panel.className = 'detail-panel';
        panel.innerHTML = `
            <h3>${API.escapeHtml(catalogue.name || catalogue.title || 'Unnamed')}</h3>
            <div class="detail-row"><div class="detail-label">ID</div><div class="detail-value">${API.escapeHtml(catalogue.id)}</div></div>
            ${catalogue.namespace ? `<div class="detail-row"><div class="detail-label">Namespace</div><div class="detail-value">${API.escapeHtml(catalogue.namespace)}</div></div>` : ''}
        `;
        panel.appendChild(API.jsonToggle(catalogue));
        container.appendChild(panel);

        // Load catalogue assets
        const assetsSection = document.createElement('div');
        assetsSection.innerHTML = '<h3 style="margin:20px 0 12px">Catalogue Assets</h3>';
        container.appendChild(assetsSection);

        const assetsList = document.createElement('div');
        container.appendChild(assetsList);

        await loadCatalogueAssets(catalogue.id, assetsList);
    }

    async function loadCatalogueAssets(catalogueId, container) {
        API.showLoading(container);
        try {
            const data = await API.fetch(`/catalogue/${catalogueId}/asset`);
            renderCatalogueAssets(container, data, catalogueId);
        } catch (err) {
            API.showError(container, err.message);
        }
    }

    function renderCatalogueAssets(container, data, catalogueId) {
        container.innerHTML = '';
        const items = data.item || [];
        if (items.length === 0) {
            API.showEmpty(container, 'No assets found in this catalogue.');
            return;
        }

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `${items.length} asset(s)${data.hasNext ? ' (more available)' : ''}`;
        container.appendChild(info);

        items.forEach(asset => {
            const card = document.createElement('div');
            card.className = 'card clickable';

            const typeColors = { movie: 'badge-orange', episode: 'badge-blue', series: 'badge-purple', season: 'badge-green' };
            const typeBadge = asset.type ? `<span class="badge ${typeColors[asset.type] || 'badge-gray'}">${API.escapeHtml(asset.type)}</span>` : '';
            const cats = (asset.category || []).map(c => c.name).join(', ');

            card.innerHTML = `
                <div class="card-title">${API.escapeHtml(asset.title || 'Untitled')}</div>
                <div class="card-meta">
                    ${typeBadge}
                    ${asset.productionYear ? `<span class="badge badge-gray">${asset.productionYear}</span>` : ''}
                    ${cats ? `<span class="card-subtitle">${API.escapeHtml(cats)}</span>` : ''}
                </div>
            `;
            card.addEventListener('click', () => showCatalogueAssetDetail(catalogueId, asset.id));
            container.appendChild(card);
        });

        container.appendChild(API.jsonToggle(data));
    }

    async function showCatalogueAssetDetail(catalogueId, assetId) {
        const container = document.getElementById('content');

        // Remove existing detail panel if any
        const existing = document.getElementById('cat-asset-detail');
        if (existing) existing.remove();

        const panel = document.createElement('div');
        panel.id = 'cat-asset-detail';
        panel.className = 'detail-panel';
        panel.style.marginTop = '16px';
        API.showLoading(panel);

        // Insert after first detail panel
        const firstPanel = container.querySelector('.detail-panel');
        if (firstPanel && firstPanel.nextSibling) {
            firstPanel.parentNode.insertBefore(panel, firstPanel.nextSibling);
        } else {
            container.appendChild(panel);
        }

        try {
            const asset = await API.fetch(`/catalogue/${catalogueId}/asset/${assetId}`);
            const summary = asset.summary || {};
            const cats = (asset.category || []).map(c => c.name).join(', ');

            panel.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:start;">
                    <h3>${API.escapeHtml(asset.title || 'Untitled')}</h3>
                    <button class="btn btn-sm btn-secondary" onclick="this.closest('.detail-panel').remove()">Close</button>
                </div>
                <div class="detail-row"><div class="detail-label">ID</div><div class="detail-value">${API.escapeHtml(asset.id)}</div></div>
                ${asset.type ? `<div class="detail-row"><div class="detail-label">Type</div><div class="detail-value">${API.escapeHtml(asset.type)}</div></div>` : ''}
                ${asset.productionYear ? `<div class="detail-row"><div class="detail-label">Year</div><div class="detail-value">${asset.productionYear}</div></div>` : ''}
                ${asset.runtime ? `<div class="detail-row"><div class="detail-label">Runtime</div><div class="detail-value">${asset.runtime} min</div></div>` : ''}
                ${cats ? `<div class="detail-row"><div class="detail-label">Categories</div><div class="detail-value">${API.escapeHtml(cats)}</div></div>` : ''}
                ${summary.short ? `<div class="detail-row"><div class="detail-label">Summary</div><div class="detail-value">${API.escapeHtml(summary.short)}</div></div>` : ''}
                ${summary.medium ? `<div class="detail-row"><div class="detail-label">Description</div><div class="detail-value">${API.escapeHtml(summary.medium)}</div></div>` : ''}
            `;
            panel.appendChild(API.jsonToggle(asset));
        } catch (err) {
            API.showError(panel, err.message);
        }
    }

    return { render };
})();
