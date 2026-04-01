const EpgView = (() => {
    let platforms = [];
    let regions = [];
    let epgChannels = [];
    let filteredChannels = [];

    // Variations tab state
    let varRegions = [];
    let varRegionData = null;
    let varVariations = [];

    // Channel Lookup tab state
    let lookupAllChannels = [];

    // EPG sort: 1-3 digit numbers first, then 4+ digit numbers, ascending within each group
    function epgSortKey(epgStr) {
        const s = String(epgStr);
        const group = s.length >= 4 ? 1 : 0;
        return group * 1000000 + parseInt(s, 10);
    }

    async function render(container) {
        container.innerHTML = `
            <div class="view-header">
                <h2>EPG Numbers</h2>
                <p>View the EPG channel numbers for any platform. Select a platform to see all channels sorted by EPG number, with optional region filtering and CSV download.</p>
            </div>
            <div class="view-tabs">
                <button class="view-tab active" data-tab="epg-numbers">EPG Numbers</button>
                <button class="view-tab" data-tab="variations">Variations</button>
                <button class="view-tab" data-tab="channel-lookup">Channel Lookup</button>
            </div>

            <div id="tab-epg-numbers" class="tab-panel active">
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
            </div>

            <div id="tab-variations" class="tab-panel">
                <div class="filter-bar">
                    <div class="form-group">
                        <label>Platform</label>
                        <select id="var-platform" class="select" style="min-width:200px">
                            <option value="">Loading...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>&nbsp;</label>
                        <button id="var-load" class="btn btn-primary">Load Variations</button>
                    </div>
                </div>
                <div id="var-results"></div>
            </div>

            <div id="tab-channel-lookup" class="tab-panel">
                <div class="filter-bar">
                    <div class="form-group" style="min-width:250px">
                        <label>Search</label>
                        <input type="text" id="lookup-search" class="input" placeholder="Filter by channel name..." style="width:100%">
                    </div>
                    <div class="form-group" style="flex:1;min-width:300px">
                        <label>Channel</label>
                        <select id="lookup-channel-id" class="select" style="width:100%">
                            <option value="">Loading channels...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>&nbsp;</label>
                        <button id="lookup-btn" class="btn btn-primary">Look Up</button>
                    </div>
                </div>
                <div id="lookup-results"></div>
            </div>
        `;

        // Tab switching
        container.querySelectorAll('.view-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                container.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
                container.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
            });
        });

        // EPG Numbers tab
        document.getElementById('epg-platform').addEventListener('change', onPlatformChange);
        document.getElementById('epg-region').addEventListener('change', fetchEpg);
        document.getElementById('epg-fetch').addEventListener('click', fetchEpg);
        document.getElementById('epg-search').addEventListener('input', filterBySearch);

        // Variations tab
        document.getElementById('var-load').addEventListener('click', loadVariationsForPlatform);

        // Channel Lookup tab
        document.getElementById('lookup-btn').addEventListener('click', lookupChannel);
        document.getElementById('lookup-search').addEventListener('input', filterLookupChannels);

        await loadPlatforms();
        loadLookupChannels();
    }

    async function loadPlatforms() {
        const sel = document.getElementById('epg-platform');
        const varSel = document.getElementById('var-platform');
        try {
            const data = await API.fetch('/platform');
            platforms = data.item || [];
            sel.innerHTML = '<option value="">-- Select Platform --</option>';
            varSel.innerHTML = '<option value="">-- Select Platform --</option>';
            platforms.forEach(p => {
                const opt = `<option value="${API.escapeHtml(p.id)}">${API.escapeHtml(p.title)}</option>`;
                sel.innerHTML += opt;
                varSel.innerHTML += opt;
            });
        } catch (err) {
            sel.innerHTML = '<option value="">Error loading platforms</option>';
            varSel.innerHTML = '<option value="">Error loading platforms</option>';
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
            const allItems = data.item || [];
            const hasRegions = regions.length > 0;
            epgChannels = hasRegions
                ? allItems.filter(ch => ch.epg).sort((a, b) => epgSortKey(a.epg) - epgSortKey(b.epg))
                : allItems.sort((a, b) => {
                    if (a.epg && b.epg) return epgSortKey(a.epg) - epgSortKey(b.epg);
                    if (a.epg) return -1;
                    if (b.epg) return 1;
                    return (a.title || '').localeCompare(b.title || '');
                });

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

        if (regions.length === 0) {
            const notice = document.createElement('div');
            notice.style.cssText = 'padding:8px 12px;margin-bottom:12px;background:var(--color-warning-bg, #fff8e1);border:1px solid var(--color-warning, #e67e00);border-radius:4px;font-size:13px;color:var(--color-text)';
            notice.textContent = 'EPG numbers cannot be displayed for platforms without a region.';
            container.appendChild(notice);
        }

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `Showing ${items.length} of ${epgChannels.length} channel(s)`;
        container.appendChild(info);

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
                <td style="text-align:center"><strong>${ch.epg ? API.escapeHtml(ch.epg) : '-'}</strong></td>
                <td>${API.escapeHtml(ch.title)}</td>
                <td>${API.escapeHtml(regionName)}</td>
                <td>${API.escapeHtml(cats || '-')}</td>
                <td>${attrs || '-'}</td>
            `;
            tbody.appendChild(tr);
        });

        if (rawData) {
            const jsonToggle = API.jsonToggle(rawData);
            const toggleBtns = jsonToggle.querySelector('.json-toggle-buttons');

            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'btn btn-sm btn-secondary';
            downloadBtn.textContent = 'Download CSV';
            downloadBtn.addEventListener('click', () => downloadCsv(items, regionName));
            toggleBtns.appendChild(downloadBtn);

            if (regions.length > 1) {
                const excelBtn = document.createElement('button');
                excelBtn.className = 'btn btn-sm btn-primary';
                excelBtn.textContent = 'Download All Regions (Excel)';
                excelBtn.addEventListener('click', downloadAllRegionsExcel);
                toggleBtns.appendChild(excelBtn);

                const viewBtn = document.createElement('button');
                viewBtn.className = 'btn btn-sm btn-secondary';
                viewBtn.textContent = 'View All Regions';
                viewBtn.addEventListener('click', showAllRegionsView);
                toggleBtns.appendChild(viewBtn);
            }

            container.firstElementChild.after(jsonToggle);
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

    async function fetchAllRegionData(platformId, regionList, progressContainer) {
        if (!platformId || regionList.length === 0) return null;

        progressContainer.innerHTML = '<div class="spinner">Loading all regions... 0 / ' + regionList.length + '</div>';

        const regionData = {};
        const batchSize = 5;

        for (let i = 0; i < regionList.length; i += batchSize) {
            const batch = regionList.slice(i, i + batchSize);
            const promises = batch.map(async (r) => {
                const name = r.title || r.name || 'Unnamed';
                try {
                    const data = await API.fetch('/channel', { platformId, regionId: r.id });
                    const channels = (data.item || [])
                        .filter(ch => ch.epg)
                        .sort((a, b) => epgSortKey(a.epg) - epgSortKey(b.epg));
                    regionData[name] = channels;
                } catch (err) {
                    regionData[name] = [];
                }
            });
            await Promise.all(promises);
            const done = Math.min(i + batchSize, regionList.length);
            const spinner = progressContainer.querySelector('.spinner');
            if (spinner) spinner.textContent = `Loading all regions... ${done} / ${regionList.length}`;
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
        const channelMap = {};
        const allRegionNames = Object.keys(regionData);

        Object.entries(regionData).forEach(([regionName, channels]) => {
            channels.forEach(ch => {
                const title = ch.title || ch.id;
                if (!channelMap[title]) channelMap[title] = {};
                channelMap[title][regionName] = ch.epg;
            });
        });

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

        // Sort by ascending EPG number (lowest EPG across regions), 4+ digits after 1-3 digits
        variations.sort((a, b) => {
            const aMin = Math.min(...Object.values(a.regionEpgs).map(e => epgSortKey(e)));
            const bMin = Math.min(...Object.values(b.regionEpgs).map(e => epgSortKey(e)));
            return aMin - bMin;
        });
        return variations;
    }

    function getMode(regionEpgs) {
        const counts = {};
        Object.values(regionEpgs).forEach(epg => {
            counts[epg] = (counts[epg] || 0) + 1;
        });
        let mode = null;
        let maxCount = 0;
        Object.entries(counts).forEach(([epg, count]) => {
            if (count > maxCount) {
                maxCount = count;
                mode = epg;
            }
        });
        return mode;
    }

    // --- Excel download (EPG Numbers tab) ---

    async function downloadAllRegionsExcel() {
        const platformId = document.getElementById('epg-platform').value;
        if (!platformId) {
            API.toast('Please select a platform first.', 'warning');
            return;
        }
        if (regions.length === 0) {
            API.toast('No regions available for this platform.', 'warning');
            return;
        }

        const results = document.getElementById('epg-results');
        const regionData = await fetchAllRegionData(platformId, regions, results);
        if (!regionData) return;

        results.innerHTML = '<div class="spinner">Generating Excel file...</div>';

        const groups = groupRegionsByCountry(regionData);
        const platformName = getPlatformName();
        const wb = XLSX.utils.book_new();

        Object.entries(groups).forEach(([country, countryRegions]) => {
            const regionNames = Object.keys(countryRegions);
            if (regionNames.length === 0) return;

            const rows = [];
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

                const sorted = [...allChannels.values()].sort((a, b) => {
                    const aMin = Math.min(...Object.values(a.regionEpgs).map(e => epgSortKey(e)));
                    const bMin = Math.min(...Object.values(b.regionEpgs).map(e => epgSortKey(e)));
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
        fetchEpg();
    }

    // --- In-page multi-region view ---

    async function showAllRegionsView() {
        const platformId = document.getElementById('epg-platform').value;
        if (!platformId) {
            API.toast('Please select a platform first.', 'warning');
            return;
        }
        if (regions.length === 0) {
            API.toast('No regions available for this platform.', 'warning');
            return;
        }

        const results = document.getElementById('epg-results');
        const regionData = await fetchAllRegionData(platformId, regions, results);
        if (!regionData) return;

        results.innerHTML = '';

        const groups = groupRegionsByCountry(regionData);
        const variations = buildVariations(regionData);
        const platformName = getPlatformName();

        const header = document.createElement('div');
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;';
        header.innerHTML = `<h3 style="margin:0">${API.escapeHtml(platformName)} — All Regions</h3>`;

        const backBtn = document.createElement('button');
        backBtn.className = 'btn btn-sm btn-secondary';
        backBtn.textContent = 'Back to Single Region';
        backBtn.addEventListener('click', fetchEpg);
        header.appendChild(backBtn);
        results.appendChild(header);

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
            const rName = regionNames[0];
            const channels = countryRegions[rName];

            const info = document.createElement('div');
            info.className = 'results-info';
            info.textContent = `${rName} — ${channels.length} channel(s)`;
            container.appendChild(info);

            renderSimpleRegionTable(container, channels);
        } else {
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

    function renderSimpleRegionTable(container, channels) {
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
            API.showEmpty(container, 'No variations found \u2014 all channels have the same EPG number across all regions.');
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

    // --- Variations tab ---

    async function loadVariationsForPlatform() {
        const platformId = document.getElementById('var-platform').value;
        const results = document.getElementById('var-results');

        if (!platformId) {
            API.toast('Please select a platform.', 'warning');
            return;
        }

        const platformName = document.getElementById('var-platform').options[document.getElementById('var-platform').selectedIndex].text;

        // Fetch regions for this platform
        API.showLoading(results);
        try {
            const data = await API.fetch(`/platform/${platformId}/region`);
            varRegions = data.item || data || [];
        } catch (err) {
            API.showError(results, err.message);
            return;
        }

        if (varRegions.length < 2) {
            results.innerHTML = '';
            const notice = document.createElement('div');
            notice.style.cssText = 'padding:12px 16px;background:var(--color-warning-bg, #fff8e1);border:1px solid var(--color-warning, #e67e00);border-radius:4px;font-size:13px;color:var(--color-text)';
            notice.textContent = varRegions.length === 0
                ? 'This platform has no regions. Variations require at least 2 regions to compare.'
                : 'This platform has only 1 region. Variations require at least 2 regions to compare.';
            results.appendChild(notice);
            return;
        }

        // Fetch all region data
        varRegionData = await fetchAllRegionData(platformId, varRegions, results);
        if (!varRegionData) return;

        varVariations = buildVariations(varRegionData);
        renderVariationsWithFormatting(results, varVariations, varRegionData, platformName);
    }

    function renderVariationsWithFormatting(container, variations, regionData, platformName) {
        container.innerHTML = '';
        const allRegionNames = Object.keys(regionData);

        if (variations.length === 0) {
            API.showEmpty(container, 'No variations found \u2014 all channels have the same EPG number across all regions.');
            return;
        }

        // Info bar
        const info = document.createElement('div');
        info.className = 'results-info';
        info.style.cssText = 'display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px';
        info.innerHTML = `<span>${variations.length} channel(s) with regional differences across ${allRegionNames.length} regions</span>`;

        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display:flex;gap:6px';

        const dlPlatformBtn = document.createElement('button');
        dlPlatformBtn.className = 'btn btn-sm btn-primary';
        dlPlatformBtn.textContent = 'Download Platform Variations';
        dlPlatformBtn.addEventListener('click', () => downloadPlatformVariationsExcel(variations, regionData, platformName));
        btnGroup.appendChild(dlPlatformBtn);

        const dlAllBtn = document.createElement('button');
        dlAllBtn.className = 'btn btn-sm btn-secondary';
        dlAllBtn.textContent = 'Download All Platforms Variations';
        dlAllBtn.addEventListener('click', downloadAllPlatformsVariationsExcel);
        btnGroup.appendChild(dlAllBtn);

        info.appendChild(btnGroup);
        container.appendChild(info);

        // Legend
        const legend = document.createElement('div');
        legend.style.cssText = 'display:flex;gap:16px;margin-bottom:12px;font-size:12px;flex-wrap:wrap';
        legend.innerHTML = `
            <span><span style="display:inline-block;width:14px;height:14px;background:#4caf50;border-radius:2px;vertical-align:middle;margin-right:4px"></span> Matches mode</span>
            <span><span style="display:inline-block;width:14px;height:14px;background:#ff9800;border-radius:2px;vertical-align:middle;margin-right:4px"></span> Differs from mode</span>
            <span><span style="display:inline-block;width:14px;height:14px;background:#eeeeee;border:1px solid #ccc;border-radius:2px;vertical-align:middle;margin-right:4px"></span> Not present</span>
        `;
        container.appendChild(legend);

        // Sticky column styles
        const stickyName = 'position:sticky;left:0;z-index:2;min-width:180px;max-width:180px;background:var(--color-surface)';
        const stickyCov  = 'position:sticky;left:180px;z-index:2;min-width:70px;max-width:70px;background:var(--color-surface)';
        const stickyMode = 'position:sticky;left:250px;z-index:2;min-width:60px;max-width:60px;background:var(--color-surface);border-right:2px solid var(--color-border)';
        const stickyNameH = stickyName.replace('var(--color-surface)', 'var(--color-bg)') + ';top:0;z-index:4';
        const stickyCovH  = stickyCov.replace('var(--color-surface)', 'var(--color-bg)') + ';top:0;z-index:4';
        const stickyModeH = stickyMode.replace('var(--color-surface)', 'var(--color-bg)') + ';top:0;z-index:4';
        const stickyHeaderBase = 'position:sticky;top:0;z-index:3;background:var(--color-bg)';

        // Scroll arrows
        const scrollNav = document.createElement('div');
        scrollNav.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-bottom:6px';
        ['&uarr;', '&darr;', '&larr;', '&rarr;'].forEach((arrow, i) => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-sm btn-secondary';
            btn.innerHTML = arrow;
            btn.style.cssText = 'min-width:36px;padding:4px 8px;font-size:16px';
            btn.dataset.dir = i;
            scrollNav.appendChild(btn);
        });
        container.appendChild(scrollNav);

        const scrollWrap = document.createElement('div');
        scrollWrap.style.cssText = 'overflow:auto;max-width:100%;max-height:70vh';

        const scrollAmount = 300;
        const navBtns = scrollNav.querySelectorAll('button');
        navBtns[0].addEventListener('click', () => scrollWrap.scrollBy({ top: -scrollAmount, behavior: 'smooth' }));
        navBtns[1].addEventListener('click', () => scrollWrap.scrollBy({ top: scrollAmount, behavior: 'smooth' }));
        navBtns[2].addEventListener('click', () => scrollWrap.scrollBy({ left: -scrollAmount, behavior: 'smooth' }));
        navBtns[3].addEventListener('click', () => scrollWrap.scrollBy({ left: scrollAmount, behavior: 'smooth' }));
        const table = document.createElement('table');
        table.className = 'data-table';
        table.style.cssText = 'min-width:max-content;overflow:visible;border-collapse:separate;border-spacing:0';
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `<th style="${stickyNameH}">Channel Name</th><th style="text-align:center;${stickyCovH}">Coverage</th><th style="text-align:center;${stickyModeH}">Mode</th>`;
        allRegionNames.forEach(rName => {
            headerRow.innerHTML += `<th style="text-align:center;min-width:50px;font-size:11px;${stickyHeaderBase}">${API.escapeHtml(rName)}</th>`;
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        variations.forEach(v => {
            const tr = document.createElement('tr');
            const mode = getMode(v.regionEpgs);
            let html = `<td style="${stickyName}">${API.escapeHtml(v.title)}</td>`;
            html += `<td style="text-align:center;font-size:12px;${stickyCov}">${v.presentCount}/${v.totalRegions}</td>`;
            html += `<td style="text-align:center;font-weight:600;${stickyMode}">${API.escapeHtml(mode || '-')}</td>`;
            allRegionNames.forEach(rName => {
                const epg = v.regionEpgs[rName];
                if (!epg) {
                    html += `<td style="text-align:center;background-color:#eeeeee !important;color:#999">-</td>`;
                } else if (String(epg) === String(mode)) {
                    html += `<td style="text-align:center;background-color:#4caf50 !important"><strong style="color:#fff">${API.escapeHtml(epg)}</strong></td>`;
                } else {
                    html += `<td style="text-align:center;background-color:#ff9800 !important"><strong style="color:#fff">${API.escapeHtml(epg)}</strong></td>`;
                }
            });
            tr.innerHTML = html;
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        scrollWrap.appendChild(table);
        container.appendChild(scrollWrap);
    }

    function downloadPlatformVariationsExcel(variations, regionData, platformName) {
        if (variations.length === 0) {
            API.toast('No variations to download.', 'warning');
            return;
        }

        const allRegionNames = Object.keys(regionData);
        const wb = XLSX.utils.book_new();

        const rows = variations.map(v => {
            const mode = getMode(v.regionEpgs);
            const row = {
                'Channel Name': v.title,
                'Coverage': `${v.presentCount}/${v.totalRegions}`,
                'Mode EPG': mode || '-'
            };
            allRegionNames.forEach(rName => {
                row[rName] = v.regionEpgs[rName] ? parseInt(v.regionEpgs[rName]) : '';
            });
            return row;
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Variations');

        const safePlatform = platformName.replace(/[^a-zA-Z0-9]/g, '_');
        XLSX.writeFile(wb, `EPG_Variations_${safePlatform}.xlsx`);
        API.toast('Excel file downloaded.', 'success');
    }

    async function downloadAllPlatformsVariationsExcel() {
        if (!confirm('This will fetch EPG data for all regions across every platform. This may take a while. Continue?')) return;

        const results = document.getElementById('var-results');
        const wb = XLSX.utils.book_new();
        let sheetsAdded = 0;

        // Progress bar
        const progress = document.createElement('div');
        progress.style.cssText = 'margin:16px 0';
        progress.innerHTML = `
            <div style="font-size:13px;margin-bottom:6px;color:var(--color-text-secondary)">Processing platforms... 0 / ${platforms.length}</div>
            <div style="width:100%;height:8px;background:var(--color-border);border-radius:4px;overflow:hidden">
                <div style="width:0%;height:100%;background:var(--color-accent);transition:width 0.3s"></div>
            </div>
        `;
        results.insertBefore(progress, results.firstChild);

        const progressText = progress.querySelector('div');
        const progressBar = progress.querySelector('div > div > div');

        for (let i = 0; i < platforms.length; i++) {
            const platform = platforms[i];
            const pName = platform.title || platform.id;
            progressText.textContent = `Processing ${pName}... ${i + 1} / ${platforms.length}`;
            progressBar.style.width = `${((i + 1) / platforms.length) * 100}%`;

            // Fetch regions for this platform
            let pRegions = [];
            try {
                const data = await API.fetch(`/platform/${platform.id}/region`);
                pRegions = data.item || data || [];
            } catch (err) {
                continue;
            }

            if (pRegions.length < 2) continue;

            // Create a temporary container for progress (hidden)
            const tempProgress = document.createElement('div');
            tempProgress.style.display = 'none';
            document.body.appendChild(tempProgress);

            const regionData = await fetchAllRegionData(platform.id, pRegions, tempProgress);
            document.body.removeChild(tempProgress);

            if (!regionData) continue;

            const variations = buildVariations(regionData);
            if (variations.length === 0) continue;

            const allRegionNames = Object.keys(regionData);
            const rows = variations.map(v => {
                const mode = getMode(v.regionEpgs);
                const row = {
                    'Channel Name': v.title,
                    'Coverage': `${v.presentCount}/${v.totalRegions}`,
                    'Mode EPG': mode || '-'
                };
                allRegionNames.forEach(rName => {
                    row[rName] = v.regionEpgs[rName] ? parseInt(v.regionEpgs[rName]) : '';
                });
                return row;
            });

            // Sheet name max 31 chars
            let sheetName = pName.length > 31 ? pName.slice(0, 31) : pName;
            // Ensure unique sheet name
            const existingNames = wb.SheetNames || [];
            if (existingNames.includes(sheetName)) {
                sheetName = sheetName.slice(0, 28) + `(${sheetsAdded})`;
            }

            const ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
            sheetsAdded++;
        }

        progress.remove();

        if (sheetsAdded === 0) {
            API.toast('No platforms had variations to export.', 'warning');
            return;
        }

        XLSX.writeFile(wb, 'EPG_Variations_All_Platforms.xlsx');
        API.toast(`Excel file downloaded with ${sheetsAdded} platform sheet(s).`, 'success');
    }

    // --- Channel Lookup tab ---

    async function loadLookupChannels() {
        const sel = document.getElementById('lookup-channel-id');
        try {
            const data = await API.fetch('/channel');
            lookupAllChannels = (data.item || []).sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            populateLookupSelect(lookupAllChannels);
        } catch (err) {
            sel.innerHTML = '<option value="">Error loading channels</option>';
        }
    }

    function populateLookupSelect(channels) {
        const sel = document.getElementById('lookup-channel-id');
        sel.innerHTML = '<option value="">-- Select a Channel --</option>';
        channels.forEach(ch => {
            sel.innerHTML += `<option value="${API.escapeHtml(ch.id)}">${API.escapeHtml(ch.title)}</option>`;
        });
    }

    function filterLookupChannels() {
        const query = (document.getElementById('lookup-search').value || '').toLowerCase().trim();
        const filtered = query
            ? lookupAllChannels.filter(ch => (ch.title || '').toLowerCase().includes(query))
            : lookupAllChannels;
        populateLookupSelect(filtered);
    }

    async function lookupChannel() {
        const channelId = document.getElementById('lookup-channel-id').value;
        const results = document.getElementById('lookup-results');

        if (!channelId) {
            API.toast('Please select a channel.', 'warning');
            return;
        }

        API.showLoading(results);

        // Step 1: Fetch full channel details
        let channelInfo;
        try {
            channelInfo = await API.fetch(`/channel/${channelId}`);
        } catch (err) {
            API.showError(results, `Failed to load channel details.`);
            return;
        }

        // Step 2: Ensure platforms are loaded
        if (platforms.length === 0) {
            try {
                const data = await API.fetch('/platform');
                platforms = data.item || [];
            } catch (err) {
                API.showError(results, 'Failed to load platforms.');
                return;
            }
        }

        // Step 3: Scan all platforms for this channel
        const platformResults = [];
        const batchSize = 5;

        results.innerHTML = `
            <div class="spinner">Scanning platforms... 0 / ${platforms.length}</div>
        `;

        for (let i = 0; i < platforms.length; i += batchSize) {
            const batch = platforms.slice(i, i + batchSize);
            const promises = batch.map(async (p) => {
                try {
                    const data = await API.fetch('/channel', { platformId: p.id });
                    const channels = data.item || [];
                    const match = channels.find(ch => ch.id === channelId);
                    if (match) {
                        return { platform: p, found: true };
                    }
                } catch (err) {
                    // Skip platform on error
                }
                return { platform: p, found: false };
            });
            const batchResults = await Promise.all(promises);
            batchResults.filter(r => r.found).forEach(r => platformResults.push(r.platform));

            const done = Math.min(i + batchSize, platforms.length);
            const spinner = results.querySelector('.spinner');
            if (spinner) spinner.textContent = `Scanning platforms... ${done} / ${platforms.length}`;
        }

        if (platformResults.length === 0) {
            results.innerHTML = '';
            renderLookupChannelHeader(results, channelInfo);
            API.showEmpty(results, 'This channel was not found on any platform.');
            return;
        }

        // Step 4: For each matching platform, fetch regions and per-region EPG
        results.innerHTML = `
            <div class="spinner">Loading EPG data... 0 / ${platformResults.length} platform(s)</div>
        `;

        const platformEpgData = [];

        for (let i = 0; i < platformResults.length; i++) {
            const p = platformResults[i];
            const spinner = results.querySelector('.spinner');
            if (spinner) spinner.textContent = `Loading EPG data for ${p.title}... ${i + 1} / ${platformResults.length} platform(s)`;

            let pRegions = [];
            try {
                const data = await API.fetch(`/platform/${p.id}/region`);
                pRegions = data.item || data || [];
            } catch (err) {
                // no regions
            }

            const regionEpgs = [];

            if (pRegions.length === 0) {
                // Platform has no regions — try to get EPG from unfiltered channel list
                try {
                    const data = await API.fetch('/channel', { platformId: p.id });
                    const match = (data.item || []).find(ch => ch.id === channelId);
                    if (match && match.epg) {
                        regionEpgs.push({ region: '(No regions)', epg: match.epg });
                    }
                } catch (err) { /* skip */ }
            } else {
                // Fetch per-region in batches
                for (let j = 0; j < pRegions.length; j += batchSize) {
                    const rBatch = pRegions.slice(j, j + batchSize);
                    const rPromises = rBatch.map(async (r) => {
                        const rName = r.title || r.name || 'Unnamed';
                        try {
                            const data = await API.fetch('/channel', { platformId: p.id, regionId: r.id });
                            const match = (data.item || []).find(ch => ch.id === channelId);
                            if (match && match.epg) {
                                return { region: rName, epg: match.epg };
                            }
                        } catch (err) { /* skip */ }
                        return null;
                    });
                    const rResults = await Promise.all(rPromises);
                    rResults.filter(Boolean).forEach(r => regionEpgs.push(r));
                }
            }

            if (regionEpgs.length > 0) {
                platformEpgData.push({ platform: p, regionEpgs });
            }
        }

        // Step 5: Render results
        renderLookupResults(results, channelInfo, platformEpgData);
    }

    function renderLookupChannelHeader(container, ch) {
        const cats = (ch.category || []).map(c => c.name).join(', ');
        const attrs = (ch.attribute || []).map(a =>
            `<span class="badge ${a === 'hd' ? 'badge-green' : 'badge-gray'}">${API.escapeHtml(a)}</span>`
        ).join(' ');

        const header = document.createElement('div');
        header.style.cssText = 'padding:16px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:8px;margin-bottom:16px';
        header.innerHTML = `
            <h3 style="margin:0 0 8px 0">${API.escapeHtml(ch.title)}</h3>
            <div style="font-size:13px;color:var(--color-text-secondary);display:flex;gap:16px;flex-wrap:wrap">
                <span><strong>ID:</strong> <code style="font-size:12px;user-select:all">${API.escapeHtml(ch.id)}</code></span>
                ${cats ? `<span><strong>Category:</strong> ${API.escapeHtml(cats)}</span>` : ''}
                ${attrs ? `<span><strong>Attributes:</strong> ${attrs}</span>` : ''}
            </div>
        `;
        container.appendChild(header);
    }

    function renderLookupResults(container, channelInfo, platformEpgData) {
        container.innerHTML = '';

        renderLookupChannelHeader(container, channelInfo);

        if (platformEpgData.length === 0) {
            API.showEmpty(container, 'No EPG numbers found for this channel on any platform.');
            return;
        }

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `Found on ${platformEpgData.length} platform(s)`;
        container.appendChild(info);

        platformEpgData.forEach(({ platform, regionEpgs }) => {
            const card = document.createElement('div');
            card.style.cssText = 'border:1px solid var(--color-border);border-radius:8px;margin-bottom:12px;overflow:hidden';

            // Check if all regions share the same EPG
            const uniqueEpgs = [...new Set(regionEpgs.map(r => r.epg))];
            const allSame = uniqueEpgs.length === 1;

            // Platform header
            const cardHeader = document.createElement('div');
            cardHeader.style.cssText = 'padding:12px 16px;background:var(--color-surface);border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;align-items:center;cursor:pointer';
            cardHeader.innerHTML = `
                <div>
                    <strong>${API.escapeHtml(platform.title)}</strong>
                    <span style="color:var(--color-text-secondary);font-size:13px;margin-left:8px">${regionEpgs.length} region(s)</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                    ${allSame ? `<span class="badge badge-green">EPG ${API.escapeHtml(uniqueEpgs[0])}</span>` : `<span class="badge badge-orange">${uniqueEpgs.length} different EPG numbers</span>`}
                    <span class="lookup-chevron" style="font-size:18px;transition:transform 0.2s">&#9660;</span>
                </div>
            `;
            card.appendChild(cardHeader);

            // Region table (collapsible body)
            const cardBody = document.createElement('div');
            cardBody.style.cssText = 'padding:0';

            const table = document.createElement('table');
            table.className = 'data-table';
            table.style.cssText = 'margin:0;border:none;border-radius:0';

            // Group regions by country if there are multiple
            if (regionEpgs.length > 1 && regionEpgs[0].region !== '(No regions)') {
                const mode = allSame ? uniqueEpgs[0] : getMode(
                    regionEpgs.reduce((acc, r) => { acc[r.region] = r.epg; return acc; }, {})
                );

                // Group by country
                const countryGroups = {};
                regionEpgs.forEach(r => {
                    const country = classifyRegion(r.region);
                    if (!countryGroups[country]) countryGroups[country] = [];
                    countryGroups[country].push(r);
                });

                const countryOrder = ['England', 'Scotland', 'Wales', 'Northern Ireland', 'Republic of Ireland'];

                let thead = '<thead><tr><th>Region</th><th style="text-align:center;width:100px">EPG #</th></tr></thead>';
                let tbody = '<tbody>';

                countryOrder.forEach(country => {
                    const group = countryGroups[country];
                    if (!group || group.length === 0) return;

                    // Country separator row
                    tbody += `<tr><td colspan="2" style="background:var(--color-surface);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:var(--color-text-secondary);padding:6px 12px">${API.escapeHtml(country)}</td></tr>`;

                    group.forEach(r => {
                        const epgMatch = String(r.epg) === String(mode);
                        const bgColor = allSame ? '' : (epgMatch ? 'background-color:rgba(76,175,80,0.1)' : 'background-color:rgba(255,152,0,0.1)');
                        tbody += `<tr style="${bgColor}">
                            <td style="padding-left:24px">${API.escapeHtml(r.region)}</td>
                            <td style="text-align:center"><strong>${API.escapeHtml(r.epg)}</strong></td>
                        </tr>`;
                    });
                });

                tbody += '</tbody>';
                table.innerHTML = thead + tbody;
            } else {
                table.innerHTML = `
                    <thead><tr><th>Region</th><th style="text-align:center;width:100px">EPG #</th></tr></thead>
                    <tbody>${regionEpgs.map(r => `
                        <tr>
                            <td>${API.escapeHtml(r.region)}</td>
                            <td style="text-align:center"><strong>${API.escapeHtml(r.epg)}</strong></td>
                        </tr>
                    `).join('')}</tbody>
                `;
            }

            cardBody.appendChild(table);
            card.appendChild(cardBody);

            // Collapse/expand toggle
            cardHeader.addEventListener('click', () => {
                const isHidden = cardBody.style.display === 'none';
                cardBody.style.display = isHidden ? '' : 'none';
                cardHeader.querySelector('.lookup-chevron').style.transform = isHidden ? '' : 'rotate(-90deg)';
            });

            container.appendChild(card);
        });
    }

    return { render };
})();
