const ContributorsView = (() => {
    let allContributors = [];
    let loaded = false;

    async function render(container) {
        container.innerHTML = `
            <div class="view-header">
                <h2>Contributors</h2>
                <p>Search for actors, directors, and other contributors by name or UUID.</p>
            </div>
            <div class="filter-bar">
                <div class="form-group" style="flex:1;min-width:250px">
                    <label>Search by Name</label>
                    <input type="text" id="cont-name-search" class="input" placeholder="Type to filter by name..." style="width:100%">
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
            <div id="contributors-results"></div>
        `;

        document.getElementById('cont-search-id').addEventListener('click', lookupContributor);
        document.getElementById('cont-id').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') lookupContributor();
        });
        document.getElementById('cont-name-search').addEventListener('input', filterByName);

        await loadAllContributors();
    }

    async function loadAllContributors() {
        const results = document.getElementById('contributors-results');

        // If already loaded from a previous visit, just render
        if (loaded && allContributors.length > 0) {
            renderContributorList(results, allContributors);
            return;
        }

        allContributors = [];
        let offset = 0;
        let hasMore = true;

        results.innerHTML = '<div class="spinner">Loading contributors... 0 loaded</div>';

        while (hasMore) {
            try {
                const params = { offset };
                const data = await API.fetch('/contributor', params);
                const items = data.item || [];
                allContributors = allContributors.concat(items);
                hasMore = data.hasNext === true && items.length > 0;
                offset += items.length;

                const spinner = results.querySelector('.spinner');
                if (spinner) {
                    spinner.textContent = `Loading contributors... ${allContributors.length} loaded${hasMore ? '' : ' (complete)'}`;
                }
            } catch (err) {
                // If fetch fails, work with what we have
                hasMore = false;
                if (allContributors.length === 0) {
                    API.showError(results, err.message);
                    return;
                }
            }
        }

        loaded = true;
        allContributors.sort((a, b) => (a.name || a.title || '').localeCompare(b.name || b.title || ''));
        renderContributorList(results, allContributors);
    }

    function filterByName() {
        const query = (document.getElementById('cont-name-search').value || '').toLowerCase().trim();
        const results = document.getElementById('contributors-results');

        if (!allContributors.length) return;

        const filtered = query
            ? allContributors.filter(c => {
                const name = (c.name || c.title || '').toLowerCase();
                return name.includes(query);
            })
            : allContributors;

        renderContributorList(results, filtered);
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

    function renderContributorList(container, items) {
        container.innerHTML = '';
        if (items.length === 0) {
            API.showEmpty(container, 'No contributors found matching your search.');
            return;
        }

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `Showing ${items.length} of ${allContributors.length} contributor(s)`;
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
        // Limit displayed rows for performance, show all when filtering
        const display = items.length > 500 ? items.slice(0, 500) : items;
        display.forEach(cont => {
            const tr = document.createElement('tr');
            tr.className = 'clickable';
            tr.innerHTML = `
                <td><strong>${API.escapeHtml(cont.name || cont.title || 'Unknown')}</strong></td>
                <td><code style="font-size:12px;color:var(--color-accent);user-select:all">${API.escapeHtml(cont.id)}</code></td>
            `;
            tr.addEventListener('click', () => showContributorDetail(cont.id));
            tbody.appendChild(tr);
        });

        if (items.length > 500) {
            const note = document.createElement('div');
            note.className = 'results-info';
            note.style.marginTop = '8px';
            note.textContent = `Showing first 500 of ${items.length} — use the search box to narrow results.`;
            container.appendChild(note);
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
