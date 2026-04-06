const App = (() => {
    const views = {
        platforms: PlatformsView,
        channels: ChannelsView,
        epg: EpgView,
        schedule: ScheduleView,
        images: ImagesView,
        logos: LogosView,
        review: ReviewView
    };

    let currentView = null;

    function init() {
        applyTheme();
        setupApiKeyModal();
        setupNavigation();

        // Show API key modal if no key set
        if (!API.hasApiKey()) {
            openApiKeyModal(true);
        } else {
            updateKeyStatus();
        }

        ReviewStore.init();

        // Navigate from hash or default to platforms
        const hash = window.location.hash.slice(1) || 'images';
        navigateTo(hash);
    }

    function setupNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.dataset.view;
                window.location.hash = view;
                navigateTo(view);
            });
        });

        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1);
            if (hash && views[hash]) {
                navigateTo(hash);
            }
        });
    }

    function navigateTo(viewName) {
        if (!views[viewName]) return;

        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewName);
        });

        const content = document.getElementById('content');
        content.innerHTML = '';
        currentView = viewName;
        views[viewName].render(content);
    }

    function setupApiKeyModal() {
        const modal = document.getElementById('api-key-modal');
        const input = document.getElementById('api-key-input');
        const saveBtn = document.getElementById('api-key-save');
        const cancelBtn = document.getElementById('api-key-cancel');
        const headerBtn = document.getElementById('api-key-btn');

        headerBtn.addEventListener('click', () => openApiKeyModal(false));

        saveBtn.addEventListener('click', () => {
            const key = input.value.trim();
            if (!key) {
                API.toast('Please enter an API key.', 'warning');
                return;
            }
            API.setApiKey(key);

            // Save GitHub token (may be empty — that's fine)
            const ghToken = document.getElementById('github-token-input').value.trim();
            GitHubStorage.setToken(ghToken);

            // Save theme preference
            const theme = document.getElementById('theme-select').value;
            localStorage.setItem('pa_theme_preference', theme);
            applyTheme();

            closeApiKeyModal();
            updateKeyStatus();
            API.toast('Settings saved.', 'success');
            // Reload current view
            if (currentView) navigateTo(currentView);
        });

        cancelBtn.addEventListener('click', () => {
            if (API.hasApiKey()) {
                closeApiKeyModal();
            } else {
                API.toast('An API key is required to use this tool.', 'warning');
            }
        });

        document.addEventListener('keydown', trapFocus);

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') saveBtn.click();
        });
    }

    let _modalTrigger = null;

    function openApiKeyModal(firstTime) {
        const modal = document.getElementById('api-key-modal');
        const input = document.getElementById('api-key-input');
        const ghInput = document.getElementById('github-token-input');
        const cancelBtn = document.getElementById('api-key-cancel');
        _modalTrigger = document.activeElement;
        input.value = API.getApiKey();
        ghInput.value = GitHubStorage.getToken();
        document.getElementById('theme-select').value = localStorage.getItem('pa_theme_preference') || 'system';
        cancelBtn.style.display = firstTime && !API.hasApiKey() ? 'none' : '';
        modal.classList.add('open');
        setTimeout(() => input.focus(), 100);
    }

    function closeApiKeyModal() {
        const modal = document.getElementById('api-key-modal');
        modal.classList.remove('open');
        if (_modalTrigger && _modalTrigger.focus) {
            _modalTrigger.focus();
            _modalTrigger = null;
        }
    }

    function trapFocus(e) {
        const modal = document.getElementById('api-key-modal');
        if (!modal.classList.contains('open')) return;
        if (e.key === 'Escape') {
            if (API.hasApiKey()) closeApiKeyModal();
            return;
        }
        if (e.key !== 'Tab') return;
        const focusable = modal.querySelectorAll('input, button, a, [tabindex]:not([tabindex="-1"])');
        const visible = Array.from(focusable).filter(el => el.offsetParent !== null);
        if (visible.length === 0) return;
        const first = visible[0];
        const last = visible[visible.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    function applyTheme() {
        const pref = localStorage.getItem('pa_theme_preference') || 'system';
        if (pref === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else if (pref === 'light') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (dark) {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        }
    }

    // Listen for system theme changes (registered once)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if ((localStorage.getItem('pa_theme_preference') || 'system') === 'system') {
            applyTheme();
        }
    });

    function updateKeyStatus() {
        const el = document.getElementById('api-key-status');
        if (API.hasApiKey()) {
            const ghStatus = GitHubStorage.hasToken() ? ' | GitHub connected' : '';
            el.textContent = 'Key configured' + ghStatus;
            el.className = 'key-status connected';
        } else {
            el.textContent = 'No key';
            el.className = 'key-status disconnected';
        }
    }

    document.addEventListener('DOMContentLoaded', init);

    return { navigateTo };
})();
