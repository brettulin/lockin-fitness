const { app, BrowserWindow, Tray, Menu, ipcMain, Notification } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');
const env = require('./config/env');

// Initialize electron store
const store = new Store();

let mainWindow;
let tray;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'assets/icon.ico')
  });

  mainWindow.loadFile('index.html');

  // Hide window to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'assets/icon.ico'));
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open LockIn Fitness',
      click: () => mainWindow.show()
    },
    { type: 'separator' },
    { 
      label: 'Check for Updates',
      click: () => checkForUpdates()
    },
    { 
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('LockIn Fitness');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow.show();
  });
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
    body: `Version ${info.version} has been downloaded and will be installed on restart.`
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
    app.quit();
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