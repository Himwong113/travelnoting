// Travel Planner App
class TravelPlanner {
    constructor() {
        this.currentDay = 1;
        this.data = {};
        this.editingId = null;
        this.startDate = null;
        
        this.init();
    }

    init() {
        this.loadStartDate();
        this.loadAllData();
        this.renderDayButtons();
        this.bindEvents();
        this.renderCheckpoints();
    }

    // Load start date from localStorage
    loadStartDate() {
        const stored = localStorage.getItem('travelStartDate');
        if (stored) {
            this.startDate = new Date(stored);
        } else {
            // Default to today
            this.startDate = new Date();
        }
        document.getElementById('start-day').value = this.formatDateForInput(this.startDate);
    }

    // Format date for input[type="date"]
    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Format date for display (e.g., "Mar 1")
    formatDateForDisplay(date) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}`;
    }

    // Get date for a specific day number
    getDateForDay(dayNum) {
        const date = new Date(this.startDate);
        date.setDate(date.getDate() + (dayNum - 1));
        return date;
    }

    // Render day buttons with dates
    renderDayButtons() {
        const nav = document.getElementById('day-nav');
        nav.innerHTML = '';
        
        for (let day = 1; day <= 8; day++) {
            const date = this.getDateForDay(day);
            const btn = document.createElement('button');
            btn.className = `day-btn${day === this.currentDay ? ' active' : ''}`;
            btn.dataset.day = day;
            btn.innerHTML = `<span class="day-label">Day ${day}</span><span class="day-date">${this.formatDateForDisplay(date)}</span>`;
            nav.appendChild(btn);
        }

        // Re-bind day button events
        document.querySelectorAll('.day-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.closest('.day-btn');
                this.switchDay(parseInt(target.dataset.day));
            });
        });
    }

    // Load data from localStorage (simulating JSON files)
    loadAllData() {
        for (let day = 1; day <= 8; day++) {
            const stored = localStorage.getItem(`day${day}`);
            if (stored) {
                this.data[day] = JSON.parse(stored);
            } else {
                // Initialize with empty array or load from JSON file
                this.data[day] = { checkpoints: [] };
            }
            // Always try to load from JSON file on startup
            this.loadFromJSON(day);
        }
    }

    // Load data from JSON file (works for both server and static hosting)
    async loadFromJSON(day) {
        try {
            // First try API (local development with server)
            let response;
            try {
                response = await fetch(`/api/load/day${day}`);
            } catch (e) {
                response = { ok: false };
            }
            
            // If API fails, try loading static JSON file directly (GitHub Pages)
            if (!response.ok) {
                response = await fetch(`data/day${day}.json`);
            }
            
            if (response.ok) {
                const jsonData = await response.json();
                
                // Check version/timestamp to decide which data to use
                const stored = localStorage.getItem(`day${day}`);
                const storedData = stored ? JSON.parse(stored) : null;
                const jsonVersion = localStorage.getItem(`day${day}_jsonVersion`);
                
                // Calculate a simple hash of JSON checkpoints for version comparison
                const jsonHash = JSON.stringify(jsonData.checkpoints || []);
                
                // Load from JSON if:
                // 1. localStorage is empty, OR
                // 2. JSON file has changed since last sync (new deployment)
                if (!storedData || !storedData.checkpoints || jsonVersion !== jsonHash) {
                    if (jsonData.checkpoints && jsonData.checkpoints.length > 0) {
                        this.data[day] = jsonData;
                        this.saveToLocalStorage(day);
                        localStorage.setItem(`day${day}_jsonVersion`, jsonHash);
                        console.log(`✅ Day ${day} synced from JSON file`);
                    }
                }
                
                if (day === this.currentDay) {
                    this.renderCheckpoints();
                }
            }
        } catch (error) {
            console.log(`Could not load JSON for day ${day}, using localStorage`);
        }
    }

    // Force sync from cloud/JSON files (overwrites localStorage)
    async syncFromCloud() {
        const confirmSync = confirm(
            'This will reload data from the repository and overwrite any local changes.\n\n' +
            'Continue?'
        );
        
        if (!confirmSync) return;

        try {
            for (let day = 1; day <= 8; day++) {
                let response;
                try {
                    response = await fetch(`/api/load/day${day}`);
                } catch (e) {
                    response = { ok: false };
                }
                
                if (!response.ok) {
                    response = await fetch(`data/day${day}.json`);
                }
                
                if (response.ok) {
                    const jsonData = await response.json();
                    this.data[day] = jsonData;
                    this.saveToLocalStorage(day);
                    
                    // Update version hash
                    const jsonHash = JSON.stringify(jsonData.checkpoints || []);
                    localStorage.setItem(`day${day}_jsonVersion`, jsonHash);
                }
            }
            
            this.renderCheckpoints();
            alert('✅ Data synced successfully from repository!');
        } catch (error) {
            alert('❌ Failed to sync data: ' + error.message);
        }
    }

    // Save to localStorage and JSON file
    saveToLocalStorage(day) {
        localStorage.setItem(`day${day}`, JSON.stringify(this.data[day]));
    }

    // Save to JSON file via API
    async saveToJSON(day) {
        const date = this.getDateForDay(day);
        const dateStr = this.formatDateForInput(date);
        
        const saveData = {
            day: day,
            date: dateStr,
            checkpoints: this.data[day].checkpoints || []
        };

        try {
            const response = await fetch(`/api/save/day${day}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(saveData, null, 2)
            });
            
            if (response.ok) {
                console.log(`✅ Day ${day} saved to JSON file`);
            } else {
                console.log(`ℹ️ Server not available, data saved to localStorage only`);
            }
        } catch (error) {
            // Server not available (e.g., GitHub Pages), just use localStorage
            console.log(`ℹ️ Running in static mode, data saved to localStorage only`);
        }
    }

    // Export current day data as JSON
    exportToJSON(day) {
        const data = this.data[day];
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `day${day}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Bind all event listeners
    bindEvents() {
        // Start date selector
        document.getElementById('start-day').addEventListener('change', (e) => {
            this.startDate = new Date(e.target.value);
            localStorage.setItem('travelStartDate', e.target.value);
            this.renderDayButtons();
            this.updateDayTitle();
        });

        // Add checkpoint button
        document.getElementById('add-checkpoint').addEventListener('click', () => {
            this.openModal();
        });

        // Sync data button
        document.getElementById('sync-data').addEventListener('click', () => {
            this.syncFromCloud();
        });

        // Export JSON button
        document.getElementById('export-json').addEventListener('click', () => {
            this.exportCurrentDayToJSON();
        });

        // Import JSON button
        document.getElementById('import-json').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });

        // File input change
        document.getElementById('file-input').addEventListener('change', (e) => {
            this.importJSON(e);
        });

        // Form submission
        document.getElementById('checkpoint-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCheckpoint();
        });

        // Cancel button
        document.getElementById('cancel-btn').addEventListener('click', () => {
            this.closeModal();
        });

        // Close modal when clicking outside
        document.getElementById('checkpoint-modal').addEventListener('click', (e) => {
            if (e.target.id === 'checkpoint-modal') {
                this.closeModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    // Export current day data to JSON file
    exportCurrentDayToJSON() {
        const data = this.data[this.currentDay];
        const date = this.getDateForDay(this.currentDay);
        const dateStr = this.formatDateForInput(date);
        
        const exportData = {
            day: this.currentDay,
            date: dateStr,
            checkpoints: data.checkpoints || []
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `day${this.currentDay}_${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Import JSON file
    importJSON(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                if (importedData.checkpoints && Array.isArray(importedData.checkpoints)) {
                    // Ask user whether to replace or merge
                    const action = confirm(
                        `Import ${importedData.checkpoints.length} checkpoints to Day ${this.currentDay}?\n\n` +
                        `OK = Replace existing data\n` +
                        `Cancel = Keep existing and skip import`
                    );
                    
                    if (action) {
                        this.data[this.currentDay] = {
                            checkpoints: importedData.checkpoints
                        };
                        this.saveToLocalStorage(this.currentDay);
                        this.saveToJSON(this.currentDay); // Save to JSON file
                        this.renderCheckpoints();
                        alert('Data imported successfully!');
                    }
                } else {
                    alert('Invalid JSON format. Expected { "checkpoints": [...] }');
                }
            } catch (error) {
                alert('Error reading JSON file: ' + error.message);
            }
        };
        reader.readAsText(file);
        
        // Reset file input
        event.target.value = '';
    }

    // Switch between days
    switchDay(day) {
        this.currentDay = day;
        
        // Update active button
        document.querySelectorAll('.day-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.day) === day) {
                btn.classList.add('active');
            }
        });

        // Update title
        this.updateDayTitle();
        
        // Render checkpoints for selected day
        this.renderCheckpoints();
    }

    // Update the day title with date
    updateDayTitle() {
        const date = this.getDateForDay(this.currentDay);
        const dateStr = this.formatDateForDisplay(date);
        document.getElementById('day-title').textContent = `Day ${this.currentDay} (${dateStr}) - Checkpoints`;
    }

    // Render checkpoints table
    renderCheckpoints() {
        const tbody = document.getElementById('checkpoint-body');
        const checkpoints = this.data[this.currentDay]?.checkpoints || [];

        if (checkpoints.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="empty-state">
                            <h3>No checkpoints yet</h3>
                            <p>Click "Add Checkpoint" to add your first location</p>
                        </div>
                    </td>
                </tr>
            `;
            document.getElementById('total-cost').textContent = '0.00';
            return;
        }

        let totalCost = 0;
        tbody.innerHTML = checkpoints.map((cp, index) => {
            totalCost += parseFloat(cp.cost) || 0;
            const mapLink = cp.googleMapLink 
                ? `<a href="${cp.googleMapLink}" target="_blank" class="map-link">View Map</a>`
                : '<span style="color: #999;">No link</span>';
            
            return `
                <tr data-id="${cp.id}" draggable="true">
                    <td class="drag-handle" title="Drag to reorder">⋮⋮</td>
                    <td>${index + 1}</td>
                    <td><strong>${this.escapeHtml(cp.location)}</strong></td>
                    <td>${mapLink}</td>
                    <td>$${parseFloat(cp.cost).toFixed(2)}</td>
                    <td>${cp.startTime}</td>
                    <td>${cp.endTime}</td>
                    <td>
                        <div class="action-btns">
                            <button class="edit-btn" onclick="app.editCheckpoint('${cp.id}')">Edit</button>
                            <button class="delete-btn" onclick="app.deleteCheckpoint('${cp.id}')">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        document.getElementById('total-cost').textContent = totalCost.toFixed(2);
        
        // Initialize drag and drop
        this.initDragAndDrop();
    }

    // Initialize drag and drop for table rows
    initDragAndDrop() {
        const tbody = document.getElementById('checkpoint-body');
        const rows = tbody.querySelectorAll('tr[draggable="true"]');
        
        rows.forEach(row => {
            row.addEventListener('dragstart', (e) => {
                row.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', row.dataset.id);
            });

            row.addEventListener('dragend', () => {
                row.classList.remove('dragging');
                document.querySelectorAll('tr.drag-over').forEach(r => r.classList.remove('drag-over'));
            });

            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const draggingRow = tbody.querySelector('.dragging');
                if (draggingRow && row !== draggingRow) {
                    row.classList.add('drag-over');
                }
            });

            row.addEventListener('dragleave', () => {
                row.classList.remove('drag-over');
            });

            row.addEventListener('drop', (e) => {
                e.preventDefault();
                row.classList.remove('drag-over');
                
                const draggedId = e.dataTransfer.getData('text/plain');
                const targetId = row.dataset.id;
                
                if (draggedId && targetId && draggedId !== targetId) {
                    this.reorderCheckpoints(draggedId, targetId);
                }
            });
        });
    }

    // Reorder checkpoints array
    reorderCheckpoints(draggedId, targetId) {
        const checkpoints = this.data[this.currentDay].checkpoints;
        const draggedIndex = checkpoints.findIndex(cp => cp.id === draggedId);
        const targetIndex = checkpoints.findIndex(cp => cp.id === targetId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
            // Remove dragged item
            const [draggedItem] = checkpoints.splice(draggedIndex, 1);
            // Insert at target position
            checkpoints.splice(targetIndex, 0, draggedItem);
            
            // Save and re-render
            this.saveToLocalStorage(this.currentDay);
            this.saveToJSON(this.currentDay); // Save to JSON file
            this.renderCheckpoints();
        }
    }

    // Open modal for add/edit
    openModal(checkpoint = null) {
        const modal = document.getElementById('checkpoint-modal');
        const form = document.getElementById('checkpoint-form');
        const title = document.getElementById('modal-title');

        form.reset();

        if (checkpoint) {
            title.textContent = 'Edit Checkpoint';
            document.getElementById('checkpoint-id').value = checkpoint.id;
            document.getElementById('location').value = checkpoint.location;
            document.getElementById('google-map-link').value = checkpoint.googleMapLink || '';
            document.getElementById('cost').value = checkpoint.cost;
            document.getElementById('start-time').value = checkpoint.startTime;
            document.getElementById('end-time').value = checkpoint.endTime;
            this.editingId = checkpoint.id;
        } else {
            title.textContent = 'Add Checkpoint';
            this.editingId = null;
        }

        modal.classList.add('active');
        document.getElementById('location').focus();
    }

    // Close modal
    closeModal() {
        document.getElementById('checkpoint-modal').classList.remove('active');
        this.editingId = null;
    }

    // Save checkpoint (add or update)
    saveCheckpoint() {
        const checkpoint = {
            id: this.editingId || this.generateId(),
            location: document.getElementById('location').value.trim(),
            googleMapLink: document.getElementById('google-map-link').value.trim(),
            cost: parseFloat(document.getElementById('cost').value) || 0,
            startTime: document.getElementById('start-time').value,
            endTime: document.getElementById('end-time').value
        };

        if (!this.data[this.currentDay]) {
            this.data[this.currentDay] = { checkpoints: [] };
        }

        const checkpoints = this.data[this.currentDay].checkpoints;

        if (this.editingId) {
            // Update existing
            const index = checkpoints.findIndex(cp => cp.id === this.editingId);
            if (index !== -1) {
                checkpoints[index] = checkpoint;
            }
        } else {
            // Add new
            checkpoints.push(checkpoint);
        }

        // Sort by start time
        checkpoints.sort((a, b) => a.startTime.localeCompare(b.startTime));

        this.saveToLocalStorage(this.currentDay);
        this.saveToJSON(this.currentDay); // Save to JSON file
        this.renderCheckpoints();
        this.closeModal();
    }

    // Edit checkpoint
    editCheckpoint(id) {
        const checkpoint = this.data[this.currentDay].checkpoints.find(cp => cp.id === id);
        if (checkpoint) {
            this.openModal(checkpoint);
        }
    }

    // Delete checkpoint
    deleteCheckpoint(id) {
        if (confirm('Are you sure you want to delete this checkpoint?')) {
            this.data[this.currentDay].checkpoints = this.data[this.currentDay].checkpoints.filter(
                cp => cp.id !== id
            );
            this.saveToLocalStorage(this.currentDay);
            this.saveToJSON(this.currentDay); // Save to JSON file
            this.renderCheckpoints();
        }
    }

    // Generate unique ID
    generateId() {
        return 'cp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Export all days data
    exportAllData() {
        const allData = {};
        for (let day = 1; day <= 8; day++) {
            allData[`day${day}`] = this.data[day];
        }
        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'travel_plan_all_days.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    // Clear all data for current day
    clearDayData() {
        if (confirm(`Are you sure you want to clear all checkpoints for Day ${this.currentDay}?`)) {
            this.data[this.currentDay] = { checkpoints: [] };
            this.saveToLocalStorage(this.currentDay);
            this.renderCheckpoints();
        }
    }
}

// Initialize the app
const app = new TravelPlanner();
