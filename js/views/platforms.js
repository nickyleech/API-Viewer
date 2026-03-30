const PlatformsView = (() => {
    let lastData = null;

    async function render(container) {
        container.innerHTML = `
            <div class="view-header">
                <h2>Platforms</h2>
                <p>Browse available TV platforms and their regions.</p>
            </div>
            <div id="platforms-list"></div>
        `;
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
            const code = platform.subject && platform.subject[0] ? platform.subject[0].code : '';
            card.innerHTML = `
                <div class="card-title">${API.escapeHtml(platform.title)}</div>
                <div class="card-subtitle">${API.escapeHtml(platform.id)}</div>
                ${code ? `<div class="card-meta"><span class="badge badge-blue">${API.escapeHtml(code)}</span></div>` : ''}
            `;
            card.addEventListener('click', () => showPlatformDetail(platform));
            container.appendChild(card);
        });

        container.appendChild(API.jsonToggle(data));
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
        panel.innerHTML = `
            <h3>${API.escapeHtml(platform.title)}</h3>
            <div class="detail-row">
                <div class="detail-label">ID</div>
                <div class="detail-value">${API.escapeHtml(platform.id)}</div>
            </div>
            ${platform.subject ? platform.subject.map(s => `
                <div class="detail-row">
                    <div class="detail-label">Code</div>
                    <div class="detail-value">${API.escapeHtml(s.code)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Profile</div>
                    <div class="detail-value">${API.escapeHtml(s.profile || '')}</div>
                </div>
            `).join('') : ''}
        `;
        panel.appendChild(API.jsonToggle(platform));
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
            renderRegions(regionsList, data);
        } catch (err) {
            API.showError(regionsList, err.message);
        }
    }

    function renderRegions(container, data) {
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

        items.forEach(region => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-title">${API.escapeHtml(region.title || region.name || 'Unnamed')}</div>
                <div class="card-subtitle">${API.escapeHtml(region.id)}</div>
            `;
            container.appendChild(card);
        });

        container.appendChild(API.jsonToggle(data));
    }

    return { render };
})();
