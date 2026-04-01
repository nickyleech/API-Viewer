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
    let lookupSelectedChannels = [];

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
                    <div class="form-group" style="min-width:300px;max-width:400px">
                        <label>Channel</label>
                        <input type="text" id="lookup-channel-search" class="input" placeholder="Type to search and add channels..." style="width:100%" autocomplete="off">
                        <div id="lookup-channel-dropdown" class="channel-dropdown"></div>
                    </div>
                    <div class="form-group">
                        <label>&nbsp;</label>
                        <button id="lookup-browse-all" class="btn btn-sm btn-secondary">Browse All</button>
                    </div>
                    <div class="form-group">
                        <label>&nbsp;</label>
                        <button id="lookup-btn" class="btn btn-primary">Look Up</button>
                    </div>
                    <div class="form-group">
                        <label>&nbsp;</label>
                        <button id="lookup-download-all" class="btn btn-secondary">Download All Channels (Excel)</button>
                    </div>
                </div>
                <div id="lookup-channel-browser" style="display:none;margin-bottom:16px;border:1px solid var(--color-border);border-radius:6px;background:var(--color-surface)">
                    <div style="display:flex;gap:12px;align-items:center;padding:10px 14px;border-bottom:1px solid var(--color-border)">
                        <span style="font-size:12px;font-weight:600;color:var(--color-text-secondary)">ALL CHANNELS</span>
                        <div style="display:flex;gap:8px;align-items:center">
                            <input type="text" id="lookup-browser-search" class="input" placeholder="Filter..." style="width:180px;height:28px;font-size:12px;padding:2px 8px">
                            <button id="lookup-unselect-all" class="btn btn-sm btn-secondary" style="font-size:11px;padding:2px 8px">Unselect All</button>
                            <button id="lookup-browser-close" class="btn btn-sm btn-secondary" style="font-size:11px;padding:2px 8px">Close</button>
                        </div>
                    </div>
                    <div id="lookup-browser-list" style="max-height:300px;overflow-y:auto;padding:8px 14px"></div>
                </div>
                <div id="lookup-selected-chips" style="display:none;margin-bottom:16px">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                        <span style="font-size:12px;font-weight:600;color:var(--color-text-secondary)">SELECTED CHANNELS</span>
                        <button id="lookup-clear-all" class="btn btn-sm btn-secondary" style="font-size:11px;padding:2px 8px">Clear All</button>
                    </div>
                    <div id="lookup-chips-container" style="display:flex;gap:6px;flex-wrap:wrap"></div>
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
        document.getElementById('lookup-download-all').addEventListener('click', downloadAllChannelsExcel);
        document.getElementById('lookup-browse-all').addEventListener('click', toggleLookupBrowser);
        document.getElementById('lookup-browser-close').addEventListener('click', () => {
            document.getElementById('lookup-channel-browser').style.display = 'none';
        });
        document.getElementById('lookup-browser-search').addEventListener('input', renderLookupBrowser);
        document.getElementById('lookup-unselect-all').addEventListener('click', () => {
            lookupSelectedChannels = [];
            renderLookupChips();
        });
        document.getElementById('lookup-clear-all').addEventListener('click', () => {
            lookupSelectedChannels = [];
            renderLookupChips();
        });
        setupLookupChannelSearch();

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
        try {
            const data = await API.fetch('/channel');
            lookupAllChannels = (data.item || []).sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        } catch (err) {
            lookupAllChannels = [];
        }
    }

    function setupLookupChannelSearch() {
        const input = document.getElementById('lookup-channel-search');
        const dropdown = document.getElementById('lookup-channel-dropdown');

        input.addEventListener('focus', () => { input.select(); });
        input.addEventListener('input', showLookupDropdown);

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#lookup-channel-search') && !e.target.closest('#lookup-channel-dropdown')) {
                dropdown.style.display = 'none';
            }
        });
    }

    function showLookupDropdown() {
        const input = document.getElementById('lookup-channel-search');
        const dropdown = document.getElementById('lookup-channel-dropdown');
        const query = (input.value || '').toLowerCase().trim();

        if (lookupAllChannels.length === 0) {
            dropdown.innerHTML = '<div class="dropdown-empty">Loading channels...</div>';
            dropdown.style.display = 'block';
            return;
        }

        if (!query) {
            dropdown.style.display = 'none';
            return;
        }

        const selectedIds = new Set(lookupSelectedChannels.map(ch => ch.id));
        const filtered = lookupAllChannels.filter(ch =>
            !selectedIds.has(ch.id) && (ch.title || '').toLowerCase().includes(query)
        );

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
                lookupSelectedChannels.push({ id: ch.id, title: ch.title });
                renderLookupChips();
                input.value = '';
                dropdown.style.display = 'none';
                input.focus();
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

    function renderLookupChips() {
        const wrapper = document.getElementById('lookup-selected-chips');
        const container = document.getElementById('lookup-chips-container');

        if (lookupSelectedChannels.length === 0) {
            wrapper.style.display = 'none';
            renderLookupBrowser();
            return;
        }

        wrapper.style.display = 'block';
        container.innerHTML = '';
        lookupSelectedChannels.forEach(ch => {
            const chip = document.createElement('span');
            chip.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:4px 8px 4px 10px;background:var(--color-accent);color:#fff;border-radius:14px;font-size:12px;font-weight:500';
            chip.innerHTML = `${API.escapeHtml(ch.title)}<button style="background:none;border:none;color:#fff;cursor:pointer;font-size:15px;line-height:1;padding:0 2px" title="Remove">&times;</button>`;
            chip.querySelector('button').addEventListener('click', () => {
                lookupSelectedChannels = lookupSelectedChannels.filter(c => c.id !== ch.id);
                renderLookupChips();
            });
            container.appendChild(chip);
        });

        renderLookupBrowser();
    }

    function toggleLookupBrowser() {
        const browser = document.getElementById('lookup-channel-browser');
        const isVisible = browser.style.display !== 'none';
        if (isVisible) {
            browser.style.display = 'none';
        } else {
            browser.style.display = '';
            renderLookupBrowser();
        }
    }

    function renderLookupBrowser() {
        const browser = document.getElementById('lookup-channel-browser');
        if (browser.style.display === 'none') return;

        const listDiv = document.getElementById('lookup-browser-list');
        const searchQuery = (document.getElementById('lookup-browser-search').value || '').toLowerCase().trim();
        const selectedIds = new Set(lookupSelectedChannels.map(ch => ch.id));

        const matched = searchQuery
            ? lookupAllChannels.filter(ch => (ch.title || '').toLowerCase().includes(searchQuery))
            : lookupAllChannels;

        if (matched.length === 0) {
            listDiv.innerHTML = '<div style="padding:12px;color:var(--color-text-secondary);font-size:13px">No channels match the current filter.</div>';
            return;
        }

        listDiv.innerHTML = '';
        matched.forEach(ch => {
            const row = document.createElement('label');
            row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;font-size:13px';
            row.innerHTML = `
                <input type="checkbox" data-channel-id="${API.escapeHtml(ch.id)}" ${selectedIds.has(ch.id) ? 'checked' : ''}>
                <span>${API.escapeHtml(ch.title)}</span>
            `;
            row.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) {
                    if (!selectedIds.has(ch.id)) {
                        lookupSelectedChannels.push({ id: ch.id, title: ch.title });
                        selectedIds.add(ch.id);
                        renderLookupChips();
                    }
                } else {
                    lookupSelectedChannels = lookupSelectedChannels.filter(c => c.id !== ch.id);
                    selectedIds.delete(ch.id);
                    renderLookupChips();
                }
            });
            listDiv.appendChild(row);
        });
    }

    async function lookupChannel() {
        const results = document.getElementById('lookup-results');

        if (lookupSelectedChannels.length === 0) {
            API.toast('Please select at least one channel.', 'warning');
            return;
        }

        const selectedIds = new Set(lookupSelectedChannels.map(ch => ch.id));
        const channelTitleMap = {};
        lookupSelectedChannels.forEach(ch => { channelTitleMap[ch.id] = ch.title; });

        API.showLoading(results);

        // Step 1: Fetch full channel details for all selected channels
        const channelInfos = {};
        const detailPromises = lookupSelectedChannels.map(async (ch) => {
            try {
                channelInfos[ch.id] = await API.fetch(`/channel/${ch.id}`);
            } catch (err) {
                channelInfos[ch.id] = { id: ch.id, title: ch.title };
            }
        });
        await Promise.all(detailPromises);

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

        // Step 3: Scan all platforms for any selected channel
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
                    if (channels.some(ch => selectedIds.has(ch.id))) {
                        return { platform: p, found: true };
                    }
                } catch (err) { /* skip */ }
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
            API.showEmpty(results, 'Selected channel(s) were not found on any platform.');
            return;
        }

        // Step 4: For each matching platform, fetch regions and per-region EPG for all selected channels
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
            } catch (err) { /* no regions */ }

            // regionEpgs entries now include channelId and channelTitle
            const regionEpgs = [];

            if (pRegions.length === 0) {
                try {
                    const data = await API.fetch('/channel', { platformId: p.id });
                    (data.item || []).forEach(ch => {
                        if (selectedIds.has(ch.id) && ch.epg) {
                            regionEpgs.push({ region: '(No regions)', channelId: ch.id, channelTitle: channelTitleMap[ch.id], epg: ch.epg });
                        }
                    });
                } catch (err) { /* skip */ }
            } else {
                for (let j = 0; j < pRegions.length; j += batchSize) {
                    const rBatch = pRegions.slice(j, j + batchSize);
                    const rPromises = rBatch.map(async (r) => {
                        const rName = r.title || r.name || 'Unnamed';
                        try {
                            const data = await API.fetch('/channel', { platformId: p.id, regionId: r.id });
                            const matches = [];
                            (data.item || []).forEach(ch => {
                                if (selectedIds.has(ch.id) && ch.epg) {
                                    matches.push({ region: rName, channelId: ch.id, channelTitle: channelTitleMap[ch.id], epg: ch.epg });
                                }
                            });
                            return matches;
                        } catch (err) { /* skip */ }
                        return [];
                    });
                    const rResults = await Promise.all(rPromises);
                    rResults.forEach(matches => matches.forEach(m => regionEpgs.push(m)));
                }
            }

            if (regionEpgs.length > 0) {
                platformEpgData.push({ platform: p, regionEpgs });
            }
        }

        // Step 5: Render results
        renderLookupResults(results, channelInfos, platformEpgData);
    }

    function renderLookupChannelHeader(container, channelInfos) {
        const ids = Object.keys(channelInfos);
        if (ids.length === 1) {
            const ch = channelInfos[ids[0]];
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
        } else {
            const header = document.createElement('div');
            header.style.cssText = 'padding:12px 16px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:8px;margin-bottom:16px';
            header.innerHTML = `<div style="font-size:13px;color:var(--color-text-secondary)"><strong>${ids.length} channels selected:</strong> ${ids.map(id => API.escapeHtml(channelInfos[id].title)).join(', ')}</div>`;
            container.appendChild(header);
        }
    }

    function renderLookupResults(container, channelInfos, platformEpgData) {
        container.innerHTML = '';

        renderLookupChannelHeader(container, channelInfos);

        if (platformEpgData.length === 0) {
            API.showEmpty(container, 'No EPG numbers found for selected channel(s) on any platform.');
            return;
        }

        const platformNames = platformEpgData.map(d => d.platform.title);
        const channelIds = lookupSelectedChannels.map(ch => ch.id);
        const multiChannel = channelIds.length > 1;

        // Build lookup: platformIndex → { regionName → { channelId → epg } }
        const noRegionPlatforms = new Set();
        const platformLookup = platformEpgData.map(({ regionEpgs }, idx) => {
            const map = {};
            regionEpgs.forEach(({ region, channelId, epg }) => {
                if (region === '(No regions)') noRegionPlatforms.add(idx);
                if (!map[region]) map[region] = {};
                map[region][channelId] = epg;
            });
            return map;
        });

        // Collect all unique region names
        const allRegions = new Set();
        platformEpgData.forEach(({ regionEpgs }) => {
            regionEpgs.forEach(r => {
                if (r.region !== '(No regions)') allRegions.add(r.region);
            });
        });

        // Organize regions by country
        const countryOrder = ['England', 'Scotland', 'Wales', 'Northern Ireland', 'Republic of Ireland'];
        const regionsByCountry = {};
        countryOrder.forEach(c => { regionsByCountry[c] = []; });
        allRegions.forEach(r => {
            const country = classifyRegion(r);
            if (!regionsByCountry[country]) regionsByCountry[country] = [];
            regionsByCountry[country].push(r);
        });
        Object.values(regionsByCountry).forEach(arr => arr.sort((a, b) => a.localeCompare(b)));

        // Helper to get EPG for a specific (region, channelId, platformIndex)
        function getEpg(region, chId, pIdx) {
            const map = platformLookup[pIdx];
            let epg = map[region] && map[region][chId];
            if (!epg && noRegionPlatforms.has(pIdx) && map['(No regions)']) {
                epg = map['(No regions)'][chId];
            }
            return epg ? String(epg) : null;
        }

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `Found on ${platformEpgData.length} platform(s)`;
        container.appendChild(info);

        // Render table
        const scrollWrap = document.createElement('div');
        scrollWrap.style.cssText = 'overflow:auto;max-height:70vh';

        const table = document.createElement('table');
        table.className = 'data-table';
        table.style.cssText = 'border-collapse:separate;border-spacing:0';

        const stickyTh = 'position:sticky;top:0;z-index:2;background:var(--color-bg)';
        const colSpan = (multiChannel ? 2 : 1) + platformNames.length;
        let thead = `<thead><tr><th style="min-width:180px;${stickyTh}">Region</th>`;
        if (multiChannel) thead += `<th style="min-width:180px;${stickyTh}">Channel</th>`;
        platformNames.forEach(name => {
            thead += `<th style="text-align:center;min-width:80px;${stickyTh}">${API.escapeHtml(name)}</th>`;
        });
        thead += '</tr></thead>';

        let tbody = '<tbody>';

        // Handle no-region-only case
        if (allRegions.size === 0 && noRegionPlatforms.size > 0) {
            channelIds.forEach(chId => {
                const title = channelInfos[chId]?.title || chId;
                const hasAny = platformLookup.some((_, pIdx) => getEpg('(No regions)', chId, pIdx));
                if (!hasAny) return;
                tbody += '<tr>';
                tbody += '<td><strong>All regions</strong></td>';
                if (multiChannel) tbody += `<td>${API.escapeHtml(title)}</td>`;
                platformLookup.forEach((_, pIdx) => {
                    const epg = getEpg('(No regions)', chId, pIdx);
                    tbody += epg
                        ? `<td style="text-align:center"><strong>${API.escapeHtml(epg)}</strong></td>`
                        : '<td style="text-align:center;color:var(--color-text-secondary)">-</td>';
                });
                tbody += '</tr>';
            });
        } else {
            // Process each country with mode consolidation
            const ABSENT = '__absent__';

            countryOrder.forEach(country => {
                const countryRegions = regionsByCountry[country];
                if (!countryRegions || countryRegions.length === 0) return;

                // Compute mode EPG for each (channelId, platformIndex) across this country's regions
                const modeMap = {}; // chId → [modeEpg per platform]
                channelIds.forEach(chId => {
                    modeMap[chId] = platformLookup.map((map, pIdx) => {
                        const counts = {};
                        countryRegions.forEach(region => {
                            if (!map[region] && !noRegionPlatforms.has(pIdx)) return;
                            const key = getEpg(region, chId, pIdx) || ABSENT;
                            counts[key] = (counts[key] || 0) + 1;
                        });
                        let mode = null;
                        let maxCount = 0;
                        Object.entries(counts).forEach(([key, count]) => {
                            if (count > maxCount) {
                                maxCount = count;
                                mode = key === ABSENT ? null : key;
                            }
                        });
                        return mode;
                    });
                });

                // Check if any channel has presence in this country
                const hasPresence = channelIds.some(chId => modeMap[chId].some(m => m !== null));
                if (!hasPresence) return;

                // Country header
                tbody += `<tr><td colspan="${colSpan}" style="background:var(--color-surface);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:var(--color-text-secondary);padding:6px 12px">${API.escapeHtml(country)}</td></tr>`;

                // Summary rows: one per channel showing mode values
                let summaryRegionShown = false;
                channelIds.forEach(chId => {
                    const title = channelInfos[chId]?.title || chId;
                    const modes = modeMap[chId];
                    if (modes.every(m => m === null)) return;

                    tbody += '<tr>';
                    if (!summaryRegionShown) {
                        tbody += `<td style="padding-left:24px"><strong>${API.escapeHtml(country)}</strong></td>`;
                        summaryRegionShown = true;
                    } else {
                        tbody += '<td></td>';
                    }
                    if (multiChannel) tbody += `<td>${API.escapeHtml(title)}</td>`;
                    modes.forEach(mode => {
                        tbody += mode
                            ? `<td style="text-align:center"><strong>${API.escapeHtml(mode)}</strong></td>`
                            : '<td style="text-align:center;color:var(--color-text-secondary)">-</td>';
                    });
                    tbody += '</tr>';
                });

                // Exception rows: regions where any (chId, pIdx) differs from mode
                countryRegions.forEach(region => {
                    const channelExceptions = [];
                    channelIds.forEach(chId => {
                        const modes = modeMap[chId];
                        const hasDiff = platformLookup.some((map, pIdx) => {
                            if (!map[region] && !noRegionPlatforms.has(pIdx)) return false;
                            const actual = getEpg(region, chId, pIdx);
                            return actual !== modes[pIdx];
                        });
                        if (hasDiff) channelExceptions.push(chId);
                    });

                    if (channelExceptions.length === 0) return;

                    let regionShown = false;
                    channelExceptions.forEach(chId => {
                        const title = channelInfos[chId]?.title || chId;
                        const modes = modeMap[chId];
                        tbody += '<tr>';
                        if (!regionShown) {
                            tbody += `<td style="padding-left:36px;font-size:13px">${API.escapeHtml(region)}</td>`;
                            regionShown = true;
                        } else {
                            tbody += '<td></td>';
                        }
                        if (multiChannel) tbody += `<td style="font-size:13px">${API.escapeHtml(title)}</td>`;
                        platformLookup.forEach((map, pIdx) => {
                            if (!map[region] && !noRegionPlatforms.has(pIdx)) {
                                tbody += '<td style="text-align:center;color:var(--color-text-secondary)">-</td>';
                                return;
                            }
                            const actual = getEpg(region, chId, pIdx);
                            const isDiff = actual !== modes[pIdx];
                            if (actual) {
                                tbody += isDiff
                                    ? `<td style="text-align:center;background-color:#ff9800"><strong style="color:#fff">${API.escapeHtml(actual)}</strong></td>`
                                    : `<td style="text-align:center"><strong>${API.escapeHtml(actual)}</strong></td>`;
                            } else {
                                tbody += isDiff
                                    ? '<td style="text-align:center;background-color:#eeeeee"></td>'
                                    : '<td style="text-align:center;color:var(--color-text-secondary)">-</td>';
                            }
                        });
                        tbody += '</tr>';
                    });
                });
            });
        }

        tbody += '</tbody>';
        table.innerHTML = thead + tbody;
        scrollWrap.appendChild(table);
        container.appendChild(scrollWrap);
    }

    async function downloadAllChannelsExcel() {
        if (!confirm('This will fetch EPG data for all channels across every platform and region. This may take a while. Continue?')) return;

        const results = document.getElementById('lookup-results');

        if (platforms.length === 0) {
            try {
                const data = await API.fetch('/platform');
                platforms = data.item || [];
            } catch (err) {
                API.toast('Failed to load platforms.', 'error');
                return;
            }
        }

        results.innerHTML = '';
        const progress = document.createElement('div');
        progress.style.cssText = 'margin:16px 0';
        progress.innerHTML = `
            <div style="font-size:13px;margin-bottom:6px;color:var(--color-text-secondary)">Fetching platform data... 0 / ${platforms.length}</div>
            <div style="width:100%;height:8px;background:var(--color-border);border-radius:4px;overflow:hidden">
                <div style="width:0%;height:100%;background:var(--color-accent);transition:width 0.3s"></div>
            </div>
        `;
        results.appendChild(progress);
        const progressText = progress.querySelector('div');
        const progressBar = progress.querySelector('div > div > div');

        // Fetch all platform data: regions + channel EPGs per region
        const allPlatformData = [];
        const batchSize = 5;

        for (let i = 0; i < platforms.length; i++) {
            const p = platforms[i];
            progressText.textContent = `Fetching ${p.title}... ${i + 1} / ${platforms.length}`;
            progressBar.style.width = `${((i + 1) / platforms.length) * 100}%`;

            let pRegions = [];
            try {
                const data = await API.fetch(`/platform/${p.id}/region`);
                pRegions = data.item || data || [];
            } catch (err) { /* no regions */ }

            const regionData = {};
            let noRegions = false;

            if (pRegions.length === 0) {
                noRegions = true;
                try {
                    const data = await API.fetch('/channel', { platformId: p.id });
                    regionData['(No regions)'] = (data.item || []).filter(ch => ch.epg);
                } catch (err) { /* skip */ }
            } else {
                for (let j = 0; j < pRegions.length; j += batchSize) {
                    const batch = pRegions.slice(j, j + batchSize);
                    const promises = batch.map(async (r) => {
                        const rName = r.title || r.name || 'Unnamed';
                        try {
                            const data = await API.fetch('/channel', { platformId: p.id, regionId: r.id });
                            regionData[rName] = (data.item || []).filter(ch => ch.epg);
                        } catch (err) {
                            regionData[rName] = [];
                        }
                    });
                    await Promise.all(promises);
                }
            }

            allPlatformData.push({ platform: p, noRegions, regionData });
        }

        progressText.textContent = 'Generating Excel file...';

        // Build channel lookup: channelTitle → { pIdx → { regionName → epgStr } }
        const channelLookup = new Map();
        allPlatformData.forEach(({ regionData }, pIdx) => {
            Object.entries(regionData).forEach(([rName, channels]) => {
                channels.forEach(ch => {
                    const title = ch.title || ch.id;
                    if (!channelLookup.has(title)) channelLookup.set(title, {});
                    const entry = channelLookup.get(title);
                    if (!entry[pIdx]) entry[pIdx] = {};
                    entry[pIdx][rName] = String(ch.epg);
                });
            });
        });

        // Group regions by country
        const allRegions = new Set();
        allPlatformData.forEach(({ regionData }) => {
            Object.keys(regionData).forEach(r => { if (r !== '(No regions)') allRegions.add(r); });
        });

        const cOrder = ['England', 'Scotland', 'Wales', 'Northern Ireland', 'Republic of Ireland'];
        const regionsByC = {};
        cOrder.forEach(c => { regionsByC[c] = []; });
        allRegions.forEach(r => {
            const c = classifyRegion(r);
            if (!regionsByC[c]) regionsByC[c] = [];
            regionsByC[c].push(r);
        });
        Object.values(regionsByC).forEach(arr => arr.sort());

        const platformNames = allPlatformData.map(d => d.platform.title);
        const wb = XLSX.utils.book_new();
        const ABSENT = '__absent__';

        function calcMode(chPlatRegions, countryRegions, pIdx) {
            const rd = allPlatformData[pIdx].regionData;
            const counts = {};
            countryRegions.forEach(region => {
                if (!rd[region]) return;
                const key = (chPlatRegions && chPlatRegions[region]) || ABSENT;
                counts[key] = (counts[key] || 0) + 1;
            });
            let mode = null, maxCount = 0;
            Object.entries(counts).forEach(([key, count]) => {
                if (count > maxCount) { maxCount = count; mode = key === ABSENT ? null : key; }
            });
            return mode;
        }

        // Generate sheets per country
        const allExcRows = [];

        cOrder.forEach(country => {
            const cRegions = regionsByC[country];
            if (!cRegions || cRegions.length === 0) return;

            const rows = [];
            channelLookup.forEach((platData, chTitle) => {
                const row = { 'Channel Name': chTitle };
                let hasAny = false;
                const variationParts = [];

                allPlatformData.forEach(({ regionData, noRegions }, pIdx) => {
                    const pName = platformNames[pIdx];

                    if (noRegions) {
                        const epg = platData[pIdx] && platData[pIdx]['(No regions)'];
                        row[pName] = epg ? parseInt(epg) : '';
                        if (epg) hasAny = true;
                        return;
                    }

                    const mode = calcMode(platData[pIdx], cRegions, pIdx);
                    row[pName] = mode ? parseInt(mode) : '';
                    if (mode) hasAny = true;

                    // Count regional exceptions for this platform
                    let diffCount = 0;
                    cRegions.forEach(region => {
                        if (!regionData[region]) return;
                        const epg = (platData[pIdx] && platData[pIdx][region]) || null;
                        if (epg !== mode) {
                            diffCount++;
                            allExcRows.push({
                                'Country': country, 'Region': region, 'Channel': chTitle,
                                'Platform': pName,
                                'Mode EPG': mode ? parseInt(mode) : '(absent)',
                                'Actual EPG': epg ? parseInt(epg) : '(absent)'
                            });
                        }
                    });
                    if (diffCount > 0) variationParts.push(`${pName} (${diffCount})`);
                });

                row['Regional Variations'] = variationParts.join(', ');
                if (hasAny) rows.push(row);
            });

            rows.sort((a, b) => {
                const aMin = Math.min(...platformNames.map(p => typeof a[p] === 'number' ? epgSortKey(a[p]) : Infinity));
                const bMin = Math.min(...platformNames.map(p => typeof b[p] === 'number' ? epgSortKey(b[p]) : Infinity));
                return aMin - bMin;
            });

            if (rows.length > 0) {
                const ws = XLSX.utils.json_to_sheet(rows);
                XLSX.utils.book_append_sheet(wb, ws, country.slice(0, 31));
            }
        });

        // Exceptions sheet
        if (allExcRows.length > 0) {
            allExcRows.sort((a, b) =>
                (cOrder.indexOf(a.Country) - cOrder.indexOf(b.Country)) ||
                a.Channel.localeCompare(b.Channel) ||
                a.Platform.localeCompare(b.Platform) ||
                a.Region.localeCompare(b.Region)
            );
            const ws = XLSX.utils.json_to_sheet(allExcRows);
            XLSX.utils.book_append_sheet(wb, ws, 'Exceptions');
        }

        XLSX.writeFile(wb, 'Channel_Lookup_All.xlsx');
        API.toast('Excel file downloaded.', 'success');
        results.innerHTML = '';
    }

    return { render };
})();
