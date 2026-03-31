const GitHubStorage = (() => {
    const OWNER = 'nickyleech';
    const REPO = 'API-Viewer';
    const FILE_PATH = 'data/channel-lists.json';
    const API_BASE = 'https://api.github.com';
    const TOKEN_KEY = 'pa_github_token';

    let currentSha = null;

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

    // --- GitHub Contents API ---

    async function readFile() {
        const url = `${API_BASE}/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;
        const headers = { 'Accept': 'application/vnd.github.v3+json' };
        const token = getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, { headers });

        if (response.status === 404) {
            currentSha = null;
            return null;
        }

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        currentSha = data.sha;

        // Decode base64 content (GitHub inserts newlines every 60 chars)
        const raw = atob(data.content.replace(/\n/g, ''));
        const content = decodeURIComponent(escape(raw));
        return JSON.parse(content);
    }

    async function writeFile(data, message) {
        const token = getToken();
        if (!token) {
            throw new Error('GitHub token required to save channel lists.');
        }

        const url = `${API_BASE}/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;
        const jsonStr = JSON.stringify(data, null, 2);
        const content = btoa(unescape(encodeURIComponent(jsonStr)));

        const body = {
            message: message || 'Update channel lists',
            content: content
        };

        if (currentSha) {
            body.sha = currentSha;
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
        currentSha = result.content.sha;
        return result;
    }

    // --- High-level API ---

    async function loadLists() {
        const data = await readFile();
        if (!data || !data.lists) {
            return [];
        }
        return data.lists;
    }

    async function saveLists(lists, commitMessage) {
        const data = { version: 1, lists: lists };
        await writeFile(data, commitMessage);
    }

    return {
        getToken, setToken, hasToken, removeToken,
        loadLists, saveLists
    };
})();
