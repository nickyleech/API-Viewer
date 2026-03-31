const FeaturesView = (() => {
    let featureTypes = [];

    async function render(container) {
        const today = new Date().toISOString().slice(0, 10);
        container.innerHTML = `
            <div class="view-header">
                <h2>Features</h2>
                <p>Browse curated feature collections such as monthly streaming highlights. Select a feature type and date to see what's featured.</p>
            </div>
            <div class="filter-bar">
                <div class="form-group">
                    <label>Feature Type</label>
                    <select id="feat-type" class="select" style="min-width:250px">
                        <option value="">Loading...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Date</label>
                    <input type="date" id="feat-date" class="input" style="min-width:160px" value="${today}">
                </div>
                <div class="form-group">
                    <label>&nbsp;</label>
                    <button id="feat-search" class="btn btn-primary">Search</button>
                </div>
            </div>
            <div id="features-results"></div>
        `;

        document.getElementById('feat-search').addEventListener('click', searchFeatures);
        await loadFeatureTypes();
    }

    async function loadFeatureTypes() {
        const sel = document.getElementById('feat-type');
        try {
            const data = await API.fetch('/feature-type');
            featureTypes = data.item || [];
            sel.innerHTML = '<option value="">-- Select a Feature Type --</option>';
            featureTypes.forEach(ft => {
                sel.innerHTML += `<option value="${API.escapeHtml(ft.namespace)}">${API.escapeHtml(ft.name)}</option>`;
            });
        } catch (err) {
            sel.innerHTML = '<option value="">Error loading types</option>';
        }
    }

    async function searchFeatures() {
        const results = document.getElementById('features-results');
        const typeNamespace = document.getElementById('feat-type').value;
        const date = document.getElementById('feat-date').value;

        if (!typeNamespace) {
            API.toast('Please select a feature type.', 'warning');
            return;
        }

        const params = { type: typeNamespace };
        if (date) params.date = date;

        API.showLoading(results);
        try {
            const data = await API.fetch('/feature', params);
            renderFeatures(results, data);
        } catch (err) {
            API.showError(results, err.message);
        }
    }

    function renderFeatures(container, data) {
        container.innerHTML = '';

        // The response may be a single feature or a collection
        const features = data.item || (data.id ? [data] : []);

        if (features.length === 0 && !data.selection) {
            // Check if the response itself IS the feature (not wrapped in item[])
            if (data.id) {
                renderFeatureDetail(container, data);
                return;
            }
            API.showEmpty(container, 'No features found. Try a different type or date.');
            return;
        }

        // If the response is a single feature object with selection
        if (data.selection) {
            renderFeatureDetail(container, data);
            return;
        }

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `${features.length} feature(s)`;
        container.appendChild(info);

        features.forEach(feature => {
            const card = document.createElement('div');
            card.className = 'card clickable';

            const title = feature.title || feature.type || feature.name || 'Untitled';
            const selectionCount = (feature.selection || feature.item || []).length;
            const startDate = feature.start ? new Date(feature.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
            const endDate = feature.end ? new Date(feature.end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

            card.innerHTML = `
                <div class="card-title">${API.escapeHtml(title)}</div>
                <div class="card-meta">
                    ${feature.type ? `<span class="badge badge-purple">${API.escapeHtml(feature.type)}</span>` : ''}
                    ${selectionCount > 0 ? `<span class="badge badge-blue">${selectionCount} item(s)</span>` : ''}
                    ${startDate ? `<span class="card-subtitle">${startDate}${endDate ? ` \u2014 ${endDate}` : ''}</span>` : ''}
                </div>
            `;
            card.addEventListener('click', () => showFeatureDetail(feature));
            container.appendChild(card);
        });

        container.firstElementChild.after(API.jsonToggle(data));
    }

    function showFeatureDetail(feature) {
        const container = document.getElementById('content');
        container.innerHTML = '';

        const back = document.createElement('a');
        back.className = 'back-link';
        back.innerHTML = '&larr; Back to Features';
        back.addEventListener('click', () => render(container));
        container.appendChild(back);

        const panel = document.createElement('div');
        panel.className = 'detail-panel';
        container.appendChild(panel);

        renderFeatureDetailContent(panel, feature);
    }

    function renderFeatureDetailContent(panel, feature) {
        const title = feature.title || feature.type || feature.name || 'Untitled';
        const startDate = feature.start ? new Date(feature.start).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
        const endDate = feature.end ? new Date(feature.end).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';

        panel.innerHTML = `
            <h3>${API.escapeHtml(title)}</h3>
            ${feature.id ? `<div class="detail-row"><div class="detail-label">ID</div><div class="detail-value"><code style="font-size:12px;user-select:all">${API.escapeHtml(feature.id)}</code></div></div>` : ''}
            ${feature.type ? `<div class="detail-row"><div class="detail-label">Type</div><div class="detail-value"><span class="badge badge-purple">${API.escapeHtml(feature.type)}</span></div></div>` : ''}
            ${startDate ? `<div class="detail-row"><div class="detail-label">Start</div><div class="detail-value">${API.escapeHtml(startDate)}</div></div>` : ''}
            ${endDate ? `<div class="detail-row"><div class="detail-label">End</div><div class="detail-value">${API.escapeHtml(endDate)}</div></div>` : ''}
        `;

        // Show selection items (the featured content)
        const selection = feature.selection || feature.item || [];

        if (selection.length > 0) {
            const selHeader = document.createElement('h3');
            selHeader.style.cssText = 'margin:20px 0 12px;';
            selHeader.textContent = `Featured Content (${selection.length})`;
            panel.parentNode.insertBefore(selHeader, panel.nextSibling);

            const selContainer = document.createElement('div');
            panel.parentNode.insertBefore(selContainer, selHeader.nextSibling);

            selection.forEach(item => {
                const asset = item.asset || item;
                const card = document.createElement('div');
                card.className = 'card';

                const assetTitle = asset.title || item.title || 'Untitled';
                const summary = item.summary || asset.summary || {};
                const shortDesc = typeof summary === 'string' ? summary : (summary.short || '');
                const availDate = item.available ? new Date(item.available).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
                const attrs = (item.attribute || asset.attribute || []);
                const cats = (asset.category || []).map(c => c.name).join(', ');
                const imgs = API.extractImages(asset.media || item.media);
                const certification = asset.certification || item.certification || {};
                const certEntries = Object.entries(certification).map(([k, v]) => `${k}: ${v}`).join(', ');

                const typeColors = { movie: 'badge-orange', episode: 'badge-blue', series: 'badge-purple', season: 'badge-green' };
                const typeBadge = asset.type ? `<span class="badge ${typeColors[asset.type] || 'badge-gray'}">${API.escapeHtml(asset.type)}</span>` : '';

                card.innerHTML = `
                    <div style="display:flex;gap:12px;align-items:start">
                        ${imgs.length > 0 ? `<img src="${API.escapeHtml(imgs[0].href)}" class="thumb" alt="" style="width:100px;height:auto;border-radius:4px;">` : ''}
                        <div style="flex:1">
                            <div class="card-title">${API.escapeHtml(assetTitle)}</div>
                            <div class="card-meta">
                                ${typeBadge}
                                ${asset.productionYear ? `<span class="badge badge-gray">${asset.productionYear}</span>` : ''}
                                ${availDate ? `<span class="badge badge-green">Available: ${availDate}</span>` : ''}
                                ${certEntries ? `<span class="badge badge-gray">${API.escapeHtml(certEntries)}</span>` : ''}
                                ${imgs.length > 0 ? `<span class="badge badge-green">${imgs.length} image(s)</span>` : ''}
                            </div>
                            ${cats ? `<div style="margin-top:4px;font-size:12px;color:var(--color-text-secondary)">${API.escapeHtml(cats)}</div>` : ''}
                            ${shortDesc ? `<p style="margin:6px 0 0;font-size:13px;color:var(--color-text-secondary)">${API.escapeHtml(shortDesc)}</p>` : ''}
                            ${attrs.length > 0 ? `<div style="margin-top:6px">${attrs.map(a => `<span class="badge badge-gray" style="margin:2px">${API.escapeHtml(typeof a === 'string' ? a : a.name || '')}</span>`).join('')}</div>` : ''}
                            ${asset.id ? `<div style="margin-top:4px"><code style="font-size:11px;color:var(--color-text-secondary);user-select:all">${API.escapeHtml(asset.id)}</code></div>` : ''}
                        </div>
                    </div>
                `;

                // Show more images if available
                if (imgs.length > 1) {
                    const imgRow = document.createElement('div');
                    imgRow.style.cssText = 'margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;';
                    imgs.slice(1, 5).forEach(img => {
                        const imgEl = document.createElement('img');
                        imgEl.src = img.href;
                        imgEl.alt = '';
                        imgEl.style.cssText = 'max-width:160px;height:auto;border-radius:4px;border:1px solid var(--color-border);';
                        imgRow.appendChild(imgEl);
                    });
                    if (imgs.length > 5) {
                        const more = document.createElement('span');
                        more.style.cssText = 'align-self:center;font-size:12px;color:var(--color-text-secondary)';
                        more.textContent = `+${imgs.length - 5} more`;
                        imgRow.appendChild(more);
                    }
                    card.appendChild(imgRow);
                }

                selContainer.appendChild(card);
            });
        }

        panel.firstElementChild.after(API.jsonToggle(feature));
    }

    return { render };
})();
