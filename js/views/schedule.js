const ScheduleView = (() => {
    let allChannels = [];
    let savedListView = null;
    let savedScrollY = 0;
    let currentChannelId = '';

    async function render(container) {
        const today = new Date().toISOString().slice(0, 10);
        container.innerHTML = `
            <div class="view-header">
                <h2>Schedule</h2>
                <p>Pick a channel and date to view the full schedule. Click any programme for full details.</p>
            </div>
            <div class="filter-bar">
                <div class="form-group" style="min-width:300px;max-width:400px">
                    <label>Channel</label>
                    <input type="text" id="sch-channel-search" class="input" placeholder="Type to search channels..." style="width:100%" autocomplete="off">
                    <div id="sch-channel-dropdown" class="channel-dropdown"></div>
                    <input type="hidden" id="sch-channel-id">
                </div>
                <div class="form-group">
                    <label>Date</label>
                    <div style="display:flex;align-items:center;gap:8px">
                        <button id="sch-prev-day" class="btn btn-sm btn-secondary">&larr;</button>
                        <input type="date" id="sch-date" class="input" style="min-width:160px" value="${today}">
                        <button id="sch-next-day" class="btn btn-sm btn-secondary">&rarr;</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>&nbsp;</label>
                    <button id="sch-search" class="btn btn-primary">Load Schedule</button>
                </div>
            </div>
            <div id="schedule-results"></div>
        `;

        setupChannelSearch();
        document.getElementById('sch-search').addEventListener('click', loadSchedule);
        document.getElementById('sch-date').addEventListener('change', () => {
            if (document.getElementById('sch-channel-id').value) loadSchedule();
        });
        document.getElementById('sch-prev-day').addEventListener('click', () => shiftDay(-1));
        document.getElementById('sch-next-day').addEventListener('click', () => shiftDay(1));

        await loadAllChannels();
    }

    async function loadAllChannels() {
        try {
            const data = await API.fetch('/channel');
            allChannels = (data.item || []).sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        } catch (err) {
            allChannels = [];
        }
    }

    function setupChannelSearch() {
        ChannelDropdown.init({
            inputId: 'sch-channel-search',
            dropdownId: 'sch-channel-dropdown',
            hiddenId: 'sch-channel-id',
            getChannels: () => allChannels,
            onSelect: () => loadSchedule()
        });
    }

    function shiftDay(offset) {
        const dateInput = document.getElementById('sch-date');
        const dt = new Date(dateInput.value);
        dt.setDate(dt.getDate() + offset);
        dateInput.value = dt.toISOString().slice(0, 10);
        if (document.getElementById('sch-channel-id').value) loadSchedule();
    }

    async function loadSchedule() {
        const results = document.getElementById('schedule-results');
        const channelId = document.getElementById('sch-channel-id').value;
        currentChannelId = channelId;
        const date = document.getElementById('sch-date').value;

        if (!channelId) {
            API.toast('Please select a channel from the dropdown.', 'warning');
            return;
        }
        if (!date) {
            API.toast('Please select a date.', 'warning');
            return;
        }

        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const params = {
            channelId,
            start: `${date}T00:00:00`,
            end: `${nextDay.toISOString().slice(0, 10)}T00:00:00`
        };

        API.showLoading(results);
        try {
            const signal = API.cancelable('schedule');
            const data = await API.fetch('/schedule', params, { signal });
            renderSchedule(results, data);
        } catch (err) {
            if (err.name === 'AbortError') return;
            API.showError(results, err.message);
        }
    }

    function renderSchedule(container, data) {
        container.innerHTML = '';
        const items = data.item || [];
        if (items.length === 0) {
            API.showEmpty(container, 'No schedule data found for this channel and date.');
            return;
        }

        const channelId = document.getElementById('sch-channel-id').value;
        const channelName = (document.getElementById('sch-channel-search') || {}).value || '';

        const info = document.createElement('div');
        info.className = 'results-info';
        info.textContent = `${data.total || items.length} programme(s)`;
        container.appendChild(info);

        const list = document.createElement('div');
        list.id = 'schedule-list';
        container.appendChild(list);

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card clickable';

            const dt = item.dateTime ? new Date(item.dateTime) : null;
            const time = dt ? dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-';
            const duration = item.duration ? `${item.duration} min` : '';
            const asset = item.asset || {};
            const summary = item.summary || asset.summary || {};
            const shortDesc = summary.short || '';
            const attrs = (item.attribute || []).map(a =>
                `<span class="badge ${a === 'hd' ? 'badge-green' : a === 'subtitles' ? 'badge-blue' : 'badge-gray'}">${API.escapeHtml(a)}</span>`
            ).join(' ');

            card.innerHTML = `
                <div style="display:flex;gap:16px;align-items:start">
                    <div style="min-width:56px;text-align:center">
                        <div style="font-size:20px;font-weight:700;color:var(--color-accent)">${API.escapeHtml(time)}</div>
                        ${duration ? `<div style="font-size:12px;color:var(--color-text-secondary)">${API.escapeHtml(duration)}</div>` : ''}
                        ${channelName ? `<div style="font-size:10px;color:var(--color-text-secondary);margin-top:4px;font-weight:600">${API.escapeHtml(channelName)}</div>` : ''}
                    </div>
                    <div style="flex:1">
                        <div class="card-title">${API.escapeHtml(item.title || 'Untitled')}</div>
                        ${shortDesc ? `<p style="margin:4px 0 0;font-size:13px;color:var(--color-text-secondary)">${API.escapeHtml(shortDesc)}</p>` : ''}
                        ${attrs ? `<div class="card-meta" style="margin-top:6px">${attrs}</div>` : ''}
                    </div>
                </div>
            `;
            card.addEventListener('click', () => showProgrammeDetail(item));
            list.appendChild(card);
        });

        const jsonToggle = API.jsonToggle(data);
        if (channelId) {
            const channelInfo = document.createElement('span');
            channelInfo.style.cssText = 'font-size:12px;color:var(--color-text);margin-left:12px';
            channelInfo.innerHTML = `<strong>${API.escapeHtml(channelName)}</strong> <code style="user-select:all">${API.escapeHtml(channelId)}</code> <button class="sch-copy-id-btn" data-id="${API.escapeHtml(channelId)}" style="background:none;border:1px solid var(--color-border);border-radius:3px;cursor:pointer;font-size:11px;padding:1px 5px;color:var(--color-text-secondary)">Copy</button>`;
            channelInfo.querySelector('.sch-copy-id-btn').addEventListener('click', (e) => {
                const btn = e.target;
                navigator.clipboard.writeText(btn.dataset.id).then(() => {
                    btn.textContent = 'Copied!';
                    setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
                });
            });
            jsonToggle.querySelector('.json-toggle-buttons').appendChild(channelInfo);
        }

        const unicodeBtn = document.createElement('button');
        unicodeBtn.className = 'btn btn-sm btn-secondary';
        unicodeBtn.textContent = 'Check Unicode';
        unicodeBtn.addEventListener('click', () => checkUnicode(items));
        jsonToggle.querySelector('.json-toggle-buttons').appendChild(unicodeBtn);

        container.firstElementChild.after(jsonToggle);

        const unicodePanel = document.createElement('div');
        unicodePanel.id = 'unicode-results';
        unicodePanel.style.display = 'none';
        jsonToggle.after(unicodePanel);
    }

    function extractTextFields(item) {
        const fields = [];
        const asset = item.asset || {};
        const itemSummary = item.summary || {};
        const assetSummary = asset.summary || {};

        const simple = [
            ['Title', item.title],
            ['Episode Title', asset.title],
            ['Summary (Short)', itemSummary.short],
            ['Summary (Medium)', itemSummary.medium],
            ['Summary (Long)', itemSummary.long],
            ['Asset Summary (Short)', assetSummary.short],
            ['Asset Summary (Medium)', assetSummary.medium],
            ['Asset Summary (Long)', assetSummary.long],
        ];
        simple.forEach(([name, val]) => {
            if (val) fields.push({ fieldName: name, value: val });
        });

        (asset.contributor || []).forEach((c, i) => {
            if (c.name) fields.push({ fieldName: `Contributor[${i}].name`, value: c.name });
            (c.character || []).forEach((ch, j) => {
                if (ch.name) fields.push({ fieldName: `Contributor[${i}].character[${j}]`, value: ch.name });
            });
        });

        (asset.category || []).forEach((c, i) => {
            if (c.name) fields.push({ fieldName: `Category[${i}]`, value: c.name });
        });

        const arrays = [
            ['keywords', asset.keywords],
            ['locations', asset.locations],
            ['mood', asset.mood],
            ['themes', asset.themes],
            ['soundtrack', asset.soundtrack],
        ];
        arrays.forEach(([label, arr]) => {
            (arr || []).forEach((v, i) => {
                const text = typeof v === 'string' ? v : (v.name || '');
                if (text) fields.push({ fieldName: `${label}[${i}]`, value: text });
            });
        });

        return fields;
    }

    function findUnicodeIssues(text) {
        const issues = [];

        // Replacement character
        for (const m of text.matchAll(/\uFFFD/g)) {
            issues.push({ type: 'replacement', description: 'Replacement character \uFFFD', index: m.index, length: 1, char: m[0] });
        }

        // Mojibake / double-encoded UTF-8
        const mojibake = [
            [/\u00C3[\u00A0-\u00BF]/g, 'Double-encoded UTF-8 (Mojibake)'],
            [/\u00C2[\u00A0-\u00BF]/g, 'Double-encoded UTF-8 (Mojibake)'],
            [/\u00E2\u0080[\u0090-\u00BF]/g, 'Double-encoded UTF-8 (Mojibake)'],
        ];
        mojibake.forEach(([re, desc]) => {
            for (const m of text.matchAll(re)) {
                issues.push({ type: 'mojibake', description: desc, index: m.index, length: m[0].length, char: m[0] });
            }
        });

        // Unresolved HTML entities
        for (const m of text.matchAll(/&(?:#\d{1,6}|#x[0-9a-fA-F]{1,6}|[a-zA-Z]{2,8});/g)) {
            issues.push({ type: 'html-entity', description: 'Unresolved HTML entity: ' + m[0], index: m.index, length: m[0].length, char: m[0] });
        }

        // Invisible / zero-width characters
        const invisibleNames = {
            '\u200B': 'Zero-Width Space (U+200B)',
            '\u200C': 'Zero-Width Non-Joiner (U+200C)',
            '\u200D': 'Zero-Width Joiner (U+200D)',
            '\uFEFF': 'Byte Order Mark (U+FEFF)',
            '\u00AD': 'Soft Hyphen (U+00AD)',
        };
        for (const m of text.matchAll(/[\u200B\u200C\u200D\uFEFF\u00AD]/g)) {
            issues.push({ type: 'invisible', description: invisibleNames[m[0]] || 'Invisible character', index: m.index, length: 1, char: m[0] });
        }

        // C0/C1 control characters (except \n \r \t)
        for (const m of text.matchAll(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g)) {
            const cp = m[0].codePointAt(0);
            issues.push({ type: 'control', description: 'Control char U+' + cp.toString(16).toUpperCase().padStart(4, '0'), index: m.index, length: 1, char: m[0] });
        }

        // Private Use Area
        for (const m of text.matchAll(/[\uE000-\uF8FF]/g)) {
            const cp = m[0].codePointAt(0);
            issues.push({ type: 'private-use', description: 'Private Use Area U+' + cp.toString(16).toUpperCase().padStart(4, '0'), index: m.index, length: 1, char: m[0] });
        }

        return issues;
    }

    function checkUnicode(items) {
        const results = [];
        items.forEach(item => {
            const dt = item.dateTime ? new Date(item.dateTime) : null;
            const time = dt ? dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-';
            const title = item.title || 'Untitled';
            const fields = extractTextFields(item);

            fields.forEach(({ fieldName, value }) => {
                const issues = findUnicodeIssues(value);
                if (issues.length > 0) {
                    results.push({ time, title, fieldName, value, issues });
                }
            });
        });
        renderUnicodeResults(results, items.length);
    }

    function renderUnicodeResults(results, totalProgrammes) {
        const panel = document.getElementById('unicode-results');
        panel.style.display = '';
        panel.innerHTML = '';

        const affectedProgrammes = new Set(results.map(r => r.time + r.title)).size;
        const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);

        const summary = document.createElement('div');
        summary.className = 'card';
        summary.style.borderLeftWidth = '4px';

        if (totalIssues === 0) {
            summary.style.borderLeftColor = 'var(--color-success)';
            summary.innerHTML = `<div style="display:flex;align-items:center;gap:8px">
                <span style="color:var(--color-success);font-weight:700;font-size:18px">&#10003;</span>
                <div>
                    <div style="font-weight:600;color:var(--color-success)">No Unicode issues found</div>
                    <div style="font-size:13px;color:var(--color-text-secondary)">${totalProgrammes} programme(s) checked, all clean.</div>
                </div>
                <button class="btn btn-sm btn-secondary" style="margin-left:auto" id="unicode-close">Dismiss</button>
            </div>`;
        } else {
            summary.style.borderLeftColor = 'var(--color-error)';
            summary.innerHTML = `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <span style="color:var(--color-error);font-weight:700;font-size:18px">&#9888;</span>
                <div>
                    <div style="font-weight:600;color:var(--color-error)">${totalIssues} issue(s) found in ${affectedProgrammes} programme(s)</div>
                    <div style="font-size:13px;color:var(--color-text-secondary)">${totalProgrammes} programme(s) checked across ${results.length} field(s).</div>
                </div>
                <button class="btn btn-sm btn-secondary" style="margin-left:auto" id="unicode-close">Dismiss</button>
            </div>`;
        }
        panel.appendChild(summary);
        panel.querySelector('#unicode-close').addEventListener('click', () => { panel.style.display = 'none'; });

        if (totalIssues === 0) return;

        const issueList = document.createElement('div');
        issueList.style.cssText = 'margin-top:8px;max-height:500px;overflow-y:auto';

        const badgeForType = {
            'replacement': 'badge-orange', 'mojibake': 'badge-orange',
            'html-entity': 'badge-blue', 'invisible': 'badge-purple',
            'control': 'badge-orange', 'private-use': 'badge-gray'
        };

        results.forEach(result => {
            result.issues.forEach(issue => {
                const row = document.createElement('div');
                row.className = 'card';
                row.style.cssText = 'padding:10px 16px;margin-bottom:6px';

                const ctxRadius = 40;
                const start = Math.max(0, issue.index - ctxRadius);
                const end = Math.min(result.value.length, issue.index + issue.length + ctxRadius);
                const before = result.value.slice(start, issue.index);
                const bad = result.value.slice(issue.index, issue.index + issue.length);
                const after = result.value.slice(issue.index + issue.length, end);
                const prefix = start > 0 ? '...' : '';
                const suffix = end < result.value.length ? '...' : '';

                const isVisible = bad.trim().length > 0 && !/^[\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF\u00AD]+$/.test(bad);

                row.innerHTML = `
                    <div style="display:flex;gap:10px;align-items:start">
                        <div style="min-width:56px;text-align:center">
                            <div style="font-weight:700;color:var(--color-accent);font-size:14px">${API.escapeHtml(result.time)}</div>
                        </div>
                        <div style="flex:1;min-width:0">
                            <div style="font-weight:600;font-size:14px">${API.escapeHtml(result.title)}</div>
                            <div style="font-size:12px;color:var(--color-text-secondary);margin-top:2px">
                                Field: <code style="font-size:11px">${API.escapeHtml(result.fieldName)}</code>
                                <span class="badge ${badgeForType[issue.type] || 'badge-gray'}" style="margin-left:6px">${API.escapeHtml(issue.description)}</span>
                            </div>
                            <div style="margin-top:6px;font-size:13px;padding:6px 10px;border-radius:4px;background:var(--color-bg);font-family:'SF Mono',Monaco,'Cascadia Code',Consolas,monospace;word-break:break-word" class="unicode-ctx"></div>
                        </div>
                    </div>
                `;

                const ctx = row.querySelector('.unicode-ctx');
                if (prefix) ctx.appendChild(document.createTextNode('...'));
                ctx.appendChild(document.createTextNode(before));
                const mark = document.createElement('mark');
                mark.className = 'unicode-highlight';
                if (isVisible) {
                    mark.textContent = bad;
                } else {
                    const cp = bad.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
                    mark.innerHTML = `<span style="font-size:10px;font-style:italic">[U+${cp}]</span>`;
                }
                ctx.appendChild(mark);
                ctx.appendChild(document.createTextNode(after));
                if (suffix) ctx.appendChild(document.createTextNode('...'));

                issueList.appendChild(row);
            });
        });

        panel.appendChild(issueList);
        API.smoothScroll(panel);
    }

    function restoreListView() {
        const container = document.getElementById('content');
        if (savedListView) {
            container.innerHTML = '';
            container.appendChild(savedListView);
            savedListView = null;
            window.scrollTo(0, savedScrollY);
        } else {
            render(container);
        }
    }

    async function showProgrammeDetail(item) {
        const container = document.getElementById('content');
        const channelName = (document.getElementById('sch-channel-search') || {}).value || '';
        savedScrollY = window.scrollY;

        savedListView = document.createDocumentFragment();
        while (container.firstChild) {
            savedListView.appendChild(container.firstChild);
        }

        window.scrollTo(0, 0);

        const back = document.createElement('a');
        back.className = 'back-link';
        back.innerHTML = '&larr; Back to Schedule';
        back.addEventListener('click', () => restoreListView());
        container.appendChild(back);

        const panel = document.createElement('div');
        panel.className = 'detail-panel';
        container.appendChild(panel);

        ProgrammeDetail.render(panel, item, { channelName });

        panel.firstElementChild.after(API.jsonToggle(item, () => {
            ReviewStore.openReviewModal(item, channelName, 'schedule', currentChannelId);
        }));
    }

    return { render };
})();
