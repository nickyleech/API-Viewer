const ContributorsView = (() => {
    async function render(container) {
        container.innerHTML = `
            <div class="view-header">
                <h2>Contributors</h2>
                <p>Search for actors, directors, and other contributors.</p>
            </div>
            <div class="filter-bar">
                <div class="form-group">
                    <label>Contributor ID</label>
                    <input type="text" id="cont-id" class="input" placeholder="Enter a contributor UUID">
                </div>
                <div class="form-group">
                    <label>&nbsp;</label>
                    <button id="cont-search-id" class="btn btn-primary">Look Up</button>
                </div>
                <div class="form-group" style="margin-left:auto">
                    <label>&nbsp;</label>
                    <button id="cont-browse" class="btn btn-secondary">Browse All</button>
                </div>
            </div>
            <div id="contributors-results"></div>
        `;

        document.getElementById('cont-search-id').addEventListener('click', lookupContributor);
        document.getElementById('cont-browse').addEventListener('click', browseContributors);
        document.getElementById('cont-id').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') lookupContributor();
        });
    }

    async function browseContributors() {
        const results = document.getElementById('contributors-results');
        API.showLoading(results);
        try {
            const data = await API.fetch('/contributor');
            renderContributorList(results, data);
        } catch (err) {
            API.showError(results, err.message);
        }
    }

    async function lookupContributor() {
        const id = document.getElementById('cont-id').value.trim();
        if (!id) {
            API.toast('Please enter a contributor ID.', 'warning');
            return;
        }

        const results = document.getElementById('contributors-results');
        API.showLoading(results);
        try {
            const data = await API.fetch(`/contributor/${id}`);
            renderContributorDetail(results, data);
        } catch (err) {
            API.showError(results, err.message);
        }
    }

    function renderContributorList(container, data) {
        container.innerHTML = '';
        const items = data.item || [];
        if (items.length === 0) {
            API.showEmpty(container, 'No contributors found.');
            return;
        }

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `${data.total || items.length} contributor(s)${data.hasNext ? ' (more available)' : ''}`;
        container.appendChild(info);

        items.forEach(cont => {
            const card = document.createElement('div');
            card.className = 'card clickable';
            card.innerHTML = `
                <div class="card-title">${API.escapeHtml(cont.name || cont.title || 'Unknown')}</div>
                <div class="card-subtitle">${API.escapeHtml(cont.id)}</div>
            `;
            card.addEventListener('click', () => {
                document.getElementById('cont-id').value = cont.id;
                lookupContributor();
            });
            container.appendChild(card);
        });

        container.appendChild(API.jsonToggle(data));
    }

    function renderContributorDetail(container, cont) {
        container.innerHTML = '';

        const panel = document.createElement('div');
        panel.className = 'detail-panel';

        const name = cont.name || cont.title || 'Unknown';
        panel.innerHTML = `
            <h3>${API.escapeHtml(name)}</h3>
            <div class="detail-row"><div class="detail-label">ID</div><div class="detail-value">${API.escapeHtml(cont.id || '')}</div></div>
        `;

        // Render any extra fields dynamically
        const skip = new Set(['id', 'name', 'title']);
        Object.entries(cont).forEach(([key, val]) => {
            if (skip.has(key) || val === null || val === undefined) return;
            if (typeof val === 'object') return; // handled by JSON toggle
            const row = document.createElement('div');
            row.className = 'detail-row';
            row.innerHTML = `<div class="detail-label">${API.escapeHtml(key)}</div><div class="detail-value">${API.escapeHtml(String(val))}</div>`;
            panel.appendChild(row);
        });

        panel.appendChild(API.jsonToggle(cont));
        container.appendChild(panel);
    }

    return { render };
})();
