const ReviewView = (() => {
    let currentFilter = 'all';

    async function render(container) {
        currentFilter = 'all';

        const header = document.createElement('div');
        header.className = 'view-header';
        header.innerHTML = '<h2>Review List</h2><p>Programmes marked for review across Schedule and Image Viewer.</p>';
        container.appendChild(header);

        const toolbar = document.createElement('div');
        toolbar.className = 'review-toolbar';
        toolbar.innerHTML = `
            <button class="filter-btn active" data-filter="all">All</button>
            <button class="filter-btn" data-filter="checking">Being Checked</button>
            <span style="flex:1"></span>
            <button class="btn btn-sm btn-secondary review-download-btn">Download Excel</button>
            <button class="btn btn-sm btn-secondary btn-delete review-clear-btn">Clear All</button>
        `;
        container.appendChild(toolbar);

        const listContainer = document.createElement('div');
        listContainer.id = 'review-list';
        container.appendChild(listContainer);

        // Filter buttons
        toolbar.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                toolbar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                renderList(listContainer);
            });
        });

        // Download
        toolbar.querySelector('.review-download-btn').addEventListener('click', exportExcel);

        // Clear all
        toolbar.querySelector('.review-clear-btn').addEventListener('click', () => {
            const items = ReviewStore.getAll();
            if (items.length === 0) {
                API.toast('No items to clear.', 'warning');
                return;
            }
            if (!confirm('Remove all ' + items.length + ' review items?')) return;
            items.forEach(item => ReviewStore.remove(item.id));
            renderList(listContainer);
            API.toast('All review items cleared.', 'success');
        });

        // Fetch latest from GitHub before rendering
        API.showLoading(listContainer);
        await ReviewStore.init();
        renderList(listContainer);
    }

    function renderList(container) {
        const allItems = ReviewStore.getAll();
        allItems.sort((a, b) => {
            const da = a.dateTime ? new Date(a.dateTime).getTime() : 0;
            const db = b.dateTime ? new Date(b.dateTime).getTime() : 0;
            return da - db;
        });
        let items = allItems;

        if (currentFilter === 'checking') {
            items = allItems.filter(i => i.checking);
        }

        if (allItems.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No programmes marked for review yet.</p></div>';
            return;
        }

        if (items.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No items match this filter.</p></div>';
            return;
        }

        container.innerHTML = `<div class="results-info">${items.length} item${items.length !== 1 ? 's' : ''}${currentFilter === 'checking' ? ' (being checked)' : ''}</div>`;

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'review-card' + (item.checking ? ' checking' : '');

            const dt = item.dateTime ? new Date(item.dateTime) : null;
            const dateStr = dt ? dt.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
            const metaParts = [item.channel, dateStr].filter(Boolean).join(' \u2014 ');

            const sourceLabel = item.source === 'schedule' ? 'Schedule' : item.source === 'images' ? 'Image Viewer' : item.source || '';
            const sourceBadge = sourceLabel ? `<span class="badge badge-blue">${API.escapeHtml(sourceLabel)}</span>` : '';
            const statusBadge = item.checking
                ? '<span class="badge badge-green">Being Checked</span>'
                : '<span class="badge badge-orange">Pending</span>';

            const addedAt = item.addedAt ? new Date(item.addedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

            card.innerHTML = `
                <div class="review-card-header">
                    <div>
                        <div class="review-card-title">${API.escapeHtml(item.title || 'Untitled')}</div>
                        ${metaParts ? `<div class="review-card-meta">${API.escapeHtml(metaParts)}</div>` : ''}
                    </div>
                    <div style="display:flex;gap:6px;flex-shrink:0">${sourceBadge} ${statusBadge}</div>
                </div>
                ${item.note ? `<div class="review-card-note">${API.escapeHtml(item.note)}</div>` : ''}
                <div class="review-card-actions">
                    <button class="btn btn-sm btn-secondary review-toggle-btn">${item.checking ? 'Mark Pending' : 'Mark Being Checked'}</button>
                    <button class="btn btn-sm btn-secondary btn-delete review-delete-btn">Delete</button>
                    <span class="review-card-timestamp">Added ${API.escapeHtml(addedAt)}</span>
                </div>
            `;

            card.querySelector('.review-toggle-btn').addEventListener('click', () => {
                ReviewStore.toggleChecking(item.id);
                renderList(container);
            });

            card.querySelector('.review-delete-btn').addEventListener('click', () => {
                ReviewStore.remove(item.id);
                renderList(container);
                API.toast('Item removed.', 'success');
            });

            container.appendChild(card);
        });
    }

    function exportExcel() {
        const items = ReviewStore.getAll();
        if (items.length === 0) {
            API.toast('No items to export.', 'warning');
            return;
        }

        const rows = items.map(item => ({
            'Title': item.title || '',
            'Channel': item.channel || '',
            'Date/Time': item.dateTime ? new Date(item.dateTime).toLocaleString('en-GB') : '',
            'Note': item.note || '',
            'Status': item.checking ? 'Being Checked' : 'Pending',
            'Source': item.source || '',
            'Schedule ID': item.id || '',
            'Asset ID': item.assetId || '',
            'Added': item.addedAt ? new Date(item.addedAt).toLocaleString('en-GB') : ''
        }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Review List');
        XLSX.writeFile(wb, 'Review_List_' + new Date().toISOString().slice(0, 10) + '.xlsx');
        API.toast('Review list exported.', 'success');
    }

    return { render };
})();
