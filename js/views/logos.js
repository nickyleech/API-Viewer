const LogosView = (() => {
    let allChannels = [];
    let channelDetails = [];

    async function render(container) {
        container.innerHTML = `
            <div class="view-header">
                <h2>Logos</h2>
                <p>Browse channel logos. Search for a single channel or load all logos at once.</p>
            </div>
            <div class="filter-bar">
                <div class="form-group" style="min-width:300px;max-width:400px">
                    <label>Channel</label>
                    <input type="text" id="logo-channel-search" class="input" placeholder="Type to search channels..." style="width:100%" autocomplete="off">
                    <div id="logo-channel-dropdown" class="channel-dropdown"></div>
                    <input type="hidden" id="logo-channel-id">
                </div>
                <div class="form-group">
                    <label>&nbsp;</label>
                    <button id="logo-load-all-btn" class="btn btn-primary">Load All Logos</button>
                </div>
            </div>
            <div id="logos-results"></div>
        `;

        setupChannelSearch();
        document.getElementById('logo-load-all-btn').addEventListener('click', loadAllLogos);
        await loadChannelList();
    }

    async function loadChannelList() {
        const results = document.getElementById('logos-results');
        API.showLoading(results);

        try {
            const data = await API.fetch('/channel');
            const seen = new Set();
            allChannels = (data.item || [])
                .filter(ch => { const t = (ch.title || '').toLowerCase(); if (seen.has(t)) return false; seen.add(t); return true; })
                .sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            channelDetails = [];
            results.innerHTML = `<div class="results-info">${allChannels.length} unique channel(s) available. Search for a channel or click <strong>Load All Logos</strong>.</div>`;
        } catch (err) {
            API.showError(results, err.message);
        }
    }

    function setupChannelSearch() {
        const input = document.getElementById('logo-channel-search');
        const dropdown = document.getElementById('logo-channel-dropdown');
        const hiddenId = document.getElementById('logo-channel-id');

        input.addEventListener('focus', () => input.select());
        input.addEventListener('input', () => showDropdown());

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#logo-channel-search') && !e.target.closest('#logo-channel-dropdown')) {
                dropdown.style.display = 'none';
            }
        });

        function showDropdown() {
            const query = (input.value || '').toLowerCase().trim();

            if (allChannels.length === 0) {
                dropdown.innerHTML = '<div class="dropdown-empty">Loading channels...</div>';
                dropdown.style.display = 'block';
                return;
            }

            if (!query) {
                dropdown.style.display = 'none';
                return;
            }

            const filtered = allChannels.filter(ch => (ch.title || '').toLowerCase().includes(query));

            if (filtered.length === 0) {
                dropdown.innerHTML = '<div class="dropdown-empty">No channels found</div>';
                dropdown.style.display = 'block';
                return;
            }

            dropdown.innerHTML = '';
            filtered.slice(0, 50).forEach(ch => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.innerHTML = `<strong>${API.escapeHtml(ch.title)}</strong><span class="dropdown-id">${API.escapeHtml(ch.id)}</span>`;
                item.addEventListener('click', () => {
                    input.value = ch.title;
                    hiddenId.value = ch.id;
                    dropdown.style.display = 'none';
                    loadSingleChannel(ch.id);
                });
                dropdown.appendChild(item);
            });

            if (filtered.length > 50) {
                const more = document.createElement('div');
                more.className = 'dropdown-empty';
                more.textContent = `${filtered.length - 50} more \u2014 keep typing to narrow results`;
                dropdown.appendChild(more);
            }

            dropdown.style.display = 'block';
        }
    }

    async function loadSingleChannel(channelId) {
        const results = document.getElementById('logos-results');
        API.showLoading(results);

        try {
            const ch = await API.fetch(`/channel/${channelId}`);
            channelDetails = [ch];
            renderLogos(results, [ch]);
        } catch (err) {
            API.showError(results, err.message);
        }
    }

    async function loadAllLogos() {
        const results = document.getElementById('logos-results');
        if (allChannels.length === 0) {
            API.toast('No channels loaded yet.', 'warning');
            return;
        }

        results.innerHTML = '';
        const progressWrap = document.createElement('div');
        progressWrap.style.cssText = 'margin:16px 0';
        progressWrap.innerHTML = `
            <div style="font-size:13px;color:var(--color-text-secondary);margin-bottom:6px">
                Loading channel logos... <span id="logo-progress-text">0 / ${allChannels.length}</span>
            </div>
            <div style="background:var(--color-border);border-radius:4px;height:8px;overflow:hidden">
                <div id="logo-progress-bar" style="height:100%;background:var(--color-accent);width:0%;transition:width 0.2s"></div>
            </div>
        `;
        results.appendChild(progressWrap);

        channelDetails = [];
        const batchSize = 5;
        for (let i = 0; i < allChannels.length; i += batchSize) {
            const batch = allChannels.slice(i, i + batchSize);
            const details = await Promise.all(
                batch.map(ch => API.fetch(`/channel/${ch.id}`).catch(() => null))
            );
            details.forEach(d => { if (d) channelDetails.push(d); });

            const done = Math.min(i + batchSize, allChannels.length);
            const pText = document.getElementById('logo-progress-text');
            const pBar = document.getElementById('logo-progress-bar');
            if (pText) pText.textContent = `${done} / ${allChannels.length}`;
            if (pBar) pBar.style.width = `${(done / allChannels.length) * 100}%`;
        }

        channelDetails.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        renderLogos(results, channelDetails);
    }

    function renderLogos(container, channels) {
        container.innerHTML = '';

        if (channels.length === 0) {
            API.showEmpty(container, 'No channels found.');
            return;
        }

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `Showing ${channels.length} channel(s)`;
        container.appendChild(info);

        const grid = document.createElement('div');
        grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:16px;padding:8px 0';
        container.appendChild(grid);

        channels.forEach(ch => {
            const imgs = API.extractImages(ch.media);
            const logo = imgs.length > 0 ? imgs[0] : null;

            const card = document.createElement('div');
            card.style.cssText = 'background:var(--color-surface);border:1px solid var(--color-border);border-radius:8px;padding:12px;width:180px;display:flex;flex-direction:column;align-items:center;gap:8px';

            if (logo) {
                const img = document.createElement('img');
                img.src = logo.href;
                img.alt = `${ch.title} logo`;
                img.style.cssText = 'width:120px;height:80px;object-fit:contain;border-radius:4px';
                card.appendChild(img);
            } else {
                const placeholder = document.createElement('div');
                placeholder.style.cssText = 'width:120px;height:80px;display:flex;align-items:center;justify-content:center;background:var(--color-bg);border-radius:4px;color:var(--color-text-secondary);font-size:12px';
                placeholder.textContent = 'No logo';
                card.appendChild(placeholder);
            }

            const name = document.createElement('div');
            name.style.cssText = 'font-size:13px;font-weight:600;text-align:center;word-break:break-word';
            name.textContent = ch.title || 'Untitled';
            card.appendChild(name);

            if (logo) {
                const dlBtn = document.createElement('button');
                dlBtn.className = 'btn btn-sm btn-secondary';
                dlBtn.textContent = 'Download';
                dlBtn.style.cssText = 'font-size:11px;padding:2px 10px';
                dlBtn.addEventListener('click', () => downloadLogo(logo.href, ch.title || 'logo'));
                card.appendChild(dlBtn);
            }

            grid.appendChild(card);
        });
    }

    async function downloadLogo(url, channelName) {
        const safeName = channelName.replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '_');
        const ext = (url.split('.').pop() || 'png').split('?')[0];
        const filename = `${safeName}.${ext}`;

        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch {
            window.open(url, '_blank');
        }
    }

    return { render };
})();
