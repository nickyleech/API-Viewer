const ContributorsView = (() => {
    let lastResults = [];

    async function render(container) {
        container.innerHTML = `
            <div class="view-header">
                <h2>Contributors</h2>
                <p>Search for actors, directors, and other contributors by name or UUID.</p>
            </div>
            <div class="filter-bar">
                <div class="form-group" style="flex:1;min-width:250px">
                    <label>Search by Name</label>
                    <input type="text" id="cont-name-search" class="input" placeholder="Type a name and press Enter..." style="width:100%">
                </div>
                <div class="form-group">
                    <label>Or Look Up by ID</label>
                    <input type="text" id="cont-id" class="input" placeholder="Enter a contributor UUID" style="min-width:280px">
                </div>
                <div class="form-group">
                    <label>&nbsp;</label>
                    <button id="cont-search-id" class="btn btn-primary">Look Up</button>
                </div>
            </div>
            <div id="contributors-results">
                <div class="empty-state"><p>Enter a name above to search for contributors.</p></div>
            </div>
        `;

        document.getElementById('cont-search-id').addEventListener('click', lookupContributor);
        document.getElementById('cont-id').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') lookupContributor();
        });

        let debounceTimer;
        document.getElementById('cont-name-search').addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(searchByName, 400);
        });
        document.getElementById('cont-name-search').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(debounceTimer);
                searchByName();
            }
        });
    }

    async function searchByName() {
        const query = (document.getElementById('cont-name-search').value || '').trim();
        const results = document.getElementById('contributors-results');

        if (!query) {
            results.innerHTML = '<div class="empty-state"><p>Enter a name above to search for contributors.</p></div>';
            lastResults = [];
            return;
        }

        if (query.length < 2) return;

        API.showLoading(results);
        try {
            const data = await API.fetch('/contributor', { q: query });
            lastResults = data.item || [];
            renderContributorList(results, lastResults, data);
        } catch (err) {
            // Fallback: try without q param and filter client-side
            try {
                const data = await API.fetch('/contributor');
                const all = data.item || [];
                lastResults = all.filter(c => {
                    const name = (c.name || c.title || '').toLowerCase();
                    return name.includes(query.toLowerCase());
                });
                renderContributorList(results, lastResults, data);
            } catch (err2) {
                lastResults = [];
                API.showError(results, err2.message);
            }
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

    function renderContributorList(container, items, rawData) {
        container.innerHTML = '';
        if (items.length === 0) {
            API.showEmpty(container, 'No contributors found matching your search.');
            return;
        }

        const info = document.createElement('div');
        info.className = 'results-info';
        const total = rawData && rawData.total ? rawData.total : items.length;
        const hasMore = rawData && rawData.hasNext;
        info.textContent = `Showing ${items.length} contributor(s)${total > items.length ? ` of ${total}` : ''}${hasMore ? ' (more available)' : ''}`;
        container.appendChild(info);

        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Name</th>
                    <th>API ID</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        container.appendChild(table);

        const tbody = table.querySelector('tbody');
        items.forEach(cont => {
            const tr = document.createElement('tr');
            tr.className = 'clickable';
            tr.innerHTML = `
                <td><strong>${API.escapeHtml(cont.name || cont.title || 'Unknown')}</strong></td>
                <td><code style="font-size:12px;color:var(--color-accent);user-select:all">${API.escapeHtml(cont.id)}</code></td>
            `;
            tr.addEventListener('click', () => showContributorDetail(cont.id));
            tbody.appendChild(tr);
        });

        if (rawData) {
            container.appendChild(API.jsonToggle(rawData));
        }
    }

    async function showContributorDetail(contId) {
        const container = document.getElementById('content');
        container.innerHTML = '';

        const back = document.createElement('a');
        back.className = 'back-link';
        back.innerHTML = '&larr; Back to Contributors';
        back.addEventListener('click', () => render(container));
        container.appendChild(back);

        const panel = document.createElement('div');
        panel.className = 'detail-panel';
        API.showLoading(panel);
        container.appendChild(panel);

        try {
            const cont = await API.fetch(`/contributor/${contId}`);
            renderContributorDetail(panel, cont);
        } catch (err) {
            API.showError(panel, err.message);
        }
    }

    function renderContributorDetail(panel, cont) {
        const name = cont.name || cont.title || 'Unknown';
        panel.innerHTML = `
            <h3>${API.escapeHtml(name)}</h3>
            <div class="detail-row"><div class="detail-label">ID</div><div class="detail-value"><code style="font-size:12px;user-select:all">${API.escapeHtml(cont.id || '')}</code></div></div>
        `;

        // Render any extra fields dynamically
        const skip = new Set(['id', 'name', 'title']);
        Object.entries(cont).forEach(([key, val]) => {
            if (skip.has(key) || val === null || val === undefined) return;
            if (typeof val === 'object') return;
            const row = document.createElement('div');
            row.className = 'detail-row';
            row.innerHTML = `<div class="detail-label">${API.escapeHtml(key)}</div><div class="detail-value">${API.escapeHtml(String(val))}</div>`;
            panel.appendChild(row);
        });

        panel.appendChild(API.jsonToggle(cont));
    }

    return { render };
})();
