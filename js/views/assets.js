const AssetsView = (() => {
    let currentLimit = 20;
    let lastParams = {};
    let allItems = [];

    async function render(container) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        container.innerHTML = `
            <div class="view-header">
                <h2>Assets</h2>
                <p>Browse movies, episodes, series, and seasons. Filter by recently updated content or adjust the limit.</p>
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

        container.firstElementChild.after(API.jsonToggle(data));
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
        const certification = asset.certification || {};
        const certEntries = Object.entries(certification).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ');

        panel.innerHTML = `
            <h3>${API.escapeHtml(asset.title || 'Untitled')}</h3>
            <div class="detail-row"><div class="detail-label">ID</div><div class="detail-value"><code style="font-size:12px;user-select:all">${API.escapeHtml(asset.id)}</code></div></div>
            <div class="detail-row"><div class="detail-label">Type</div><div class="detail-value">${getTypeBadge(asset.type)}</div></div>
            ${asset.productionYear ? `<div class="detail-row"><div class="detail-label">Year</div><div class="detail-value">${asset.productionYear}</div></div>` : ''}
            ${asset.runtime ? `<div class="detail-row"><div class="detail-label">Runtime</div><div class="detail-value">${asset.runtime} min</div></div>` : ''}
            ${cats ? `<div class="detail-row"><div class="detail-label">Categories</div><div class="detail-value">${API.escapeHtml(cats)}</div></div>` : ''}
            ${attrs ? `<div class="detail-row"><div class="detail-label">Attributes</div><div class="detail-value">${API.escapeHtml(attrs)}</div></div>` : ''}
            ${certEntries ? `<div class="detail-row"><div class="detail-label">Certification</div><div class="detail-value">${API.escapeHtml(certEntries)}</div></div>` : ''}
            ${summary.short ? `<div class="detail-row"><div class="detail-label">Summary</div><div class="detail-value">${API.escapeHtml(summary.short)}</div></div>` : ''}
            ${summary.medium ? `<div class="detail-row"><div class="detail-label">Description</div><div class="detail-value">${API.escapeHtml(summary.medium)}</div></div>` : ''}
            ${summary.long ? `<div class="detail-row"><div class="detail-label">Full Description</div><div class="detail-value" style="white-space:pre-wrap">${API.escapeHtml(summary.long)}</div></div>` : ''}
        `;

        // Show images
        const imgs = API.extractImages(asset.media);
        if (imgs.length > 0) {
            const mediaRow = document.createElement('div');
            mediaRow.className = 'detail-row';
            mediaRow.innerHTML = `<div class="detail-label">Media (${imgs.length})</div><div class="detail-value" style="display:flex;flex-wrap:wrap;gap:8px;">${
                imgs.map(r => `<img src="${API.escapeHtml(r.href)}" style="max-width:200px;height:auto;border-radius:4px;border:1px solid var(--color-border);cursor:pointer;" alt="${API.escapeHtml(r.label || '')}" title="${API.escapeHtml(r.label || '')}" onclick="(function(s){var o=document.createElement('div');o.className='lightbox-overlay';o.innerHTML='<img src=\\''+s+'\\' class=\\'lightbox-img\\' alt=\\'\\'>';o.onclick=function(){o.remove()};document.body.appendChild(o)})('${API.escapeHtml(r.href)}')">`).join('')
            }</div>`;
            panel.appendChild(mediaRow);
        }

        // Show related assets (series, season links)
        const related = asset.related || [];
        if (related.length > 0) {
            const relHeader = document.createElement('div');
            relHeader.style.cssText = 'margin-top:12px;font-weight:600;font-size:13px;color:var(--color-text-secondary);';
            relHeader.textContent = 'Related Assets';
            panel.appendChild(relHeader);

            related.forEach(rel => {
                const row = document.createElement('div');
                row.className = 'detail-row';
                const relImgs = API.extractImages(rel.media);
                row.innerHTML = `
                    <div class="detail-label">${API.escapeHtml(rel.type || 'related')}</div>
                    <div class="detail-value" style="display:flex;align-items:center;gap:8px;">
                        ${relImgs.length > 0 ? `<img src="${API.escapeHtml(relImgs[0].href)}" style="width:60px;height:auto;border-radius:4px;" alt="">` : ''}
                        <div>
                            <strong>${API.escapeHtml(rel.title || 'Untitled')}</strong>
                            <br><code style="font-size:11px;color:var(--color-text-secondary)">${API.escapeHtml(rel.id || '')}</code>
                        </div>
                    </div>
                `;
                row.style.cursor = 'pointer';
                row.addEventListener('click', () => showAssetDetail(rel.id));
                panel.appendChild(row);
            });
        }

        // Show links
        const links = asset.link || [];
        if (links.length > 0) {
            const linkHeader = document.createElement('div');
            linkHeader.style.cssText = 'margin-top:12px;font-weight:600;font-size:13px;color:var(--color-text-secondary);';
            linkHeader.textContent = 'Links';
            panel.appendChild(linkHeader);

            links.forEach(link => {
                const row = document.createElement('div');
                row.className = 'detail-row';
                row.innerHTML = `
                    <div class="detail-label">${API.escapeHtml(link.rel || 'link')}</div>
                    <div class="detail-value"><a href="${API.escapeHtml(link.href || '#')}" target="_blank" rel="noopener" style="word-break:break-all;font-size:13px">${API.escapeHtml(link.href || '')}</a></div>
                `;
                panel.appendChild(row);
            });
        }

        // Show subject codes
        const subjects = asset.subject || [];
        if (subjects.length > 0) {
            const subRow = document.createElement('div');
            subRow.className = 'detail-row';
            subRow.innerHTML = `<div class="detail-label">Subject Codes</div><div class="detail-value">${subjects.map(s => `<span class="badge badge-gray" style="margin:2px">${API.escapeHtml(s.profile)}: ${API.escapeHtml(s.code)}</span>`).join('')}</div>`;
            panel.appendChild(subRow);
        }

        // Show timestamps
        if (asset.createdAt || asset.updatedAt) {
            const fmt = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            if (asset.createdAt) {
                const row = document.createElement('div');
                row.className = 'detail-row';
                row.innerHTML = `<div class="detail-label">Created</div><div class="detail-value">${API.escapeHtml(fmt(asset.createdAt))}</div>`;
                panel.appendChild(row);
            }
            if (asset.updatedAt) {
                const row = document.createElement('div');
                row.className = 'detail-row';
                row.innerHTML = `<div class="detail-label">Updated</div><div class="detail-value">${API.escapeHtml(fmt(asset.updatedAt))}</div>`;
                panel.appendChild(row);
            }
        }

        panel.firstElementChild.after(API.jsonToggle(asset));
    }

    function renderContributors(container, data) {
        container.innerHTML = '';
        const items = data.item || [];
        if (items.length === 0) {
            API.showEmpty(container, 'No contributors found for this asset.');
            return;
        }

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `${data.total || items.length} contributor(s)`;
        container.appendChild(info);

        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Role(s)</th>
                    <th>Character(s)</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        container.appendChild(table);

        const tbody = table.querySelector('tbody');
        items.forEach(cont => {
            const tr = document.createElement('tr');

            // role is an array of strings
            const roles = Array.isArray(cont.role) ? cont.role : (cont.role ? [cont.role] : []);
            const rolesHtml = roles.map(r => `<span class="badge badge-blue">${API.escapeHtml(r)}</span>`).join(' ');

            // character is an array of objects with {type, name}
            const chars = Array.isArray(cont.character) ? cont.character : (cont.character ? [cont.character] : []);
            const charsHtml = chars.map(c => {
                if (typeof c === 'string') return API.escapeHtml(c);
                return API.escapeHtml(c.name || '');
            }).filter(Boolean).join(', ');

            // Extra details
            const details = [];
            if (cont.dob) details.push(`Born: ${cont.dob}`);
            if (cont.from) details.push(`From: ${cont.from}`);
            if (cont.gender) details.push(`Gender: ${cont.gender}`);

            tr.innerHTML = `
                <td><strong>${API.escapeHtml(cont.name || 'Unknown')}</strong></td>
                <td>${rolesHtml || '-'}</td>
                <td>${charsHtml || '-'}</td>
                <td style="font-size:12px;color:var(--color-text-secondary)">${API.escapeHtml(details.join(' | ')) || '-'}</td>
            `;
            tbody.appendChild(tr);
        });

        container.firstElementChild.after(API.jsonToggle(data));
    }

    return { render };
})();
