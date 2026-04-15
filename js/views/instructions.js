const InstructionsView = (() => {
    function render(container) {
        container.innerHTML = `
            <div class="view-header">
                <h2>Instructions</h2>
                <p>A quick guide to each section of the PA TV API Viewer.</p>
            </div>

            <div class="instructions-grid">
                <div class="instruction-card">
                    <h3><a href="#images" class="instruction-link">Image Viewer</a></h3>
                    <p>Check whether programmes have images assigned. There are two tabs:</p>
                    <ul>
                        <li><strong>Image Audit</strong> &mdash; Select one or more channels and a date range to scan for missing images. Results are grouped by programme and show which image types (episode, series, season) are present or missing.</li>
                        <li><strong>By Schedule</strong> &mdash; Pick a single channel and date to browse the schedule and see each programme's images inline.</li>
                    </ul>
                </div>

                <div class="instruction-card">
                    <h3><a href="#schedule" class="instruction-link">Schedule</a></h3>
                    <p>View the full daily schedule for any channel. Select a channel and date, then click <strong>Load Schedule</strong> to see every programme in time order. Click any programme to view its full details including synopsis, series info, and images. You can also flag programmes for review. Use the <strong>Check Unicode</strong> button to scan all programme text fields for encoding errors such as mojibake, unresolved HTML entities, invisible characters, and control characters.</p>
                </div>

                <div class="instruction-card">
                    <h3><a href="#epg" class="instruction-link">EPG Numbers</a></h3>
                    <p>Look up EPG (Electronic Programme Guide) channel numbers. There are three tabs:</p>
                    <ul>
                        <li><strong>EPG Numbers</strong> &mdash; Select a platform to see all its channels sorted by EPG number. Filter by region and download the list as CSV.</li>
                        <li><strong>Variations</strong> &mdash; Compare how EPG numbers differ across regions within a platform.</li>
                        <li><strong>Channel Lookup</strong> &mdash; Search for specific channels to see their EPG numbers across all platforms at once.</li>
                    </ul>
                </div>

                <div class="instruction-card">
                    <h3><a href="#channels" class="instruction-link">Channels</a></h3>
                    <p>Browse the full list of TV and radio channels. Use the search box to filter by name, or narrow results by platform and region. Click any channel to see its full details including logos, metadata, and subject codes. You can also download the channel list as an Excel file split into TV and Radio sheets.</p>
                </div>

                <div class="instruction-card">
                    <h3><a href="#platforms" class="instruction-link">Platforms</a></h3>
                    <p>See all available TV platforms (e.g. Freeview, Sky, Virgin). Click a platform to view its regions and the channels available in each region.</p>
                </div>

                <div class="instruction-card">
                    <h3><a href="#logos" class="instruction-link">Logos</a></h3>
                    <p>Browse channel logos. Search for a specific channel to see its logo, or click <strong>Load All Logos</strong> to view every channel logo in a grid. Useful for quickly checking which channels have logos available.</p>
                </div>

                <div class="instruction-card">
                    <h3><a href="#review" class="instruction-link">Review List</a></h3>
                    <p>A shared list of programmes flagged for review. Programmes can be added from the Schedule and Image Viewer sections. Use the filter buttons to show all items or just those being checked. The list can be downloaded as an Excel file or cleared entirely.</p>
                </div>

                <div class="instruction-card instruction-card-muted">
                    <h3>Settings</h3>
                    <p>Click the <strong>Settings</strong> button in the top-right corner to configure your PA API key, optional GitHub token (for saving shared channel lists), and theme preference (light, dark, or system default).</p>
                </div>
            </div>
        `;

        // Make instruction links navigate within the app
        container.querySelectorAll('.instruction-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const hash = link.getAttribute('href').slice(1);
                window.location.hash = hash;
            });
        });
    }

    return { render };
})();
