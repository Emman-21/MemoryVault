// MemoryVault JavaScript - v1.0
// Main application logic

class MemoryVault {
    constructor() {
        this.entries = JSON.parse(localStorage.getItem('memoryVaultEntries')) || [];
        this.currentEntryId = null;
        this.currentMood = 'neutral';
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateDateTime();
        this.loadEntries();
        this.updateStats();
        
        // Update time every minute
        setInterval(() => this.updateDateTime(), 60000);
        
        // Auto-save every 30 seconds
        setInterval(() => this.autoSave(), 30000);
    }
    
    setupEventListeners() {
        // Button events
        document.getElementById('newEntryBtn').addEventListener('click', () => this.createNewEntry());
        document.getElementById('saveEntryBtn').addEventListener('click', () => this.saveEntry());
        document.getElementById('deleteEntryBtn').addEventListener('click', () => this.deleteEntry());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportEntries());
        
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterEntries(e.target.dataset.filter));
        });
        
        // Mood buttons
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setMood(e.target.dataset.mood));
        });
        
        // Word count update
        document.getElementById('entryContent').addEventListener('input', () => this.updateWordCount());
        
        // Title and content auto-save on change
        document.getElementById('entryTitle').addEventListener('input', () => this.autoSave());
        document.getElementById('entryContent').addEventListener('input', () => this.autoSave());

        // Keyboard shortcut for delete (Ctrl/Cmd + D)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                this.deleteEntry();
            }
            
            // Alternative: Delete key when an entry is selected
            if (e.key === 'Delete' && this.currentEntryId) {
                e.preventDefault();
                this.deleteEntry();
            }
        });
    }
    
    updateDateTime() {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        const timeStr = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        document.getElementById('currentDate').textContent = dateStr;
        document.getElementById('currentTime').textContent = timeStr;
    }
    
    updateWordCount() {
        const content = document.getElementById('entryContent').value;
        const title = document.getElementById('entryTitle').value;
        
        // Count words in both title and content
        const titleWords = title.trim() === '' ? 0 : title.trim().split(/\s+/).length;
        const contentWords = content.trim() === '' ? 0 : content.trim().split(/\s+/).length;
        const totalWords = titleWords + contentWords;
        
        document.getElementById('wordCount').textContent = `${totalWords} words`;
    }
    
    createNewEntry() {
        this.clearEditor();
        this.currentEntryId = Date.now().toString();
        document.getElementById('entryTitle').value = `Entry ${this.entries.length + 1}`;
        document.getElementById('entryContent').focus();
    }
    
    clearEditor() {
        document.getElementById('entryTitle').value = '';
        document.getElementById('entryContent').value = '';
        this.updateWordCount();
        this.setMood('neutral');
        this.currentEntryId = null;
        
        // Remove active class from all diary items
        document.querySelectorAll('.diary-item').forEach(item => {
            item.classList.remove('active');
        });
    }
    
    saveEntry() {
        const title = document.getElementById('entryTitle').value.trim();
        const content = document.getElementById('entryContent').value.trim();
        
        if (!title && !content) {
            this.showNotification('Entry cannot be empty', 'warning');
            return;
        }
        
        const entry = {
            id: this.currentEntryId || Date.now().toString(),
            title: title || 'Untitled Entry',
            content: content,
            date: new Date().toISOString(),
            mood: this.currentMood,
            wordCount: content === '' ? 0 : content.trim().split(/\s+/).length
        };
        
        // Check if we're updating an existing entry
        const existingIndex = this.entries.findIndex(e => e.id === entry.id);
        if (existingIndex !== -1) {
            this.entries[existingIndex] = entry;
            this.showNotification('Entry updated successfully', 'success');
        } else {
            this.entries.unshift(entry); // Add to beginning
            this.showNotification('Entry saved successfully', 'success');
        }
        
        // Save to localStorage
        this.saveToLocalStorage();
        
        // Update UI
        this.loadEntries();
        this.updateStats();
        
        // Select the new/updated entry in the list
        this.selectEntry(entry.id);
    }
    
    autoSave() {
        const title = document.getElementById('entryTitle').value.trim();
        const content = document.getElementById('entryContent').value.trim();
        
        if (!title && !content) return;
        
        // Only auto-save if we have an entry ID (existing entry)
        if (this.currentEntryId) {
            const entryIndex = this.entries.findIndex(e => e.id === this.currentEntryId);
            if (entryIndex !== -1) {
                this.entries[entryIndex].title = title || 'Untitled Entry';
                this.entries[entryIndex].content = content;
                this.entries[entryIndex].wordCount = content === '' ? 0 : content.trim().split(/\s+/).length;
                this.entries[entryIndex].mood = this.currentMood;
                this.saveToLocalStorage();
            }
        }
    }
    
    deleteEntry() {
        if (!this.currentEntryId) {
            this.showNotification('No entry selected to delete', 'warning');
            return;
        }
        
        // Get the entry title for confirmation message
        const entryToDelete = this.entries.find(entry => entry.id === this.currentEntryId);
        const entryTitle = entryToDelete ? entryToDelete.title : 'this entry';
        
        if (confirm(`Are you sure you want to delete "${entryTitle}"? This action cannot be undone.`)) {
            // Remove entry from array
            this.entries = this.entries.filter(entry => entry.id !== this.currentEntryId);
            
            // Save to localStorage
            this.saveToLocalStorage();
            
            // Clear editor
            this.clearEditor();
            
            // Update UI
            this.loadEntries();
            this.updateStats();
            
            this.showNotification('Entry deleted successfully', 'success');
        }
    }

    loadEntries(filter = 'all') {
    const diaryList = document.getElementById('diaryList');
    diaryList.innerHTML = '';
    
    let filteredEntries = [...this.entries];
    
    // Apply filters
    const now = new Date();
    if (filter === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filteredEntries = filteredEntries.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= today;
        });
    } else if (filter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredEntries = filteredEntries.filter(entry => new Date(entry.date) >= weekAgo);
    } else if (filter === 'month') {
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        filteredEntries = filteredEntries.filter(entry => new Date(entry.date) >= monthAgo);
    }
    
    if (filteredEntries.length === 0) {
        diaryList.innerHTML = '<div class="diary-item"><em>No entries found</em></div>';
        return;
    }
    
    filteredEntries.forEach(entry => {
        const entryDate = new Date(entry.date);
        const dateStr = entryDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
        
        const timeStr = entryDate.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const preview = entry.content.length > 100 
            ? entry.content.substring(0, 100) + '...' 
            : entry.content;
        
        // ITO ANG BAGONG HTML STRUCTURE NA MAY DELETE BUTTON
        const diaryItem = document.createElement('div');
        diaryItem.className = `diary-item ${this.currentEntryId === entry.id ? 'active' : ''}`;
        diaryItem.dataset.id = entry.id;
        diaryItem.innerHTML = `
            <div class="diary-item-header">
                <div class="diary-date">${dateStr} at ${timeStr}</div>
                <button class="delete-entry-btn" data-id="${entry.id}" title="Delete this entry">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="diary-title">${entry.title}</div>
            <div class="diary-preview">${preview}</div>
            <div class="diary-meta">
                <span style="color: #666; font-size: 0.8rem;">${entry.wordCount} words • Mood: ${this.getMoodEmoji(entry.mood)}</span>
            </div>
        `;
        
        // Existing click event para sa buong entry
        diaryItem.addEventListener('click', (e) => {
            // Prevent triggering when clicking delete button
            if (!e.target.closest('.delete-entry-btn')) {
                this.loadEntry(entry.id);
            }
        });
        
        // Add delete button event listener
        const deleteBtn = diaryItem.querySelector('.delete-entry-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the parent click event
            this.deleteSpecificEntry(entry.id, entry.title);
        });
        
        diaryList.appendChild(diaryItem);
    });
    }
    
    loadEntry(id) {
        const entry = this.entries.find(e => e.id === id);
        if (!entry) return;
        
        this.currentEntryId = entry.id;
        document.getElementById('entryTitle').value = entry.title;
        document.getElementById('entryContent').value = entry.content;
        this.setMood(entry.mood);
        this.updateWordCount();
        
        // Update active state in list
        document.querySelectorAll('.diary-item').forEach(item => {
            if (item.dataset.id === id) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
    
    selectEntry(id) {
        // Find and click the entry in the list
        const entryElement = document.querySelector(`.diary-item[data-id="${id}"]`);
        if (entryElement) {
            entryElement.click();
        }
    }
    
    filterEntries(filter) {
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Load entries with filter
        this.loadEntries(filter);
    }
    
    setMood(mood) {
        this.currentMood = mood;
        
        // Update active mood button
        document.querySelectorAll('.mood-btn').forEach(btn => {
            if (btn.dataset.mood === mood) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    getMoodEmoji(mood) {
        const emojis = {
            happy: '😊',
            neutral: '😐',
            sad: '😔',
            excited: '🤩',
            love: '🥰'
        };
        return emojis[mood] || '😐';
    }
    
    updateStats() {
        // Total entries
        document.getElementById('totalEntries').textContent = this.entries.length;
        
        // Streak calculation (simplified)
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const entryDates = this.entries.map(entry => {
            const date = new Date(entry.date);
            date.setHours(0, 0, 0, 0);
            return date.getTime();
        });
        
        const uniqueDates = [...new Set(entryDates)].sort((a, b) => b - a);
        
        let currentDate = today.getTime();
        for (let date of uniqueDates) {
            if (date === currentDate) {
                streak++;
                currentDate -= 24 * 60 * 60 * 1000; // Previous day
            } else if (date < currentDate) {
                break;
            }
        }
        
        document.getElementById('streakCount').textContent = streak;
        
        // This month entries
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const monthEntries = this.entries.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
        });
        
        document.getElementById('monthEntries').textContent = monthEntries.length;
    }
    
    exportEntries() {
        if (this.entries.length === 0) {
            this.showNotification('No entries to export', 'warning');
            return;
        }
        
        const exportData = {
            app: 'MemoryVault',
            version: '1.0',
            exportDate: new Date().toISOString(),
            entries: this.entries
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `memoryvault_export_${new Date().toISOString().slice(0, 10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        this.showNotification('Entries exported successfully', 'success');
    }

    deleteSpecificEntry(entryId, entryTitle = 'this entry') {
    if (confirm(`Are you sure you want to delete "${entryTitle}"? This action cannot be undone.`)) {
        // Remove entry from array
        this.entries = this.entries.filter(entry => entry.id !== entryId);
        
        // If the deleted entry was currently being viewed, clear editor
        if (this.currentEntryId === entryId) {
            this.clearEditor();
        }
        
        // Save to localStorage
        this.saveToLocalStorage();
        
        // Update UI
        this.loadEntries();
        this.updateStats();
        
        this.showNotification('Entry deleted successfully', 'success');
    }
    }
    
    saveToLocalStorage() {
        localStorage.setItem('memoryVaultEntries', JSON.stringify(this.entries));
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            animation: slideIn 0.3s ease;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        `;
        
        // Set background color based on type
        if (type === 'success') {
            notification.style.backgroundColor = '#4CAF50';
        } else if (type === 'warning') {
            notification.style.backgroundColor = '#FF9800';
        } else {
            notification.style.backgroundColor = '#2196F3';
        }
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.5s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 3000);
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.memoryVault = new MemoryVault();
});