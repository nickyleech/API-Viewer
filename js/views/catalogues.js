const CataloguesView = (() => {
    let allCatalogues = [];

    async function render(container) {
        container.innerHTML = `
            <div class="view-header">
                <h2>Catalogues</h2>
                <p>Browse streaming platform catalogues and their content. Select a catalogue to search its assets by title or date range.</p>
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
            allCatalogues = data.items || data.item || [];
            renderCatalogueList(list, data);
        } catch (err) {
            API.showError(list, err.message);
        }
    }

    function renderCatalogueList(container, data) {
        container.innerHTML = '';
        if (allCatalogues.length === 0) {
            API.showEmpty(container, 'No catalogues found.');
            return;
        }

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `${allCatalogues.length} catalogue(s)`;
        container.appendChild(info);

        allCatalogues.forEach(cat => {
            const card = document.createElement('div');
            card.className = 'card clickable';
            card.innerHTML = `
                <div class="card-title">${API.escapeHtml(cat.name || cat.title || 'Unnamed')}</div>
                <div class="card-meta">
                    ${cat.namespace ? `<span class="badge badge-purple">${API.escapeHtml(cat.namespace)}</span>` : ''}
                    <code style="font-size:12px;color:var(--color-text-secondary);user-select:all">${API.escapeHtml(cat.id)}</code>
                </div>
            `;
            card.addEventListener('click', () => showCatalogueDetail(cat));
            container.appendChild(card);
        });

        container.firstElementChild.after(API.jsonToggle(data));
    }

    async function showCatalogueDetail(catalogue) {
        const container = document.getElementById('content');
        container.innerHTML = '';

        const back = document.createElement('a');
        back.className = 'back-link';
        back.innerHTML = '&larr; Back to Catalogues';
        back.addEventListener('click', () => render(container));
        container.appendChild(back);

        // Catalogue info panel
        const panel = document.createElement('div');
        panel.className = 'detail-panel';
        panel.innerHTML = `
            <h3>${API.escapeHtml(catalogue.name || catalogue.title || 'Unnamed')}</h3>
            <div class="detail-row"><div class="detail-label">ID</div><div class="detail-value"><code style="font-size:12px;user-select:all">${API.escapeHtml(catalogue.id)}</code></div></div>
            ${catalogue.namespace ? `<div class="detail-row"><div class="detail-label">Namespace</div><div class="detail-value"><span class="badge badge-purple">${API.escapeHtml(catalogue.namespace)}</span></div></div>` : ''}
        `;
        panel.firstElementChild.after(API.jsonToggle(catalogue));
        container.appendChild(panel);

        // Asset search section
        const searchSection = document.createElement('div');
        searchSection.innerHTML = `
            <h3 style="margin:20px 0 12px">Search Catalogue Assets</h3>
            <div class="filter-bar">
                <div class="form-group" style="flex:1;min-width:250px">
                    <label>Title Search</label>
                    <input type="text" id="cat-title-search" class="input" placeholder="Search by programme title..." style="width:100%">
                </div>
                <div class="form-group">
                    <label>Available From</label>
                    <input type="date" id="cat-start-date" class="input" style="min-width:160px">
                </div>
                <div class="form-group">
                    <label>Available To</label>
                    <input type="date" id="cat-end-date" class="input" style="min-width:160px">
                </div>
                <div class="form-group">
                    <label>Limit</label>
                    <select id="cat-limit" class="select" style="min-width:80px">
                        <option value="50">50</option>
                        <option value="100" selected>100</option>
                        <option value="200">200</option>
                        <option value="500">500</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>&nbsp;</label>
                    <button id="cat-search-btn" class="btn btn-primary">Search</button>
                </div>
            </div>
        `;
        container.appendChild(searchSection);

        const assetsList = document.createElement('div');
        assetsList.id = 'cat-assets-list';
        container.appendChild(assetsList);

        document.getElementById('cat-search-btn').addEventListener('click', () => searchCatalogueAssets(catalogue.id));
        document.getElementById('cat-title-search').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') searchCatalogueAssets(catalogue.id);
        });

        // Auto-load assets
        await searchCatalogueAssets(catalogue.id);
    }

    async function searchCatalogueAssets(catalogueId) {
        const container = document.getElementById('cat-assets-list');
        const title = document.getElementById('cat-title-search').value.trim();
        const start = document.getElementById('cat-start-date').value;
        const end = document.getElementById('cat-end-date').value;
        const limit = document.getElementById('cat-limit').value;

        const params = { limit };
        if (title) params.title = title;
        if (start) params.start = start;
        if (end) params.end = end;

        API.showLoading(container);
        try {
            const data = await API.fetch(`/catalogue/${catalogueId}/asset`, params);
            renderCatalogueAssets(container, data, catalogueId);
        } catch (err) {
            API.showError(container, err.message);
        }
    }

    function renderCatalogueAssets(container, data, catalogueId) {
        container.innerHTML = '';
        const items = data.item || [];
        if (items.length === 0) {
            API.showEmpty(container, 'No assets found. Try a different search or date range.');
            return;
        }

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `${items.length} asset(s)${data.hasNext ? ' (more available — increase limit or narrow search)' : ''}`;
        container.appendChild(info);

        items.forEach(item => {
            const asset = item.asset || item;
            const card = document.createElement('div');
            card.className = 'card clickable';

            const assetTitle = asset.title || item.title || 'Untitled';
            const assetType = asset.type || '';
            const typeColors = { movie: 'badge-orange', episode: 'badge-blue', series: 'badge-purple', season: 'badge-green' };
            const typeBadge = assetType ? `<span class="badge ${typeColors[assetType] || 'badge-gray'}">${API.escapeHtml(assetType)}</span>` : '';

            const cats = (asset.category || []).map(c => c.name).join(', ');
            const summary = asset.summary || {};
            const shortDesc = typeof summary === 'string' ? summary : (summary.short || '');

            // Availability dates
            const avail = item.availability || {};
            const availStart = avail.start ? new Date(avail.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
            const availEnd = avail.end ? new Date(avail.end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

            // Images
            const imgs = API.extractImages(asset.media || item.media);

            card.innerHTML = `
                <div style="display:flex;gap:12px;align-items:start">
                    ${imgs.length > 0 ? `<img src="${API.escapeHtml(imgs[0].href)}" alt="" style="width:100px;height:auto;border-radius:4px;flex-shrink:0;">` : ''}
                    <div style="flex:1">
                        <div class="card-title">${API.escapeHtml(assetTitle)}</div>
                        <div class="card-meta">
                            ${typeBadge}
                            ${asset.productionYear ? `<span class="badge badge-gray">${asset.productionYear}</span>` : ''}
                            ${imgs.length > 0 ? `<span class="badge badge-green">${imgs.length} image(s)</span>` : ''}
                        </div>
                        ${cats ? `<div style="margin-top:4px;font-size:12px;color:var(--color-text-secondary)">${API.escapeHtml(cats)}</div>` : ''}
                        ${shortDesc ? `<p style="margin:6px 0 0;font-size:13px;color:var(--color-text-secondary)">${API.escapeHtml(shortDesc)}</p>` : ''}
                        ${availStart ? `<div style="margin-top:4px;font-size:12px;color:var(--color-text-secondary)">Available: ${availStart}${availEnd ? ` \u2014 ${availEnd}` : ''}</div>` : ''}
                    </div>
                </div>
            `;
            card.addEventListener('click', () => showAssetDetail(catalogueId, asset.id || item.id));
            container.appendChild(card);
        });

        container.firstElementChild.after(API.jsonToggle(data));
    }

    async function showAssetDetail(catalogueId, assetId) {
        const contentContainer = document.getElementById('content');

        // Remove existing asset detail panel if any
        const existing = document.getElementById('cat-asset-detail');
        if (existing) existing.remove();

        const panel = document.createElement('div');
        panel.id = 'cat-asset-detail';
        panel.className = 'detail-panel';
        panel.style.marginTop = '16px';
        API.showLoading(panel);

        // Insert after the assets list
        const assetsList = document.getElementById('cat-assets-list');
        if (assetsList && assetsList.nextSibling) {
            assetsList.parentNode.insertBefore(panel, assetsList.nextSibling);
        } else {
            contentContainer.appendChild(panel);
        }

        // Scroll to the detail panel
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

        try {
            const data = await API.fetch(`/catalogue/${catalogueId}/asset/${assetId}`);
            renderAssetDetail(panel, data);
        } catch (err) {
            API.showError(panel, err.message);
        }
    }

    function renderAssetDetail(panel, data) {
        const asset = data.asset || data;
        const title = asset.title || data.title || 'Untitled';
        const summary = asset.summary || {};
        const shortDesc = typeof summary === 'string' ? summary : (summary.short || '');
        const mediumDesc = typeof summary === 'string' ? '' : (summary.medium || '');
        const longDesc = typeof summary === 'string' ? '' : (summary.long || '');
        const cats = (asset.category || []).map(c => c.name).join(', ');
        const typeColors = { movie: 'badge-orange', episode: 'badge-blue', series: 'badge-purple', season: 'badge-green' };

        // Availability
        const avail = data.availability || {};
        const availStart = avail.start ? new Date(avail.start).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
        const availEnd = avail.end ? new Date(avail.end).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';

        // Certification
        const certification = asset.certification || data.certification || {};
        const certEntries = Object.entries(certification).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ');

        // Season / episode number
        const number = data.number || asset.number;
        const season = data.season || asset.season;

        // Meta
        const meta = data.meta || asset.meta || {};
        const metaEntries = Object.entries(meta).filter(([, v]) => v);

        // Deeplink
        const deeplink = data.deeplink || asset.deeplink;

        // Links
        const links = data.link || [];

        panel.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:start;">
                <h3>${API.escapeHtml(title)}</h3>
                <button class="btn btn-sm btn-secondary" id="cat-detail-close">Close</button>
            </div>
            <div class="detail-row"><div class="detail-label">ID</div><div class="detail-value"><code style="font-size:12px;user-select:all">${API.escapeHtml(asset.id || data.id || '')}</code></div></div>
            ${asset.type ? `<div class="detail-row"><div class="detail-label">Type</div><div class="detail-value"><span class="badge ${typeColors[asset.type] || 'badge-gray'}">${API.escapeHtml(asset.type)}</span></div></div>` : ''}
            ${asset.productionYear ? `<div class="detail-row"><div class="detail-label">Year</div><div class="detail-value">${asset.productionYear}</div></div>` : ''}
            ${asset.runtime ? `<div class="detail-row"><div class="detail-label">Runtime</div><div class="detail-value">${asset.runtime} min</div></div>` : ''}
            ${number ? `<div class="detail-row"><div class="detail-label">Number</div><div class="detail-value">${API.escapeHtml(String(number))}</div></div>` : ''}
            ${season ? `<div class="detail-row"><div class="detail-label">Season</div><div class="detail-value">${API.escapeHtml(String(season))}</div></div>` : ''}
            ${cats ? `<div class="detail-row"><div class="detail-label">Categories</div><div class="detail-value">${API.escapeHtml(cats)}</div></div>` : ''}
            ${certEntries ? `<div class="detail-row"><div class="detail-label">Certification</div><div class="detail-value">${API.escapeHtml(certEntries)}</div></div>` : ''}
            ${availStart ? `<div class="detail-row"><div class="detail-label">Available From</div><div class="detail-value">${API.escapeHtml(availStart)}</div></div>` : ''}
            ${availEnd ? `<div class="detail-row"><div class="detail-label">Available Until</div><div class="detail-value">${API.escapeHtml(availEnd)}</div></div>` : ''}
            ${shortDesc ? `<div class="detail-row"><div class="detail-label">Summary</div><div class="detail-value">${API.escapeHtml(shortDesc)}</div></div>` : ''}
            ${mediumDesc ? `<div class="detail-row"><div class="detail-label">Description</div><div class="detail-value">${API.escapeHtml(mediumDesc)}</div></div>` : ''}
            ${longDesc ? `<div class="detail-row"><div class="detail-label">Full Description</div><div class="detail-value" style="white-space:pre-wrap">${API.escapeHtml(longDesc)}</div></div>` : ''}
            ${deeplink ? `<div class="detail-row"><div class="detail-label">Deeplink</div><div class="detail-value"><a href="${API.escapeHtml(deeplink)}" target="_blank" rel="noopener" style="word-break:break-all">${API.escapeHtml(deeplink)}</a></div></div>` : ''}
        `;

        // Close button
        document.getElementById('cat-detail-close').addEventListener('click', () => panel.remove());

        // Links
        if (links.length > 0) {
            const linksRow = document.createElement('div');
            linksRow.className = 'detail-row';
            linksRow.innerHTML = `<div class="detail-label">Links</div><div class="detail-value"></div>`;
            const linksVal = linksRow.querySelector('.detail-value');
            links.forEach(link => {
                const a = document.createElement('a');
                a.href = link.href || '#';
                a.target = '_blank';
                a.rel = 'noopener';
                a.style.cssText = 'display:block;margin-bottom:4px;word-break:break-all;font-size:13px;';
                a.textContent = `${link.rel || 'link'}: ${link.href || ''}`;
                linksVal.appendChild(a);
            });
            panel.appendChild(linksRow);
        }

        // Meta fields
        if (metaEntries.length > 0) {
            const metaHeader = document.createElement('div');
            metaHeader.style.cssText = 'margin-top:12px;font-weight:600;font-size:13px;color:var(--color-text-secondary);';
            metaHeader.textContent = 'Metadata';
            panel.appendChild(metaHeader);
            metaEntries.forEach(([key, val]) => {
                const row = document.createElement('div');
                row.className = 'detail-row';
                row.innerHTML = `<div class="detail-label">${API.escapeHtml(key)}</div><div class="detail-value">${API.escapeHtml(String(val))}</div>`;
                panel.appendChild(row);
            });
        }

        // Related assets
        const related = asset.related || data.related || [];
        if (related.length > 0) {
            const relHeader = document.createElement('div');
            relHeader.style.cssText = 'margin-top:12px;font-weight:600;font-size:13px;color:var(--color-text-secondary);';
            relHeader.textContent = 'Related Assets';
            panel.appendChild(relHeader);
            related.forEach(rel => {
                const relDiv = document.createElement('div');
                relDiv.className = 'detail-row';
                const relType = rel.type || '';
                const relTitle = rel.title || rel.id || '';
                relDiv.innerHTML = `
                    <div class="detail-label">${API.escapeHtml(relType)}</div>
                    <div class="detail-value">
                        ${API.escapeHtml(relTitle)}
                        ${rel.id ? ` <code style="font-size:11px;color:var(--color-text-secondary)">${API.escapeHtml(rel.id)}</code>` : ''}
                    </div>
                `;
                panel.appendChild(relDiv);
            });
        }

        // Images
        const imgs = API.extractImages(asset.media || data.media);
        if (imgs.length > 0) {
            const imgHeader = document.createElement('div');
            imgHeader.style.cssText = 'margin-top:12px;font-weight:600;font-size:13px;color:var(--color-text-secondary);';
            imgHeader.textContent = `Images (${imgs.length})`;
            panel.appendChild(imgHeader);

            const imgRow = document.createElement('div');
            imgRow.style.cssText = 'margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;';
            imgs.forEach(img => {
                const imgEl = document.createElement('img');
                imgEl.src = img.href;
                imgEl.alt = img.label || '';
                imgEl.title = img.label || '';
                imgEl.style.cssText = 'max-width:200px;height:auto;border-radius:4px;border:1px solid var(--color-border);cursor:pointer;';
                imgEl.addEventListener('click', () => openLightbox(img.href));
                imgRow.appendChild(imgEl);
            });
            panel.appendChild(imgRow);
        }

        // Contributors
        const contributors = asset.contributor || data.contributor || [];
        if (contributors.length > 0) {
            const contHeader = document.createElement('div');
            contHeader.style.cssText = 'margin-top:12px;font-weight:600;font-size:13px;color:var(--color-text-secondary);';
            contHeader.textContent = `Contributors (${contributors.length})`;
            panel.appendChild(contHeader);
            contributors.forEach(cont => {
                const contDiv = document.createElement('div');
                contDiv.className = 'detail-row';
                const name = cont.character?.name || cont.name || cont.id || 'Unknown';
                const role = cont.role || '';
                contDiv.innerHTML = `
                    <div class="detail-label">${API.escapeHtml(role)}</div>
                    <div class="detail-value">${API.escapeHtml(name)}</div>
                `;
                panel.appendChild(contDiv);
            });
        }

        panel.firstElementChild.after(API.jsonToggle(data));
    }

    function openLightbox(src) {
        const overlay = document.createElement('div');
        overlay.className = 'lightbox-overlay';
        overlay.innerHTML = `<img src="${API.escapeHtml(src)}" class="lightbox-img" alt="">`;
        overlay.addEventListener('click', () => overlay.remove());
        document.body.appendChild(overlay);
    }

    return { render };
})();
