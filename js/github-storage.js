const GitHubStorage = (() => {
    const OWNER = 'nickyleech';
    const REPO = 'API-Viewer';
    const FILE_PATH = 'data/channel-lists.json';
    const REVIEW_FILE_PATH = 'data/review-items.json';
    const API_BASE = 'https://api.github.com';
    const TOKEN_KEY = 'pa_github_token';

    let currentSha = null;
    let reviewSha = null;

    // --- Token management ---

    function getToken() {
        return localStorage.getItem(TOKEN_KEY) || '';
    }

    function setToken(token) {
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
        } else {
            localStorage.removeItem(TOKEN_KEY);
        }
    }

    function hasToken() {
        return !!getToken();
    }

    function removeToken() {
        localStorage.removeItem(TOKEN_KEY);
    }

    // --- GitHub Contents API (generic helpers) ---

    async function _readFile(filePath) {
        const url = `${API_BASE}/repos/${OWNER}/${REPO}/contents/${filePath}`;
        const headers = { 'Accept': 'application/vnd.github.v3+json' };
        const token = getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, { headers });

        if (response.status === 404) {
            return { content: null, sha: null };
        }

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Decode base64 content (GitHub inserts newlines every 60 chars)
        const raw = atob(data.content.replace(/\n/g, ''));
        const content = decodeURIComponent(escape(raw));
        return { content: JSON.parse(content), sha: data.sha };
    }

    async function _writeFile(filePath, sha, data, message) {
        const token = getToken();
        if (!token) {
            throw new Error('GitHub token required to save data.');
        }

        const url = `${API_BASE}/repos/${OWNER}/${REPO}/contents/${filePath}`;
        const jsonStr = JSON.stringify(data, null, 2);
        const content = btoa(unescape(encodeURIComponent(jsonStr)));

        const body = {
            message: message || 'Update data',
            content: content
        };

        if (sha) {
            body.sha = sha;
        }

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (response.status === 409) {
            throw new Error('Conflict: the file was modified elsewhere. Please reload and try again.');
        }

        if (response.status === 401 || response.status === 403) {
            throw new Error('Invalid or expired GitHub token. Please update your token in Settings.');
        }

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        return result.content.sha;
    }

    // --- Channel Lists API ---

    async function loadLists() {
        const { content, sha } = await _readFile(FILE_PATH);
        currentSha = sha;
        if (!content || !content.lists) {
            return [];
        }
        return content.lists;
    }

    async function saveLists(lists, commitMessage) {
        const data = { version: 1, lists: lists };
        currentSha = await _writeFile(FILE_PATH, currentSha, data, commitMessage);
    }

    // --- Review Items API ---

    async function loadReviewItems() {
        const { content, sha } = await _readFile(REVIEW_FILE_PATH);
        reviewSha = sha;
        if (!content || !content.items) {
            return [];
        }
        return content.items;
    }

    async function saveReviewItems(items, commitMessage) {
        const data = { version: 1, items: items };
        reviewSha = await _writeFile(REVIEW_FILE_PATH, reviewSha, data, commitMessage);
    }

    return {
        getToken, setToken, hasToken, removeToken,
        loadLists, saveLists,
        loadReviewItems, saveReviewItems
    };
})();
