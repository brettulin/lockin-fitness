const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    saveOfflineData: (type, data) => {
      return new Promise((resolve) => {
        ipcRenderer.send('save-offline-data', { type, data });
        ipcRenderer.once('save-offline-response', (_, response) => {
          resolve(response);
        });
      });
    },
    onSyncComplete: (callback) => {
      ipcRenderer.on('sync-complete', callback);
    },
    checkForUpdates: () => {
      ipcRenderer.send('check-for-updates');
    },
    quitAndInstall: () => {
      ipcRenderer.send('quit-and-install');
    },
    onUpdateStatus: (callback) => {
      ipcRenderer.on('update-status', callback);
    },
    onUpdateAvailable: (callback) => {
      ipcRenderer.on('update-available', callback);
    },
    onUpdateNotAvailable: (callback) => {
      ipcRenderer.on('update-not-available', callback);
    },
    onUpdateError: (callback) => {
      ipcRenderer.on('update-error', callback);
    },
    onUpdateProgress: (callback) => {
      ipcRenderer.on('update-progress', callback);
    },
    onUpdateDownloaded: (callback) => {
      ipcRenderer.on('update-downloaded', callback);
    },
    removeAllListeners: () => {
      const events = [
        'sync-complete',
        'update-status',
        'update-available',
        'update-not-available',
        'update-error',
        'update-progress',
        'update-downloaded'
      ];
      events.forEach(event => ipcRenderer.removeAllListeners(event));
    }
  }
); 