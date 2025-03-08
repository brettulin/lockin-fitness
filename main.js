const { app, BrowserWindow, Tray, Menu, ipcMain, Notification } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');
const env = require('./config/env');

// Initialize electron store
const store = new Store();

let mainWindow = null;
let tray = null;
let isQuitting = false;

// Force close any existing instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  return;
}

function createWindow() {
  if (mainWindow === null) {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: path.join(__dirname, 'assets/icon.ico'),
      show: false // Don't show until ready
    });

    mainWindow.loadFile('index.html');

    // Show window when ready to prevent flashing
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
    });

    // Handle window close
    mainWindow.on('close', (event) => {
      if (!isQuitting) {
        event.preventDefault();
        mainWindow.hide();
        return false;
      }
    });

    // Reset mainWindow on close
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  } else {
    // If window exists but is hidden, show it
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
}

function createTray() {
  if (tray === null) {
    tray = new Tray(path.join(__dirname, 'assets/icon.ico'));
    const contextMenu = Menu.buildFromTemplate([
      { 
        label: 'Open LockIn Fitness',
        click: () => {
          createWindow();
        }
      },
      { type: 'separator' },
      { 
        label: 'Check for Updates',
        click: () => checkForUpdates()
      },
      { 
        label: 'Quit',
        click: () => {
          forceQuit();
        }
      }
    ]);

    tray.setToolTip('LockIn Fitness');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      createWindow();
    });
  }
}

// Force quit function
function forceQuit() {
  isQuitting = true;
  if (tray) {
    tray.destroy();
    tray = null;
  }
  if (mainWindow) {
    mainWindow.destroy();
    mainWindow = null;
  }
  app.quit();
}

// Configure auto updater
autoUpdater.autoDownload = env.get('AUTO_UPDATE') !== 'false';
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.setFeedURL({
  provider: 'github',
  owner: env.get('GH_OWNER'),
  repo: env.get('GH_REPO'),
  token: env.get('GH_TOKEN')
});

// Add update event listeners
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  new Notification({ 
    title: 'Update Available', 
    body: `Version ${info.version} is available and will be downloaded automatically.`
  }).show();
});

autoUpdater.on('update-not-available', () => {
  console.log('No updates available');
});

autoUpdater.on('error', (err) => {
  console.error('Update error:', err.message);
});

autoUpdater.on('download-progress', (progressObj) => {
  console.log('Download progress:', Math.round(progressObj.percent) + '%');
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version);
  new Notification({ 
    title: 'Update Ready', 
    body: `Version ${info.version} has been downloaded. Click here to install and restart.`,
    closeButtonText: 'Install Now'
  }).show();
});

function checkForUpdates() {
  try {
    autoUpdater.checkForUpdates();
  } catch (error) {
    console.error('Error checking for updates:', error);
  }
}

// App events
app.whenReady().then(() => {
  createWindow();
  createTray();
  
  // Initial update check after 1 minute
  setTimeout(checkForUpdates, 60 * 1000);
  
  // Regular update checks every 4 hours
  setInterval(checkForUpdates, 4 * 60 * 60 * 1000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    forceQuit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Clean up on quit
app.on('before-quit', () => {
  isQuitting = true;
});

// Handle second instance
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
}); 