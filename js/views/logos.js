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
        ChannelDropdown.init({
            inputId: 'logo-channel-search',
            dropdownId: 'logo-channel-dropdown',
            hiddenId: 'logo-channel-id',
            getChannels: () => allChannels,
            onSelect: (ch) => loadSingleChannel(ch.id)
        });
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
        const failed = [];
        const signal = API.cancelable('logos');
        const batchSize = 5;
        try {
            for (let i = 0; i < allChannels.length; i += batchSize) {
                if (signal.aborted) return;
                const batch = allChannels.slice(i, i + batchSize);
                const details = await Promise.all(
                    batch.map(ch => API.fetch(`/channel/${ch.id}`, {}, { signal }).catch(() => {
                        failed.push(ch.title || ch.id);
                        return null;
                    }))
                );
                details.forEach(d => { if (d) channelDetails.push(d); });

                const done = Math.min(i + batchSize, allChannels.length);
                const pText = document.getElementById('logo-progress-text');
                const pBar = document.getElementById('logo-progress-bar');
                if (pText) pText.textContent = `${done} / ${allChannels.length}`;
                if (pBar) pBar.style.width = `${(done / allChannels.length) * 100}%`;
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
            throw err;
        }

        channelDetails.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        renderLogos(results, channelDetails);
        if (failed.length > 0) {
            API.toast(`Failed to load ${failed.length} channel(s): ${failed.slice(0, 5).join(', ')}${failed.length > 5 ? '...' : ''}`, 'warning');
        }
    }

    function renderLogos(container, channels) {
        container.innerHTML = '';

        if (channels.length === 0) {
            API.showEmpty(container, 'No channels found.');
            return;
        }

        const withLogo = [];
        const withoutLogo = [];
        channels.forEach(ch => {
            const imgs = API.extractImages(ch.media);
            (imgs.length > 0 ? withLogo : withoutLogo).push(ch);
        });

        const info = document.createElement('div');
        info.className = 'results-info';
        info.style.cssText = 'display:flex;align-items:center;gap:12px;flex-wrap:wrap';
        info.innerHTML = `<span>Showing ${channels.length} channel(s)</span>`;

        if (withoutLogo.length > 0 && channels.length > 1) {
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'btn btn-sm btn-secondary';
            toggleBtn.textContent = `Show ${withoutLogo.length} missing logo(s)`;
            toggleBtn.style.cssText = 'font-size:11px;padding:3px 10px';
            let showingMissing = false;

            toggleBtn.addEventListener('click', () => {
                showingMissing = !showingMissing;
                if (showingMissing) {
                    toggleBtn.textContent = `Show all ${channels.length} channel(s)`;
                    cards.forEach(({ card, hasLogo }) => {
                        card.style.display = hasLogo ? 'none' : 'flex';
                    });
                } else {
                    toggleBtn.textContent = `Show ${withoutLogo.length} missing logo(s)`;
                    cards.forEach(({ card }) => {
                        card.style.display = 'flex';
                    });
                }
            });
            info.appendChild(toggleBtn);
        }

        container.appendChild(info);

        const grid = document.createElement('div');
        grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:16px;padding:8px 0';
        container.appendChild(grid);

        const cards = [];
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
            cards.push({ card, hasLogo: !!logo });
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
