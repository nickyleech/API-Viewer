const API = (() => {
    const BASE_URL = 'https://tv.api.pressassociation.io/v2';

    function getApiKey() {
        return localStorage.getItem('pa_api_key') || '';
    }

    function setApiKey(key) {
        localStorage.setItem('pa_api_key', key);
    }

    function removeApiKey() {
        localStorage.removeItem('pa_api_key');
    }

    function hasApiKey() {
        return !!getApiKey();
    }

    async function apiFetch(path, params = {}, opts = {}) {
        const key = getApiKey();
        if (!key) {
            throw new ApiError('No API key configured. Please set your API key.', 401);
        }

        // Build query string
        const filtered = Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined);
        const qs = filtered.length ? '?' + new URLSearchParams(filtered).toString() : '';
        const url = `${BASE_URL}${path}${qs}`;

        const fetchOpts = { headers: { 'apikey': key } };
        if (opts.signal) fetchOpts.signal = opts.signal;

        let response;
        try {
            response = await fetch(url, fetchOpts);
        } catch (err) {
            if (err.name === 'AbortError') throw err;
            throw new ApiError('Network error. Please check your connection.', 0);
        }

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new ApiError('Invalid or expired API key. Please update your key.', response.status);
            }
            if (response.status === 404) {
                throw new ApiError('Resource not found.', 404);
            }
            throw new ApiError(`API error: ${response.status} ${response.statusText}`, response.status);
        }

        const data = await response.json();
        return data;
    }

    // AbortController helper: cancels any previous request for the same key
    const _controllers = {};
    function cancelable(key) {
        if (_controllers[key]) _controllers[key].abort();
        _controllers[key] = new AbortController();
        return _controllers[key].signal;
    }

    // Debounce utility
    function debounce(fn, ms) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), ms);
        };
    }

    // Smooth scroll that respects prefers-reduced-motion
    function smoothScroll(el, options = {}) {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({
            block: 'start',
            ...options,
            behavior: prefersReducedMotion ? 'auto' : 'smooth'
        });
    }

    class ApiError extends Error {
        constructor(message, status) {
            super(message);
            this.name = 'ApiError';
            this.status = status;
        }
    }

    // Helper to render a JSON toggle
    function jsonToggle(data, onMarkReview) {
        const wrapper = document.createElement('div');
        wrapper.className = 'json-toggle';
        const jsonStr = JSON.stringify(data, null, 2);

        const btnGroup = document.createElement('div');
        btnGroup.className = 'json-toggle-buttons';

        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-secondary';
        btn.textContent = 'Show JSON';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-sm btn-secondary';
        copyBtn.textContent = 'Copy JSON';
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(jsonStr).then(() => {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => { copyBtn.textContent = 'Copy JSON'; }, 1500);
            });
        });

        const viewer = document.createElement('pre');
        viewer.className = 'json-viewer';
        viewer.textContent = jsonStr;
        btn.addEventListener('click', () => {
            viewer.classList.toggle('open');
            btn.textContent = viewer.classList.contains('open') ? 'Hide JSON' : 'Show JSON';
        });

        btnGroup.appendChild(btn);
        btnGroup.appendChild(copyBtn);

        if (typeof onMarkReview === 'function') {
            const reviewBtn = document.createElement('button');
            reviewBtn.className = 'btn btn-sm btn-review';
            reviewBtn.textContent = 'Mark for Review';
            reviewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                onMarkReview();
            });
            btnGroup.appendChild(reviewBtn);
        }

        wrapper.appendChild(btnGroup);
        wrapper.appendChild(viewer);
        return wrapper;
    }

    // Helper to show loading spinner
    function showLoading(container) {
        container.innerHTML = '<div class="spinner">Loading...</div>';
    }

    // Helper to show error
    function showError(container, message) {
        container.innerHTML = `<div class="error-msg">${escapeHtml(message)}</div>`;
    }

    // Helper to show empty state
    function showEmpty(container, message) {
        container.innerHTML = `<div class="empty-state"><p>${escapeHtml(message)}</p></div>`;
    }

    // Escape HTML
    function escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    // Extract rendition images from a media array
    // Handles rendition as keyed object {"default":{...},"16x9":{...}} or array [{...}]
    function extractImages(mediaArr) {
        if (!mediaArr) return [];
        const list = Array.isArray(mediaArr) ? mediaArr : [mediaArr];
        const images = [];
        list.forEach(m => {
            if (!m || !m.rendition) return;
            const rend = m.rendition;
            if (Array.isArray(rend)) {
                rend.forEach(r => { if (r && r.href) images.push({ ...r, copyright: m.copyright || '' }); });
            } else if (typeof rend === 'object') {
                // Keyed object: { "default": {href,...}, "16x9": {href,...} }
                Object.entries(rend).forEach(([key, r]) => {
                    if (r && r.href) images.push({ ...r, label: key, copyright: m.copyright || '' });
                });
            }
        });
        return images;
    }

    // Toast notification (accessible)
    function toast(message, type = 'error') {
        const container = document.getElementById('toast-container');
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.setAttribute('role', 'alert');
        el.setAttribute('aria-live', 'assertive');
        el.textContent = message;
        container.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }

    return {
        getApiKey, setApiKey, removeApiKey, hasApiKey,
        fetch: apiFetch, cancelable, debounce, smoothScroll,
        jsonToggle, showLoading, showError, showEmpty,
        escapeHtml, toast, extractImages, ApiError
    };
})();
