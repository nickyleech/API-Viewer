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
        container.firstElementChild.after(jsonToggle);
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
