const App = (() => {
    const views = {
        platforms: PlatformsView,
        channels: ChannelsView,
        schedule: ScheduleView,
        assets: AssetsView,
        contributors: ContributorsView,
        features: FeaturesView,
        catalogues: CataloguesView
    };

    let currentView = null;

    function init() {
        setupApiKeyModal();
        setupNavigation();

        // Show API key modal if no key set
        if (!API.hasApiKey()) {
            openApiKeyModal(true);
        } else {
            updateKeyStatus();
        }

        // Navigate from hash or default to platforms
        const hash = window.location.hash.slice(1) || 'platforms';
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
            modal.classList.remove('open');
            updateKeyStatus();
            API.toast('API key saved.', 'success');
            // Reload current view
            if (currentView) navigateTo(currentView);
        });

        cancelBtn.addEventListener('click', () => {
            if (API.hasApiKey()) {
                modal.classList.remove('open');
            } else {
                API.toast('An API key is required to use this tool.', 'warning');
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') saveBtn.click();
        });
    }

    function openApiKeyModal(firstTime) {
        const modal = document.getElementById('api-key-modal');
        const input = document.getElementById('api-key-input');
        const cancelBtn = document.getElementById('api-key-cancel');
        input.value = API.getApiKey();
        cancelBtn.style.display = firstTime && !API.hasApiKey() ? 'none' : '';
        modal.classList.add('open');
        setTimeout(() => input.focus(), 100);
    }

    function updateKeyStatus() {
        const el = document.getElementById('api-key-status');
        if (API.hasApiKey()) {
            el.textContent = 'Key configured';
            el.className = 'key-status connected';
        } else {
            el.textContent = 'No key';
            el.className = 'key-status disconnected';
        }
    }

    document.addEventListener('DOMContentLoaded', init);

    return { navigateTo };
})();
