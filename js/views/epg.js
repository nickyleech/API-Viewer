const EpgView = (() => {
    let platforms = [];
    let regions = [];
    let epgChannels = [];
    let filteredChannels = [];

    async function render(container) {
        container.innerHTML = `
            <div class="view-header">
                <h2>EPG Numbers</h2>
                <p>View the EPG channel numbers for any platform. Select a platform to see all channels sorted by EPG number, with optional region filtering and CSV download.</p>
            </div>
            <div class="filter-bar">
                <div class="form-group">
                    <label>Platform</label>
                    <select id="epg-platform" class="select" style="min-width:200px">
                        <option value="">Loading...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Region</label>
                    <select id="epg-region" class="select" style="min-width:200px">
                        <option value="">Select a platform first</option>
                    </select>
                </div>
                <div class="form-group" style="flex:1;min-width:200px">
                    <label>Search</label>
                    <input type="text" id="epg-search" class="input" placeholder="Filter by channel name..." style="width:100%">
                </div>
                <div class="form-group">
                    <label>&nbsp;</label>
                    <button id="epg-fetch" class="btn btn-primary">Load EPG</button>
                </div>
            </div>
            <div id="epg-results"></div>
        `;

        document.getElementById('epg-platform').addEventListener('change', onPlatformChange);
        document.getElementById('epg-region').addEventListener('change', fetchEpg);
        document.getElementById('epg-fetch').addEventListener('click', fetchEpg);
        document.getElementById('epg-search').addEventListener('input', filterBySearch);

        await loadPlatforms();
    }

    async function loadPlatforms() {
        const sel = document.getElementById('epg-platform');
        try {
            const data = await API.fetch('/platform');
            platforms = data.item || [];
            sel.innerHTML = '<option value="">-- Select Platform --</option>';
            platforms.forEach(p => {
                sel.innerHTML += `<option value="${API.escapeHtml(p.id)}">${API.escapeHtml(p.title)}</option>`;
            });
        } catch (err) {
            sel.innerHTML = '<option value="">Error loading platforms</option>';
        }
    }

    async function onPlatformChange() {
        const platformId = document.getElementById('epg-platform').value;
        const sel = document.getElementById('epg-region');
        if (!platformId) {
            sel.innerHTML = '<option value="">Select a platform first</option>';
            regions = [];
            return;
        }
        sel.innerHTML = '<option value="">Loading regions...</option>';
        try {
            const data = await API.fetch(`/platform/${platformId}/region`);
            regions = data.item || data || [];
            sel.innerHTML = '<option value="">-- All Regions --</option>';
            regions.forEach(r => {
                const name = r.title || r.name || 'Unnamed';
                sel.innerHTML += `<option value="${API.escapeHtml(r.id)}">${API.escapeHtml(name)}</option>`;
            });
        } catch (err) {
            sel.innerHTML = '<option value="">Error loading regions</option>';
        }

        await fetchEpg();
    }

    async function fetchEpg() {
        const results = document.getElementById('epg-results');
        const platformId = document.getElementById('epg-platform').value;
        const regionId = document.getElementById('epg-region').value;

        if (!platformId) {
            API.toast('Please select a platform.', 'warning');
            return;
        }

        const params = { platformId };
        if (regionId) params.regionId = regionId;

        API.showLoading(results);
        try {
            const data = await API.fetch('/channel', params);
            epgChannels = (data.item || [])
                .filter(ch => ch.epg)
                .sort((a, b) => parseInt(a.epg) - parseInt(b.epg));

            document.getElementById('epg-search').value = '';
            filteredChannels = epgChannels;

            renderEpgTable(results, filteredChannels, data);
        } catch (err) {
            epgChannels = [];
            filteredChannels = [];
            API.showError(results, err.message);
        }
    }

    function filterBySearch() {
        const query = (document.getElementById('epg-search').value || '').toLowerCase().trim();
        const results = document.getElementById('epg-results');

        if (!epgChannels.length) return;

        filteredChannels = query
            ? epgChannels.filter(ch => (ch.title || '').toLowerCase().includes(query))
            : epgChannels;

        renderEpgTable(results, filteredChannels, null);
    }

    function getRegionName() {
        const sel = document.getElementById('epg-region');
        return sel.value ? sel.options[sel.selectedIndex].text : 'All Regions';
    }

    function getPlatformName() {
        const sel = document.getElementById('epg-platform');
        return sel.value ? sel.options[sel.selectedIndex].text : '';
    }

    function renderEpgTable(container, items, rawData) {
        container.innerHTML = '';
        const regionName = getRegionName();

        if (items.length === 0) {
            API.showEmpty(container, 'No channels with EPG numbers found.');
            return;
        }

        // Results info + buttons row
        const infoRow = document.createElement('div');
        infoRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;';

        const info = document.createElement('div');
        info.className = 'results-info';
        info.style.marginBottom = '0';
        info.textContent = `Showing ${items.length} of ${epgChannels.length} channel(s)`;
        infoRow.appendChild(info);

        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn btn-sm btn-secondary';
        downloadBtn.textContent = 'Download CSV';
        downloadBtn.addEventListener('click', () => downloadCsv(items, regionName));
        btnGroup.appendChild(downloadBtn);

        // Only show multi-region buttons if regions are loaded
        if (regions.length > 1) {
            const excelBtn = document.createElement('button');
            excelBtn.className = 'btn btn-sm btn-primary';
            excelBtn.textContent = 'Download All Regions (Excel)';
            excelBtn.addEventListener('click', downloadAllRegionsExcel);
            btnGroup.appendChild(excelBtn);

            const viewBtn = document.createElement('button');
            viewBtn.className = 'btn btn-sm btn-secondary';
            viewBtn.textContent = 'View All Regions';
            viewBtn.addEventListener('click', showAllRegionsView);
            btnGroup.appendChild(viewBtn);
        }

        infoRow.appendChild(btnGroup);
        container.appendChild(infoRow);

        // Table
        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th style="width:80px">EPG #</th>
                    <th>Channel Name</th>
                    <th>Region</th>
                    <th>Category</th>
                    <th>Attributes</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        container.appendChild(table);

        const tbody = table.querySelector('tbody');
        items.forEach(ch => {
            const tr = document.createElement('tr');
            const cats = (ch.category || []).map(c => c.name).join(', ');
            const attrs = (ch.attribute || []).map(a =>
                `<span class="badge ${a === 'hd' ? 'badge-green' : 'badge-gray'}">${API.escapeHtml(a)}</span>`
            ).join(' ');
            tr.innerHTML = `
                <td style="text-align:center"><strong>${API.escapeHtml(ch.epg)}</strong></td>
                <td>${API.escapeHtml(ch.title)}</td>
                <td>${API.escapeHtml(regionName)}</td>
                <td>${API.escapeHtml(cats || '-')}</td>
                <td>${attrs || '-'}</td>
            `;
            tbody.appendChild(tr);
        });

        if (rawData) {
            container.firstElementChild.after(API.jsonToggle(rawData));
        }
    }

    function downloadCsv(items, regionName) {
        const headers = ['EPG Number', 'Channel Name', 'Region', 'Category', 'Attributes'];
        const rows = items.map(ch => {
            const cats = (ch.category || []).map(c => c.name).join('; ');
            const attrs = (ch.attribute || []).join('; ');
            return [ch.epg, ch.title || '', regionName, cats, attrs];
        });

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        const platformName = getPlatformName();
        const safePlatform = platformName.replace(/[^a-zA-Z0-9]/g, '_');
        const safeRegion = regionName.replace(/[^a-zA-Z0-9]/g, '_');
        link.download = `EPG_${safePlatform}_${safeRegion}.csv`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        API.toast('CSV downloaded.', 'success');
    }

    // --- Multi-region logic ---

    async function fetchAllRegionData() {
        const platformId = document.getElementById('epg-platform').value;
        if (!platformId) {
            API.toast('Please select a platform first.', 'warning');
            return null;
        }
        if (regions.length === 0) {
            API.toast('No regions available for this platform.', 'warning');
            return null;
        }

        const results = document.getElementById('epg-results');
        results.innerHTML = '<div class="spinner">Loading all regions... 0 / ' + regions.length + '</div>';

        const regionData = {};
        const batchSize = 5;

        for (let i = 0; i < regions.length; i += batchSize) {
            const batch = regions.slice(i, i + batchSize);
            const promises = batch.map(async (r) => {
                const name = r.title || r.name || 'Unnamed';
                try {
                    const data = await API.fetch('/channel', { platformId, regionId: r.id });
                    const channels = (data.item || [])
                        .filter(ch => ch.epg)
                        .sort((a, b) => parseInt(a.epg) - parseInt(b.epg));
                    regionData[name] = channels;
                } catch (err) {
                    regionData[name] = [];
                }
            });
            await Promise.all(promises);
            const done = Math.min(i + batchSize, regions.length);
            const spinner = results.querySelector('.spinner');
            if (spinner) spinner.textContent = `Loading all regions... ${done} / ${regions.length}`;
        }

        return regionData;
    }

    function classifyRegion(regionName) {
        const lower = regionName.toLowerCase();
        if (lower.includes('scotland')) return 'Scotland';
        if (lower.includes('wales')) return 'Wales';
        if (lower.includes('northern ireland') || lower === 'ulster') return 'Northern Ireland';
        if (lower.includes('republic of ireland') || (lower.includes('ireland') && !lower.includes('northern'))) return 'Republic of Ireland';
        return 'England';
    }

    function groupRegionsByCountry(regionData) {
        const groups = {
            'Scotland': {},
            'Wales': {},
            'Northern Ireland': {},
            'Republic of Ireland': {},
            'England': {}
        };

        Object.entries(regionData).forEach(([regionName, channels]) => {
            const country = classifyRegion(regionName);
            groups[country][regionName] = channels;
        });

        return groups;
    }

    function buildVariations(regionData) {
        // Build a map: channelTitle -> { regionName: epgNumber }
        const channelMap = {};
        const allRegionNames = Object.keys(regionData);

        Object.entries(regionData).forEach(([regionName, channels]) => {
            channels.forEach(ch => {
                const title = ch.title || ch.id;
                if (!channelMap[title]) channelMap[title] = {};
                channelMap[title][regionName] = ch.epg;
            });
        });

        // Find channels where EPG numbers differ or channel is missing from some regions
        const variations = [];
        Object.entries(channelMap).forEach(([title, regionEpgs]) => {
            const presentIn = Object.keys(regionEpgs);
            const epgValues = Object.values(regionEpgs);
            const allSame = epgValues.every(e => e === epgValues[0]);
            const inAllRegions = presentIn.length === allRegionNames.length;

            if (!allSame || !inAllRegions) {
                variations.push({
                    title,
                    regionEpgs,
                    presentCount: presentIn.length,
                    totalRegions: allRegionNames.length
                });
            }
        });

        // Sort by channel title
        variations.sort((a, b) => a.title.localeCompare(b.title));
        return variations;
    }

    // --- Excel download ---

    async function downloadAllRegionsExcel() {
        const regionData = await fetchAllRegionData();
        if (!regionData) return;

        const results = document.getElementById('epg-results');
        results.innerHTML = '<div class="spinner">Generating Excel file...</div>';

        const groups = groupRegionsByCountry(regionData);
        const platformName = getPlatformName();
        const wb = XLSX.utils.book_new();

        // Create a sheet for each country group
        Object.entries(groups).forEach(([country, countryRegions]) => {
            const regionNames = Object.keys(countryRegions);
            if (regionNames.length === 0) return;

            const rows = [];
            // For single-region groups, simple table
            if (regionNames.length === 1) {
                const rName = regionNames[0];
                const channels = countryRegions[rName];
                channels.forEach(ch => {
                    const cats = (ch.category || []).map(c => c.name).join('; ');
                    const attrs = (ch.attribute || []).join('; ');
                    rows.push({
                        'EPG #': parseInt(ch.epg),
                        'Channel Name': ch.title || '',
                        'Region': rName,
                        'Category': cats,
                        'Attributes': attrs
                    });
                });
            } else {
                // Multiple regions in this group — merge all channels, show per region
                const allChannels = new Map();
                regionNames.forEach(rName => {
                    countryRegions[rName].forEach(ch => {
                        const title = ch.title || ch.id;
                        if (!allChannels.has(title)) {
                            allChannels.set(title, {
                                title,
                                category: (ch.category || []).map(c => c.name).join('; '),
                                attributes: (ch.attribute || []).join('; '),
                                regionEpgs: {}
                            });
                        }
                        allChannels.get(title).regionEpgs[rName] = ch.epg;
                    });
                });

                // Sort by lowest EPG number
                const sorted = [...allChannels.values()].sort((a, b) => {
                    const aMin = Math.min(...Object.values(a.regionEpgs).map(Number));
                    const bMin = Math.min(...Object.values(b.regionEpgs).map(Number));
                    return aMin - bMin;
                });

                sorted.forEach(ch => {
                    const row = { 'Channel Name': ch.title };
                    regionNames.forEach(rName => {
                        row[rName] = ch.regionEpgs[rName] ? parseInt(ch.regionEpgs[rName]) : '';
                    });
                    row['Category'] = ch.category;
                    row['Attributes'] = ch.attributes;
                    rows.push(row);
                });
            }

            if (rows.length > 0) {
                const sheetName = country.length > 31 ? country.slice(0, 31) : country;
                const ws = XLSX.utils.json_to_sheet(rows);
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            }
        });

        // Variations sheet
        const variations = buildVariations(regionData);
        if (variations.length > 0) {
            const allRegionNames = Object.keys(regionData);
            const varRows = variations.map(v => {
                const row = {
                    'Channel Name': v.title,
                    'Present In': `${v.presentCount} / ${v.totalRegions} regions`
                };
                allRegionNames.forEach(rName => {
                    row[rName] = v.regionEpgs[rName] || '-';
                });
                return row;
            });
            const ws = XLSX.utils.json_to_sheet(varRows);
            XLSX.utils.book_append_sheet(wb, ws, 'Variations');
        }

        const safePlatform = platformName.replace(/[^a-zA-Z0-9]/g, '_');
        XLSX.writeFile(wb, `EPG_${safePlatform}_All_Regions.xlsx`);

        API.toast('Excel file downloaded.', 'success');

        // Restore the single-region view
        fetchEpg();
    }

    // --- In-page multi-region view ---

    async function showAllRegionsView() {
        const regionData = await fetchAllRegionData();
        if (!regionData) return;

        const results = document.getElementById('epg-results');
        results.innerHTML = '';

        const groups = groupRegionsByCountry(regionData);
        const variations = buildVariations(regionData);
        const platformName = getPlatformName();

        // Header
        const header = document.createElement('div');
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;';
        header.innerHTML = `<h3 style="margin:0">${API.escapeHtml(platformName)} — All Regions</h3>`;

        const backBtn = document.createElement('button');
        backBtn.className = 'btn btn-sm btn-secondary';
        backBtn.textContent = 'Back to Single Region';
        backBtn.addEventListener('click', fetchEpg);
        header.appendChild(backBtn);
        results.appendChild(header);

        // Build tabs
        const tabNames = [];
        Object.entries(groups).forEach(([country, countryRegions]) => {
            if (Object.keys(countryRegions).length > 0) tabNames.push(country);
        });
        if (variations.length > 0) tabNames.push('Variations');

        const tabBar = document.createElement('div');
        tabBar.style.cssText = 'display:flex;gap:4px;margin-bottom:16px;flex-wrap:wrap;border-bottom:2px solid var(--color-border);padding-bottom:0;';
        results.appendChild(tabBar);

        const tabContent = document.createElement('div');
        results.appendChild(tabContent);

        tabNames.forEach((name, idx) => {
            const tab = document.createElement('button');
            tab.className = 'btn btn-sm';
            tab.textContent = name;
            tab.style.cssText = 'border-radius:6px 6px 0 0;border:1px solid var(--color-border);border-bottom:none;margin-bottom:-2px;padding:8px 16px;cursor:pointer;';
            if (idx === 0) {
                tab.style.background = 'var(--color-bg)';
                tab.style.fontWeight = '700';
            } else {
                tab.style.background = 'transparent';
                tab.style.color = 'var(--color-text-secondary)';
            }
            tab.addEventListener('click', () => {
                tabBar.querySelectorAll('button').forEach(b => {
                    b.style.background = 'transparent';
                    b.style.fontWeight = 'normal';
                    b.style.color = 'var(--color-text-secondary)';
                });
                tab.style.background = 'var(--color-bg)';
                tab.style.fontWeight = '700';
                tab.style.color = '';
                renderTabContent(tabContent, name, groups, variations, regionData);
            });
            tabBar.appendChild(tab);
        });

        // Render first tab
        if (tabNames.length > 0) {
            renderTabContent(tabContent, tabNames[0], groups, variations, regionData);
        }
    }

    function renderTabContent(container, tabName, groups, variations, regionData) {
        container.innerHTML = '';

        if (tabName === 'Variations') {
            renderVariationsTable(container, variations, regionData);
            return;
        }

        const countryRegions = groups[tabName];
        if (!countryRegions) return;

        const regionNames = Object.keys(countryRegions);
        if (regionNames.length === 0) {
            API.showEmpty(container, 'No regions in this group.');
            return;
        }

        if (regionNames.length === 1) {
            // Single region — simple table
            const rName = regionNames[0];
            const channels = countryRegions[rName];

            const info = document.createElement('div');
            info.className = 'results-info';
            info.textContent = `${rName} — ${channels.length} channel(s)`;
            container.appendChild(info);

            renderSimpleRegionTable(container, channels, rName);
        } else {
            // Multiple regions — merged table with EPG per region columns
            const allChannels = new Map();
            regionNames.forEach(rName => {
                countryRegions[rName].forEach(ch => {
                    const title = ch.title || ch.id;
                    if (!allChannels.has(title)) {
                        allChannels.set(title, {
                            title,
                            category: (ch.category || []).map(c => c.name).join(', '),
                            attributes: ch.attribute || [],
                            regionEpgs: {}
                        });
                    }
                    allChannels.get(title).regionEpgs[rName] = ch.epg;
                });
            });

            const sorted = [...allChannels.values()].sort((a, b) => {
                const aMin = Math.min(...Object.values(a.regionEpgs).map(Number));
                const bMin = Math.min(...Object.values(b.regionEpgs).map(Number));
                return aMin - bMin;
            });

            const info = document.createElement('div');
            info.className = 'results-info';
            info.textContent = `${regionNames.length} region(s) — ${sorted.length} unique channel(s)`;
            container.appendChild(info);

            const table = document.createElement('table');
            table.className = 'data-table';
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            headerRow.innerHTML = '<th>Channel Name</th>';
            regionNames.forEach(rName => {
                headerRow.innerHTML += `<th style="text-align:center;min-width:60px">${API.escapeHtml(rName)}</th>`;
            });
            headerRow.innerHTML += '<th>Category</th>';
            thead.appendChild(headerRow);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            sorted.forEach(ch => {
                const tr = document.createElement('tr');
                let html = `<td>${API.escapeHtml(ch.title)}</td>`;
                regionNames.forEach(rName => {
                    const epg = ch.regionEpgs[rName];
                    if (epg) {
                        html += `<td style="text-align:center"><strong>${API.escapeHtml(epg)}</strong></td>`;
                    } else {
                        html += `<td style="text-align:center;color:var(--color-text-secondary)">-</td>`;
                    }
                });
                html += `<td>${API.escapeHtml(ch.category || '-')}</td>`;
                tr.innerHTML = html;
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            container.appendChild(table);
        }
    }

    function renderSimpleRegionTable(container, channels, regionName) {
        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th style="width:80px">EPG #</th>
                    <th>Channel Name</th>
                    <th>Category</th>
                    <th>Attributes</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');
        channels.forEach(ch => {
            const tr = document.createElement('tr');
            const cats = (ch.category || []).map(c => c.name).join(', ');
            const attrs = (ch.attribute || []).map(a =>
                `<span class="badge ${a === 'hd' ? 'badge-green' : 'badge-gray'}">${API.escapeHtml(a)}</span>`
            ).join(' ');
            tr.innerHTML = `
                <td style="text-align:center"><strong>${API.escapeHtml(ch.epg)}</strong></td>
                <td>${API.escapeHtml(ch.title)}</td>
                <td>${API.escapeHtml(cats || '-')}</td>
                <td>${attrs || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
        container.appendChild(table);
    }

    function renderVariationsTable(container, variations, regionData) {
        if (variations.length === 0) {
            API.showEmpty(container, 'No variations found — all channels have the same EPG number across all regions.');
            return;
        }

        const allRegionNames = Object.keys(regionData);

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `${variations.length} channel(s) with regional differences`;
        container.appendChild(info);

        const table = document.createElement('table');
        table.className = 'data-table';
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th>Channel Name</th><th style="text-align:center">Coverage</th>';
        allRegionNames.forEach(rName => {
            headerRow.innerHTML += `<th style="text-align:center;min-width:50px;font-size:11px">${API.escapeHtml(rName)}</th>`;
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        variations.forEach(v => {
            const tr = document.createElement('tr');
            let html = `<td>${API.escapeHtml(v.title)}</td>`;
            html += `<td style="text-align:center;font-size:12px">${v.presentCount}/${v.totalRegions}</td>`;
            allRegionNames.forEach(rName => {
                const epg = v.regionEpgs[rName];
                if (epg) {
                    html += `<td style="text-align:center"><strong>${API.escapeHtml(epg)}</strong></td>`;
                } else {
                    html += `<td style="text-align:center;color:#ccc">-</td>`;
                }
            });
            tr.innerHTML = html;
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        container.appendChild(table);
    }

    return { render };
})();
