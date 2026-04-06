const ProgrammeDetail = (() => {
    /**
     * Render programme detail metadata into a panel element.
     *
     * @param {HTMLElement} panel    - The .detail-panel element to populate
     * @param {Object}      item    - The schedule/programme item
     * @param {Object}      options
     * @param {string}      options.channelName
     * @param {string[]}    [options.copyrights] - Copyright strings to display
     */
    function render(panel, item, options) {
        const channelName = options.channelName || '';
        const copyrights = options.copyrights || [];

        const dt = item.dateTime ? new Date(item.dateTime) : null;
        const timeStr = dt ? dt.toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
        const asset = item.asset || {};
        const summary = item.summary || asset.summary || {};
        const cats = (asset.category || []).map(c => `<span class="badge badge-blue">${API.escapeHtml(c.name)}</span>`).join(' ');
        const attrs = (item.attribute || []).map(a => `<span class="badge badge-gray">${API.escapeHtml(a)}</span>`).join(' ');
        const certification = item.certification || asset.certification || {};
        const certEntries = Object.entries(certification).map(([k, v]) => `${k}: ${v}`).join(', ');

        const assetMeta = asset.meta || {};
        const seasonRelated = (asset.related || []).find(r => r.type === 'season');
        const seasonNum = seasonRelated ? seasonRelated.number : null;
        const episodeNum = assetMeta.episode || asset.number || null;
        const episodeTotal = assetMeta.episodeTotal || asset.total || null;
        const episodeInfo = [
            seasonNum ? `Season ${seasonNum}` : '',
            episodeNum ? `Episode ${episodeNum}${episodeTotal ? ` of ${episodeTotal}` : ''}` : ''
        ].filter(Boolean).join(', ');

        const broadcastStr = [channelName, timeStr].filter(Boolean).join(', ');

        panel.innerHTML = `
            <h3>${API.escapeHtml(item.title || 'Untitled')}</h3>

            <div class="detail-row"><div class="detail-label">Schedule ID</div><div class="detail-value"><code style="font-size:12px;user-select:all">${API.escapeHtml(item.id || '')}</code></div></div>
            <div class="detail-row"><div class="detail-label">Broadcast</div><div class="detail-value">${API.escapeHtml(broadcastStr)}</div></div>
            ${item.duration ? `<div class="detail-row"><div class="detail-label">Duration</div><div class="detail-value">${item.duration} minutes</div></div>` : ''}
            ${asset.title ? `<div class="detail-row"><div class="detail-label">Episode Title</div><div class="detail-value">${API.escapeHtml(asset.title)}</div></div>` : ''}
            ${episodeInfo ? `<div class="detail-row"><div class="detail-label">Episode</div><div class="detail-value">${API.escapeHtml(episodeInfo)}</div></div>` : ''}
            ${asset.type ? `<div class="detail-row"><div class="detail-label">Type</div><div class="detail-value"><span class="badge badge-purple">${API.escapeHtml(asset.type)}</span></div></div>` : ''}
            ${asset.id ? `<div class="detail-row"><div class="detail-label">Asset ID</div><div class="detail-value"><code style="font-size:12px;user-select:all">${API.escapeHtml(asset.id)}</code></div></div>` : ''}
            ${cats ? `<div class="detail-row"><div class="detail-label">Categories</div><div class="detail-value">${cats}</div></div>` : ''}
            ${certEntries ? `<div class="detail-row"><div class="detail-label">Certification</div><div class="detail-value">${API.escapeHtml(certEntries)}</div></div>` : ''}
            ${attrs ? `<div class="detail-row"><div class="detail-label">Attributes</div><div class="detail-value">${attrs}</div></div>` : ''}
            ${copyrights.length > 0 ? `<div class="detail-row"><div class="detail-label">Copyright</div><div class="detail-value">${copyrights.map(c => API.escapeHtml(c)).join(', ')}</div></div>` : ''}
            ${summary.short ? `<div class="detail-row"><div class="detail-label">Summary</div><div class="detail-value">${API.escapeHtml(summary.short)}</div></div>` : ''}
            ${summary.medium ? `<div class="detail-row"><div class="detail-label">Description</div><div class="detail-value">${API.escapeHtml(summary.medium)}</div></div>` : ''}
            ${summary.long ? `<div class="detail-row"><div class="detail-label">Full Description</div><div class="detail-value">${API.escapeHtml(summary.long)}</div></div>` : ''}
        `;

        // Helper to add a detail row (supports empty-field hiding)
        function addRow(label, valueHtml, hasData) {
            const row = document.createElement('div');
            row.className = 'detail-row';
            if (!hasData) row.classList.add('empty-field');
            row.innerHTML = `<div class="detail-label">${API.escapeHtml(label)}</div><div class="detail-value">${hasData ? valueHtml : '<span style="color:var(--color-text-secondary);font-style:italic">\u2014</span>'}</div>`;
            panel.appendChild(row);
        }

        // VOD availability
        const vod = asset.vod || {};
        const vodEntries = Object.entries(vod);
        const vodHtml = vodEntries.map(([platform, info]) => {
            const parts = [`<strong>${API.escapeHtml(platform)}</strong>`];
            if (info.region) parts.push(API.escapeHtml(info.region));
            if (info.start) parts.push('from ' + API.escapeHtml(new Date(info.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })));
            return `<span class="badge badge-green" style="margin:2px;padding:4px 8px">${parts.join(' \u2014 ')}</span>`;
        }).join(' ');
        addRow('VOD', vodHtml, vodEntries.length > 0);

        // Soundtrack
        const soundtrack = asset.soundtrack || [];
        const soundtrackHtml = soundtrack.map(s => `<span class="badge badge-gray">${API.escapeHtml(typeof s === 'string' ? s : (s.name || JSON.stringify(s)))}</span>`).join(' ');
        addRow('Soundtrack', soundtrackHtml, soundtrack.length > 0);

        // Locations
        const locations = asset.locations || [];
        const locationsHtml = locations.map(l => `<span class="badge badge-gray">${API.escapeHtml(typeof l === 'string' ? l : (l.name || JSON.stringify(l)))}</span>`).join(' ');
        addRow('Locations', locationsHtml, locations.length > 0);

        // Keywords
        const keywords = asset.keywords || [];
        const keywordsHtml = keywords.map(k => `<span class="badge badge-gray">${API.escapeHtml(typeof k === 'string' ? k : (k.name || JSON.stringify(k)))}</span>`).join(' ');
        addRow('Keywords', keywordsHtml, keywords.length > 0);

        // Mood
        const mood = asset.mood || [];
        const moodHtml = mood.map(m => `<span class="badge badge-gray">${API.escapeHtml(typeof m === 'string' ? m : (m.name || JSON.stringify(m)))}</span>`).join(' ');
        addRow('Mood', moodHtml, mood.length > 0);

        // Themes
        const themes = asset.themes || [];
        const themesHtml = themes.map(t => `<span class="badge badge-gray">${API.escapeHtml(typeof t === 'string' ? t : (t.name || JSON.stringify(t)))}</span>`).join(' ');
        addRow('Themes', themesHtml, themes.length > 0);

        // Media images from asset
        const imgs = API.extractImages(asset.media);
        if (imgs.length > 0) {
            const mediaRow = document.createElement('div');
            mediaRow.className = 'detail-row';
            mediaRow.innerHTML = `<div class="detail-label">Media</div><div class="detail-value">${
                imgs.slice(0, 4).map(r => `<img src="${API.escapeHtml(r.href)}" style="max-width:240px;height:auto;margin:4px;border-radius:4px;" alt="${API.escapeHtml(item.title || '')} media">`).join('')
            }</div>`;
            panel.appendChild(mediaRow);
        }

        // Related assets
        if (asset.related && asset.related.length > 0) {
            const relatedRow = document.createElement('div');
            relatedRow.className = 'detail-row';
            relatedRow.innerHTML = `<div class="detail-label">Related</div><div class="detail-value">${
                asset.related.map(r => {
                    const label = r.type || 'related';
                    return `<span class="badge badge-orange" style="margin:2px">${API.escapeHtml(label)}: <code style="font-size:11px;user-select:all">${API.escapeHtml(r.id || '')}</code></span>`;
                }).join(' ')
            }</div>`;
            panel.appendChild(relatedRow);
        }

        // Subject codes
        const subjects = [...(item.subject || []), ...(asset.subject || [])];
        if (subjects.length > 0) {
            const codes = [...new Set(subjects.map(s => s.code))];
            const subRow = document.createElement('div');
            subRow.className = 'detail-row';
            subRow.innerHTML = `<div class="detail-label">Subject Codes</div><div class="detail-value">${codes.map(c => `<code style="font-size:12px;margin:2px;padding:2px 6px;background:var(--color-bg);border-radius:3px">${API.escapeHtml(c)}</code>`).join(' ')}</div>`;
            panel.appendChild(subRow);
        }

        // Contributors (hidden by default, toggled by checkbox)
        const contributors = asset.contributor || [];
        if (contributors.length > 0) {
            const cast = contributors.filter(c => (c.role || []).includes('actor'));
            const crew = contributors.filter(c => !(c.role || []).includes('actor'));

            const contSection = document.createElement('div');
            contSection.className = 'detail-row';
            contSection.style.cssText = 'flex-direction:column;gap:8px';

            const contToggle = document.createElement('label');
            contToggle.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:600;color:var(--color-text-secondary)';
            contToggle.setAttribute('role', 'button');
            contToggle.innerHTML = `<input type="checkbox" style="cursor:pointer" aria-label="Toggle contributors"> Show Contributors (${contributors.length})`;
            contSection.appendChild(contToggle);

            const contList = document.createElement('div');
            contList.style.display = 'none';

            function renderPerson(c, showRole) {
                const chars = (c.character || []).map(ch => ch.name).filter(Boolean);
                const roles = (c.role || []).map(r => r.replace(/-/g, ' '));
                let detail = '';
                if (chars.length > 0) {
                    detail = `as <em>${API.escapeHtml(chars.join(', '))}</em>`;
                } else if (showRole) {
                    detail = `<span class="badge badge-purple" style="text-transform:capitalize">${API.escapeHtml(roles.join(', '))}</span>`;
                }
                return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0"><strong style="min-width:180px">${API.escapeHtml(c.name)}</strong>${detail}<code style="font-size:11px;color:var(--color-text-secondary);user-select:all">${API.escapeHtml(c.id || '')}</code></div>`;
            }

            let html = '';
            if (cast.length > 0) {
                html += `<div style="font-size:12px;font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.5px;padding:6px 0 2px">Cast</div>`;
                html += cast.map(c => renderPerson(c, false)).join('');
            }
            if (crew.length > 0) {
                html += `<div style="font-size:12px;font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.5px;padding:${cast.length > 0 ? '12' : '6'}px 0 2px">Crew</div>`;
                html += crew.map(c => renderPerson(c, true)).join('');
            }
            contList.innerHTML = html;
            contSection.appendChild(contList);

            const checkbox = contToggle.querySelector('input');
            checkbox.addEventListener('change', (e) => {
                contList.style.display = e.target.checked ? 'block' : 'none';
                contToggle.setAttribute('aria-expanded', String(e.target.checked));
            });
            contToggle.setAttribute('aria-expanded', 'false');

            panel.appendChild(contSection);
        }

        // Show empty fields toggle
        const emptyFields = panel.querySelectorAll('.empty-field');
        if (emptyFields.length > 0) {
            emptyFields.forEach(el => el.style.display = 'none');

            const toggleRow = document.createElement('div');
            toggleRow.style.cssText = 'margin-top:12px;padding-top:12px;border-top:1px solid var(--color-border)';
            toggleRow.innerHTML = `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:var(--color-text-secondary)"><input type="checkbox" style="cursor:pointer" aria-label="Toggle empty fields"> Show empty fields (${emptyFields.length})</label>`;
            toggleRow.querySelector('input').addEventListener('change', (e) => {
                emptyFields.forEach(el => el.style.display = e.target.checked ? 'flex' : 'none');
            });
            panel.appendChild(toggleRow);
        }
    }

    return { render };
})();
