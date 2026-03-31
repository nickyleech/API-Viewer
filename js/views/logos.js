const LogosView = (() => {
    let allChannels = [];
    let channelDetails = [];

    async function render(container) {
        container.innerHTML = `
            <div class="view-header">
                <h2>Logos</h2>
                <p>Browse channel logos. Click the download button to save an individual logo.</p>
            </div>
            <div class="filter-bar">
                <div class="form-group" style="min-width:300px;max-width:400px">
                    <label>Search</label>
                    <input type="text" id="logo-search-input" class="input" placeholder="Type to filter by channel name..." style="width:100%">
                </div>
            </div>
            <div id="logos-results"></div>
        `;

        document.getElementById('logo-search-input').addEventListener('input', filterChannels);
        await loadAllChannels();
    }

    async function loadAllChannels() {
        const results = document.getElementById('logos-results');
        API.showLoading(results);

        try {
            const data = await API.fetch('/channel');
            allChannels = (data.item || []).sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        } catch (err) {
            API.showError(results, err.message);
            return;
        }

        // Batch-fetch individual channel details to get media/logo data
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

    function filterChannels() {
        const query = (document.getElementById('logo-search-input').value || '').toLowerCase().trim();
        const results = document.getElementById('logos-results');
        if (!channelDetails.length) return;

        const filtered = query
            ? channelDetails.filter(ch => (ch.title || '').toLowerCase().includes(query))
            : channelDetails;

        renderLogos(results, filtered);
    }

    function renderLogos(container, channels) {
        container.innerHTML = '';

        if (channels.length === 0) {
            API.showEmpty(container, 'No channels found matching your search.');
            return;
        }

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `Showing ${channels.length} of ${channelDetails.length} channel(s)`;
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
