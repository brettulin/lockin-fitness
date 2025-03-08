const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
    // App info
    getVersion: () => ipcRenderer.invoke('get-version'),
    
    // Update handling
    checkForUpdates: () => ipcRenderer.send('check-for-updates'),
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
    onUpdateProgress: (callback) => ipcRenderer.on('download-progress', callback),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
    
    // App controls
    minimize: () => ipcRenderer.send('minimize-window'),
    maximize: () => ipcRenderer.send('maximize-window'),
    close: () => ipcRenderer.send('close-window'),
    
    // Remove listeners
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
}); 