const FeaturesView = (() => {
    let featureTypes = [];

    async function render(container) {
        const today = new Date().toISOString().slice(0, 10);
        container.innerHTML = `
            <div class="view-header">
                <h2>Features</h2>
                <p>Browse curated feature collections by type and date.</p>
            </div>
            <div class="filter-bar">
                <div class="form-group">
                    <label>Feature Type</label>
                    <select id="feat-type" class="select">
                        <option value="">Loading...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Date</label>
                    <input type="date" id="feat-date" class="input" style="min-width:150px" value="${today}">
                </div>
                <div class="form-group">
                    <label>&nbsp;</label>
                    <button id="feat-search" class="btn btn-primary">Search</button>
                </div>
            </div>
            <div id="features-results"></div>
        `;

        await loadFeatureTypes();
        document.getElementById('feat-search').addEventListener('click', searchFeatures);
    }

    async function loadFeatureTypes() {
        const sel = document.getElementById('feat-type');
        try {
            const data = await API.fetch('/feature-type');
            featureTypes = data.item || [];
            sel.innerHTML = '<option value="">-- All Types --</option>';
            featureTypes.forEach(ft => {
                sel.innerHTML += `<option value="${API.escapeHtml(ft.id)}">${API.escapeHtml(ft.name)}</option>`;
            });
        } catch (err) {
            sel.innerHTML = '<option value="">Error loading types</option>';
        }
    }

    async function searchFeatures() {
        const results = document.getElementById('features-results');
        const typeId = document.getElementById('feat-type').value;
        const date = document.getElementById('feat-date').value;

        const params = {};
        if (typeId) params.featureTypeId = typeId;
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
        const items = data.item || [];
        if (items.length === 0) {
            API.showEmpty(container, 'No features found. Try a different type or date.');
            return;
        }

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `${data.total || items.length} feature(s)`;
        container.appendChild(info);

        items.forEach(feature => {
            const card = document.createElement('div');
            card.className = 'card clickable';

            const title = feature.title || feature.name || 'Untitled';
            const type = feature.featureType ? feature.featureType.name : '';

            card.innerHTML = `
                <div class="card-title">${API.escapeHtml(title)}</div>
                ${type ? `<div class="card-meta"><span class="badge badge-purple">${API.escapeHtml(type)}</span></div>` : ''}
                ${feature.summary ? `<p style="margin-top:6px;font-size:13px;color:var(--color-text-secondary)">${API.escapeHtml(typeof feature.summary === 'string' ? feature.summary : feature.summary.short || '')}</p>` : ''}
            `;
            card.addEventListener('click', () => showFeatureDetail(feature.id));
            container.appendChild(card);
        });

        container.appendChild(API.jsonToggle(data));
    }

    async function showFeatureDetail(featureId) {
        const container = document.getElementById('content');
        container.innerHTML = '';

        const back = document.createElement('a');
        back.className = 'back-link';
        back.innerHTML = '&larr; Back to Features';
        back.addEventListener('click', () => render(container));
        container.appendChild(back);

        const panel = document.createElement('div');
        panel.className = 'detail-panel';
        API.showLoading(panel);
        container.appendChild(panel);

        try {
            const feature = await API.fetch(`/feature/${featureId}`);
            renderFeatureDetail(panel, feature);
        } catch (err) {
            API.showError(panel, err.message);
        }
    }

    function renderFeatureDetail(panel, feature) {
        const title = feature.title || feature.name || 'Untitled';
        const summary = feature.summary || {};

        panel.innerHTML = `
            <h3>${API.escapeHtml(title)}</h3>
            <div class="detail-row"><div class="detail-label">ID</div><div class="detail-value">${API.escapeHtml(feature.id || '')}</div></div>
        `;

        if (feature.featureType) {
            const row = document.createElement('div');
            row.className = 'detail-row';
            row.innerHTML = `<div class="detail-label">Type</div><div class="detail-value">${API.escapeHtml(feature.featureType.name || '')}</div>`;
            panel.appendChild(row);
        }

        const summaryText = typeof summary === 'string' ? summary : (summary.short || summary.medium || summary.long || '');
        if (summaryText) {
            const row = document.createElement('div');
            row.className = 'detail-row';
            row.innerHTML = `<div class="detail-label">Summary</div><div class="detail-value">${API.escapeHtml(summaryText)}</div>`;
            panel.appendChild(row);
        }

        // Show assets in the feature
        if (feature.item && feature.item.length > 0) {
            const assetsHeader = document.createElement('h4');
            assetsHeader.style.cssText = 'margin:16px 0 8px';
            assetsHeader.textContent = `Assets (${feature.item.length})`;
            panel.appendChild(assetsHeader);

            feature.item.forEach(asset => {
                const assetCard = document.createElement('div');
                assetCard.className = 'card';
                assetCard.innerHTML = `
                    <div class="card-title">${API.escapeHtml(asset.title || 'Untitled')}</div>
                    ${asset.type ? `<div class="card-meta"><span class="badge badge-blue">${API.escapeHtml(asset.type)}</span></div>` : ''}
                `;
                panel.appendChild(assetCard);
            });
        }

        panel.appendChild(API.jsonToggle(feature));
    }

    return { render };
})();
