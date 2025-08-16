class QBTFileBotApp {
    constructor() {
        this.torrents = [];
        this.currentTorrent = null;
        this.suggestions = [];
        
        this.initializeElements();
        this.bindEvents();
        this.loadTorrents();
    }

    initializeElements() {
        this.refreshBtn = document.getElementById('refreshBtn');
        this.loading = document.getElementById('loading');
        this.torrentsContainer = document.getElementById('torrentsContainer');
        this.torrentsGrid = document.getElementById('torrentsGrid');
        this.modal = document.getElementById('torrentModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.torrentInfo = document.getElementById('torrentInfo');
        this.torrentFiles = document.getElementById('torrentFiles');
        this.tvShowBtn = document.getElementById('tvShowBtn');
        this.movieBtn = document.getElementById('movieBtn');
        this.suggestionsDiv = document.getElementById('suggestions');
        this.closeBtn = document.querySelector('.close');
    }

    bindEvents() {
        this.refreshBtn.addEventListener('click', () => this.loadTorrents());
        this.tvShowBtn.addEventListener('click', () => this.generateSuggestions('tv'));
        this.movieBtn.addEventListener('click', () => this.generateSuggestions('movie'));
        this.closeBtn.addEventListener('click', () => this.closeModal());
        
        window.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.closeModal();
            }
        });

        // Add keyboard navigation
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.modal.style.display === 'block') {
                this.closeModal();
            }
        });
    }

    async loadTorrents() {
        this.showLoading(true);
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            const response = await fetch('/api/torrents', {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.torrents = await response.json();
            this.renderTorrents();
        } catch (error) {
            console.error('Error loading torrents:', error);
            if (error.name === 'AbortError') {
                this.showError('Request timed out. Please check your connection and try again.');
            } else {
                this.showError(`Failed to load torrents: ${error.message}`);
            }
        } finally {
            this.showLoading(false);
        }
    }

    showLoading(show) {
        this.loading.style.display = show ? 'block' : 'none';
        this.torrentsContainer.style.display = show ? 'none' : 'block';
    }

    showError(message) {
        this.torrentsGrid.innerHTML = `
            <div class="error-message">
                <h3>Error</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">Retry</button>
            </div>
        `;
    }

    renderTorrents() {
        if (this.torrents.length === 0) {
            this.torrentsGrid.innerHTML = '<div class="no-torrents">No torrents found</div>';
            return;
        }

        this.torrentsGrid.innerHTML = this.torrents.map(torrent => `
            <div class="torrent-card" onclick="app.showTorrentDetails('${torrent.hash}')">
                <div class="torrent-name">${this.escapeHtml(torrent.name)}</div>
                <div class="torrent-details">
                    <div class="detail-item">
                        <span class="detail-label">Status</span>
                        <span class="status ${torrent.state}">${torrent.state}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Size</span>
                        <span>${this.formatBytes(torrent.size)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Category</span>
                        <span>${torrent.category || 'None'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Tags</span>
                        <span>${torrent.tags || 'None'}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    showTorrentDetails(hash) {
        this.currentTorrent = this.torrents.find(t => t.hash === hash);
        if (!this.currentTorrent) return;

        this.modalTitle.textContent = this.currentTorrent.name;
        
        // Show torrent info
        this.torrentInfo.innerHTML = `
            <div class="info-grid">
                <div><strong>Size:</strong> ${this.formatBytes(this.currentTorrent.size)}</div>
                <div><strong>Status:</strong> ${this.currentTorrent.state}</div>
                <div><strong>Category:</strong> ${this.currentTorrent.category || 'None'}</div>
                <div><strong>Tags:</strong> ${this.currentTorrent.tags || 'None'}</div>
                <div><strong>Save Path:</strong> ${this.currentTorrent.properties?.save_path || 'N/A'}</div>
                <div><strong>Progress:</strong> ${(this.currentTorrent.progress * 100).toFixed(1)}%</div>
            </div>
        `;

        // Show files
        if (this.currentTorrent.files && this.currentTorrent.files.length > 0) {
            this.torrentFiles.innerHTML = `
                <div class="file-list">
                    ${this.currentTorrent.files.map(file => `
                        <div class="file-item">
                            <div>${this.escapeHtml(file.name)}</div>
                            <div style="font-size: 11px; color: #666;">
                                ${this.formatBytes(file.size)} - ${(file.progress * 100).toFixed(1)}%
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            this.torrentFiles.innerHTML = '<p>No file information available</p>';
        }

        // Clear previous suggestions
        this.suggestionsDiv.innerHTML = '';
        this.suggestions = [];

        this.modal.style.display = 'block';
    }

    async generateSuggestions(type) {
        if (!this.currentTorrent) return;

        this.suggestionsDiv.innerHTML = '<div class="loading">Generating suggestions...</div>';

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for FileBot
            
            const response = await fetch('/api/filebot/suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    torrentHash: this.currentTorrent.hash,
                    type: type
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.suggestions = data.suggestions || [];
            this.renderSuggestions();

        } catch (error) {
            console.error('Error generating suggestions:', error);
            let errorMessage = 'Failed to generate suggestions';
            
            if (error.name === 'AbortError') {
                errorMessage = 'Request timed out. FileBot may be taking too long to process.';
            } else if (error.message) {
                errorMessage = `Failed to generate suggestions: ${error.message}`;
            }
            
            this.suggestionsDiv.innerHTML = `
                <div class="error">
                    <p>${this.escapeHtml(errorMessage)}</p>
                    <p>Make sure FileBot is properly installed and configured.</p>
                </div>
            `;
        }
    }

    renderSuggestions() {
        if (this.suggestions.length === 0) {
            this.suggestionsDiv.innerHTML = '<p>No rename suggestions generated. Files may already be properly named.</p>';
            return;
        }

        this.suggestionsDiv.innerHTML = `
            <h4>Rename Suggestions (${this.suggestions.length} files)</h4>
            <div class="suggestions-list">
                ${this.suggestions.map((suggestion) => `
                    <div class="suggestion-item">
                        <div class="suggestion-paths">
                            <div class="old-path">From: ${this.escapeHtml(suggestion.oldPath)}</div>
                            <div class="new-path">To: ${this.escapeHtml(suggestion.newPath)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="apply-rename">
                <button class="btn btn-success" onclick="app.applyRenames()">
                    Apply All Renames
                </button>
            </div>
        `;
    }

    async applyRenames() {
        if (!this.currentTorrent || this.suggestions.length === 0) return;

        const applyBtn = document.querySelector('.apply-rename button');
        if (!applyBtn) return;
        
        applyBtn.disabled = true;
        applyBtn.textContent = 'Applying...';

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            const response = await fetch('/api/torrents/rename', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    torrentHash: this.currentTorrent.hash,
                    renames: this.suggestions
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.suggestionsDiv.innerHTML = `
                    <div class="success">
                        <h4>✅ Renames Applied Successfully!</h4>
                        <p>${this.escapeHtml(result.message)}</p>
                        <button class="btn btn-primary" onclick="app.closeModal(); app.loadTorrents();">
                            Refresh Torrents
                        </button>
                    </div>
                `;
            } else {
                // Partial success
                this.suggestionsDiv.innerHTML = `
                    <div class="warning">
                        <h4>⚠️ Partial Success</h4>
                        <p>${this.escapeHtml(result.message)}</p>
                        <button class="btn btn-primary" onclick="app.closeModal(); app.loadTorrents();">
                            Refresh Torrents
                        </button>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Error applying renames:', error);
            applyBtn.disabled = false;
            applyBtn.textContent = 'Apply All Renames';
            
            let errorMessage = 'Failed to apply renames';
            if (error.name === 'AbortError') {
                errorMessage = 'Request timed out';
            } else if (error.message) {
                errorMessage = `Failed to apply renames: ${error.message}`;
            }
            
            this.suggestionsDiv.innerHTML += `
                <div class="error">
                    <p>${this.escapeHtml(errorMessage)}</p>
                </div>
            `;
        }
    }

    closeModal() {
        this.modal.style.display = 'none';
        this.currentTorrent = null;
        this.suggestions = [];
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app
const app = new QBTFileBotApp();