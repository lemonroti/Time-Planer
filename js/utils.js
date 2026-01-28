// ========================================
// UTILS - Shared helper functions
// ========================================

// Escape HTML for text content
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Escape string for JavaScript string literals (single-quoted)
// Used in onclick handlers to prevent XSS
function escapeJsString(str) {
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}

// Convert time string (HH:MM) to minutes
function timeToMins(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

// Get effective end time (handles midnight crossing)
// If end < start, assume task crosses midnight and add 24 hours
function getEffectiveEnd(startMins, endMins) {
    return endMins <= startMins ? endMins + 1440 : endMins;
}

// Format time for display (12-hour format)
function formatTime(time) {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

// Format duration in hours/minutes
function formatDuration(hours) {
    if (hours <= 0) return '0h';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours === 1) return '1h';
    if (Number.isInteger(hours)) return `${hours}h`;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Format milliseconds as time tracking display (e.g., "1h 30m")
function formatTrackedTime(ms) {
    if (!ms || ms <= 0) return '0m';
    const totalMins = Math.floor(ms / 60000);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
}

// Calculate duration (handles midnight crossing)
function calcDuration(startTime, endTime) {
    const startMins = timeToMins(startTime);
    const endMins = timeToMins(endTime);
    const effectiveEnd = getEffectiveEnd(startMins, endMins);
    return (effectiveEnd - startMins) / 60;
}
