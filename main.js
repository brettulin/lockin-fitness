const { app, BrowserWindow, Tray, Menu, ipcMain, Notification, nativeImage } = require('electron');
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

// Create icon
const createIcon = () => {
  const iconPath = path.join(__dirname, 'assets', 'images', 'icon.ico');
  return nativeImage.createFromPath(iconPath);
};

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
      icon: createIcon(),
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

    // Handle IPC events
    ipcMain.handle('get-version', () => app.getVersion());
    ipcMain.on('minimize-window', () => mainWindow.minimize());
    ipcMain.on('maximize-window', () => {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    });
    ipcMain.on('close-window', () => mainWindow.close());
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
    const icon = createIcon();
    tray = new Tray(icon);
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

    // Set a smaller icon for the tray
    if (process.platform === 'win32') {
      tray.setImage(icon.resize({ width: 16, height: 16 }));
    }
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
  if (mainWindow) {
    mainWindow.webContents.send('checking-for-update');
  }
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info);
  }
  new Notification({ 
    title: 'Update Available', 
    body: `Version ${info.version} is available and will be downloaded automatically.`,
    icon: createIcon()
  }).show();
});

autoUpdater.on('update-not-available', () => {
  console.log('No updates available');
  if (mainWindow) {
    mainWindow.webContents.send('update-not-available');
  }
});

autoUpdater.on('error', (err) => {
  console.error('Update error:', err.message);
  if (mainWindow) {
    mainWindow.webContents.send('update-error', err.message);
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  console.log('Download progress:', Math.round(progressObj.percent) + '%');
  if (mainWindow) {
    mainWindow.webContents.send('download-progress', progressObj);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', info);
  }
  new Notification({ 
    title: 'Update Ready', 
    body: `Version ${info.version} has been downloaded. Click here to install and restart.`,
    closeButtonText: 'Install Now',
    icon: createIcon()
  }).show();
});

function checkForUpdates() {
  try {
    autoUpdater.checkForUpdates();
  } catch (error) {
    console.error('Error checking for updates:', error);
    if (mainWindow) {
      mainWindow.webContents.send('update-error', error.message);
    }
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