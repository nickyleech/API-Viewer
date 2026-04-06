const ChannelDropdown = (() => {
    /**
     * Initialize a channel search dropdown.
     *
     * @param {Object}   config
     * @param {string}   config.inputId      - Text input element ID
     * @param {string}   config.dropdownId   - Dropdown container element ID
     * @param {string}   [config.hiddenId]   - Hidden input element ID (single-select mode)
     * @param {Function} config.getChannels  - () => channel array
     * @param {Function} [config.onSelect]   - Called with the selected channel object
     * @param {Function} [config.filterFn]   - Extra filter predicate (e.g., exclude already-selected)
     * @param {number}   [config.maxResults=50]
     * @param {number}   [config.debounceMs=150]
     */
    function init(config) {
        const input = document.getElementById(config.inputId);
        const dropdown = document.getElementById(config.dropdownId);
        const hidden = config.hiddenId ? document.getElementById(config.hiddenId) : null;
        const maxResults = config.maxResults || 50;
        const debounceMs = config.debounceMs || 150;
        let highlightIdx = -1;
        let debounceTimer = null;

        input.setAttribute('role', 'combobox');
        input.setAttribute('aria-expanded', 'false');
        input.setAttribute('aria-autocomplete', 'list');
        input.setAttribute('aria-controls', config.dropdownId);
        dropdown.setAttribute('role', 'listbox');

        input.addEventListener('focus', () => input.select());

        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => showDropdown(), debounceMs);
        });

        input.addEventListener('keydown', (e) => {
            const items = dropdown.querySelectorAll('.dropdown-item');
            if (items.length === 0 || dropdown.style.display === 'none') {
                if (e.key === 'Escape') { dropdown.style.display = 'none'; input.setAttribute('aria-expanded', 'false'); }
                return;
            }

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                highlightIdx = Math.min(highlightIdx + 1, items.length - 1);
                updateHighlight(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                highlightIdx = Math.max(highlightIdx - 1, 0);
                updateHighlight(items);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (highlightIdx >= 0 && highlightIdx < items.length) {
                    items[highlightIdx].click();
                }
            } else if (e.key === 'Escape') {
                dropdown.style.display = 'none';
                input.setAttribute('aria-expanded', 'false');
                highlightIdx = -1;
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest(`#${config.inputId}`) && !e.target.closest(`#${config.dropdownId}`)) {
                dropdown.style.display = 'none';
                input.setAttribute('aria-expanded', 'false');
                highlightIdx = -1;
            }
        });

        function updateHighlight(items) {
            items.forEach((el, i) => {
                const active = i === highlightIdx;
                el.classList.toggle('highlighted', active);
                if (active) {
                    el.setAttribute('aria-selected', 'true');
                    input.setAttribute('aria-activedescendant', el.id);
                    el.scrollIntoView({ block: 'nearest' });
                } else {
                    el.removeAttribute('aria-selected');
                }
            });
        }

        function showDropdown() {
            const channels = config.getChannels();
            const query = (input.value || '').toLowerCase().trim();
            highlightIdx = -1;

            if (channels.length === 0) {
                dropdown.innerHTML = '<div class="dropdown-empty">Loading channels...</div>';
                dropdown.style.display = 'block';
                input.setAttribute('aria-expanded', 'true');
                return;
            }

            if (!query) {
                dropdown.style.display = 'none';
                input.setAttribute('aria-expanded', 'false');
                return;
            }

            let filtered = channels.filter(ch => (ch.title || '').toLowerCase().includes(query));
            if (config.filterFn) {
                filtered = filtered.filter(config.filterFn);
            }

            if (filtered.length === 0) {
                dropdown.innerHTML = '<div class="dropdown-empty">No channels found</div>';
                dropdown.style.display = 'block';
                input.setAttribute('aria-expanded', 'true');
                return;
            }

            dropdown.innerHTML = '';
            filtered.slice(0, maxResults).forEach((ch, i) => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.id = `${config.dropdownId}-opt-${i}`;
                item.setAttribute('role', 'option');
                item.innerHTML = `<strong>${API.escapeHtml(ch.title)}</strong><span class="dropdown-id">${API.escapeHtml(ch.id)}</span>`;
                item.addEventListener('click', () => {
                    if (hidden) {
                        input.value = ch.title;
                        hidden.value = ch.id;
                    } else {
                        input.value = '';
                    }
                    dropdown.style.display = 'none';
                    input.setAttribute('aria-expanded', 'false');
                    highlightIdx = -1;
                    if (config.onSelect) config.onSelect(ch);
                    if (!hidden) input.focus();
                });
                dropdown.appendChild(item);
            });

            if (filtered.length > maxResults) {
                const more = document.createElement('div');
                more.className = 'dropdown-empty';
                more.textContent = `${filtered.length - maxResults} more \u2014 keep typing to narrow results`;
                dropdown.appendChild(more);
            }

            dropdown.style.display = 'block';
            input.setAttribute('aria-expanded', 'true');
        }

        return { refresh: showDropdown };
    }

    return { init };
})();
