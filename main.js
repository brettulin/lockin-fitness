const { app, BrowserWindow, Tray, Menu, ipcMain, Notification } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');
const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');
const env = require('./config/env');

// Initialize electron store
const store = new Store();

// Initialize SQLite database for offline storage
const db = new sqlite3.Database(
  path.join(app.getPath('userData'), 'offline.db'),
  (err) => {
    if (err) console.error('Database opening error: ', err);
  }
);

// Create tables for offline storage
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT,
    synced INTEGER DEFAULT 0
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS nutrition_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT,
    synced INTEGER DEFAULT 0
  )`);
});

let mainWindow;
let tray;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false, // Disable nodeIntegration for security
      contextIsolation: true, // Enable context isolation for security
      preload: path.join(__dirname, 'preload.js') // Use preload script
    },
    icon: path.join(__dirname, 'assets/icon.ico')
  });

  // Load the React app in development or the built version in production
  const startUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../frontend/build/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Hide window to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  // Set up security headers
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:8000"]
      }
    });
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'assets/icon.ico'));
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open LockIn Fitness',
      click: () => mainWindow.show()
    },
    { 
      label: 'Sync Data',
      click: syncOfflineData
    },
    { type: 'separator' },
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

// Handle offline data storage
ipcMain.on('save-offline-data', (event, { type, data }) => {
  const table = type === 'workout' ? 'workouts' : 'nutrition_logs';
  db.run(`INSERT INTO ${table} (data, synced) VALUES (?, 0)`, 
    [JSON.stringify(data)], 
    function(err) {
      if (err) {
        event.reply('save-offline-response', { success: false, error: err.message });
      } else {
        event.reply('save-offline-response', { success: true, id: this.lastID });
        showNotification('Data Saved', 'Your data has been saved offline.');
      }
    }
  );
});

// Sync offline data with server
async function syncOfflineData() {
  try {
    // Sync workouts
    db.all(`SELECT * FROM workouts WHERE synced = 0`, async (err, rows) => {
      if (err) throw err;
      
      for (const row of rows) {
        try {
          const response = await fetch('http://localhost:8000/api/knowledge/user-data/workout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: row.data
          });

          if (response.ok) {
            db.run(`UPDATE workouts SET synced = 1 WHERE id = ?`, row.id);
          }
        } catch (error) {
          console.error('Sync error:', error);
        }
      }
    });

    // Sync nutrition logs
    db.all(`SELECT * FROM nutrition_logs WHERE synced = 0`, async (err, rows) => {
      if (err) throw err;
      
      for (const row of rows) {
        try {
          const response = await fetch('http://localhost:8000/api/knowledge/user-data/nutrition', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: row.data
          });

          if (response.ok) {
            db.run(`UPDATE nutrition_logs SET synced = 1 WHERE id = ?`, row.id);
          }
        } catch (error) {
          console.error('Sync error:', error);
        }
      }
    });

    mainWindow.webContents.send('sync-complete', { success: true });
    showNotification('Sync Complete', 'Your data has been synchronized with the server.');
  } catch (error) {
    console.error('Sync error:', error);
    mainWindow.webContents.send('sync-complete', { success: false, error: error.message });
    showNotification('Sync Failed', 'Failed to synchronize data. Will try again later.');
  }
}

function showNotification(title, body) {
  new Notification({ title, body }).show();
}

// Configure auto updater with secure token
autoUpdater.autoDownload = env.get('AUTO_UPDATE') !== 'false';
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.setFeedURL({
  provider: 'github',
  owner: env.get('GH_OWNER'),
  repo: env.get('GH_REPO'),
  token: env.get('GH_TOKEN')
});

// Add more detailed update events
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
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
});

// Add IPC handlers for manual update checks and installation
ipcMain.on('check-for-updates', () => {
  autoUpdater.checkForUpdates();
});

ipcMain.on('quit-and-install', () => {
  isQuitting = true;
  autoUpdater.quitAndInstall();
});

// Modify the checkForUpdates function
function checkForUpdates() {
  try {
    autoUpdater.checkForUpdates();
  } catch (error) {
    console.error('Error checking for updates:', error);
    mainWindow.webContents.send('update-error', error);
  }
}

// Add update check interval (every 4 hours)
const UPDATE_CHECK_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

// App events
app.whenReady().then(() => {
  createWindow();
  createTray();
  
  // Initial update check after 1 minute
  setTimeout(checkForUpdates, 60 * 1000);
  
  // Regular update checks
  setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL);
  
  // Set up auto sync every 30 minutes
  setInterval(syncOfflineData, 30 * 60 * 1000);
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
  db.close();
}); 