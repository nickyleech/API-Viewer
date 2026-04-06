const ReviewStore = (() => {
    const STORAGE_KEY = 'pa_review_items';
    let _items = null; // in-memory cache, null means not yet loaded

    // --- localStorage helpers ---

    function _loadLocal() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch (e) { return []; }
    }

    function _saveLocal(items) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch (e) { /* not critical if GitHub works */ }
    }

    // --- Async init: load from GitHub, fallback to localStorage ---

    async function init() {
        try {
            const ghItems = await GitHubStorage.loadReviewItems();
            _items = ghItems;

            // Migrate: if localStorage has data but GitHub was empty, push it up
            const localData = _loadLocal();
            if (localData.length > 0 && _items.length === 0) {
                _items = localData;
                if (GitHubStorage.hasToken()) {
                    await GitHubStorage.saveReviewItems(_items, 'Migrate review items from localStorage');
                }
            }

            _saveLocal(_items);
        } catch (err) {
            console.warn('GitHub storage unavailable for review items, using localStorage:', err.message);
            _items = _loadLocal();
        }
        updateBadge();
    }

    // --- Persist to both localStorage and GitHub ---

    async function _persist(commitMessage) {
        _saveLocal(_items);
        updateBadge();

        if (GitHubStorage.hasToken()) {
            try {
                await GitHubStorage.saveReviewItems(_items, commitMessage || 'Update review items');
            } catch (err) {
                API.toast('Failed to save review list to GitHub: ' + err.message, 'error');
            }
        }
    }

    // --- Public API ---

    function getAll() {
        if (_items === null) _items = _loadLocal();
        return _items.slice();
    }

    function getCount() {
        if (_items === null) _items = _loadLocal();
        return _items.length;
    }

    function has(scheduleId) {
        if (_items === null) _items = _loadLocal();
        return _items.some(item => item.id === scheduleId);
    }

    function add(reviewItem) {
        if (_items === null) _items = _loadLocal();
        _items.unshift(reviewItem);
        _persist('Add review item: ' + (reviewItem.title || 'Untitled')).catch(() => {});
    }

    function remove(id) {
        if (_items === null) _items = _loadLocal();
        _items = _items.filter(item => item.id !== id);
        _persist('Remove review item').catch(() => {});
    }

    function toggleChecking(id) {
        if (_items === null) _items = _loadLocal();
        const item = _items.find(i => i.id === id);
        if (item) {
            item.checking = !item.checking;
            _persist('Toggle review item status').catch(() => {});
        }
        return item;
    }

    function updateBadge() {
        const badge = document.getElementById('review-badge');
        if (!badge) return;
        const count = getCount();
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }

    function openReviewModal(item, channelName, source, channelId) {
        if (has(item.id)) {
            API.toast('This programme is already marked for review.', 'warning');
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay open';

        const modal = document.createElement('div');
        modal.className = 'modal';

        const title = item.title || 'Untitled';
        modal.innerHTML = `
            <h2>Mark for Review</h2>
            <div class="modal-section">
                <label class="modal-label">Programme</label>
                <p style="margin-bottom:0"><strong>${API.escapeHtml(title)}</strong></p>
            </div>
            <div class="modal-section">
                <label class="modal-label">Note <span class="modal-optional">(optional)</span></label>
                <textarea class="review-textarea" placeholder="e.g. billing needs updating, image needs updating..."></textarea>
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary review-modal-cancel">Cancel</button>
                <button class="btn btn-primary review-modal-save">Save</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const textarea = modal.querySelector('.review-textarea');
        const saveBtn = modal.querySelector('.review-modal-save');
        const cancelBtn = modal.querySelector('.review-modal-cancel');

        setTimeout(() => textarea.focus(), 100);

        function closeModal() {
            overlay.remove();
        }

        saveBtn.addEventListener('click', () => {
            const note = textarea.value.trim();
            const asset = item.asset || {};
            add({
                id: item.id,
                title: title,
                note: note,
                channel: channelName || '',
                channelId: channelId || '',
                dateTime: item.dateTime || '',
                assetId: asset.id || '',
                source: source || '',
                addedAt: new Date().toISOString(),
                checking: false
            });
            closeModal();
            API.toast('Programme marked for review.', 'success');
        });

        cancelBtn.addEventListener('click', closeModal);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                saveBtn.click();
            }
        });
    }

    return { init, getAll, getCount, has, add, remove, toggleChecking, updateBadge, openReviewModal };
})();
