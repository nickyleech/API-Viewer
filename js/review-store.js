const ReviewStore = (() => {
    const STORAGE_KEY = 'pa_review_items';

    function _load() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch (e) { return []; }
    }

    function _save(items) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }

    function getAll() {
        return _load();
    }

    function getCount() {
        return _load().length;
    }

    function has(scheduleId) {
        return _load().some(item => item.id === scheduleId);
    }

    function add(reviewItem) {
        const items = _load();
        items.unshift(reviewItem);
        _save(items);
        updateBadge();
    }

    function remove(id) {
        const items = _load().filter(item => item.id !== id);
        _save(items);
        updateBadge();
    }

    function toggleChecking(id) {
        const items = _load();
        const item = items.find(i => i.id === id);
        if (item) {
            item.checking = !item.checking;
            _save(items);
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

    function openReviewModal(item, channelName, source) {
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

    return { getAll, getCount, has, add, remove, toggleChecking, updateBadge, openReviewModal };
})();
