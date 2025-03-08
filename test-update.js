const { app, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');
const env = require('./config/env');

console.log('\n=== Auto Update Test ===\n');

// Test environment configuration
console.log('1. Testing update configuration:');
console.log('   GitHub Owner:', env.get('GH_OWNER'));
console.log('   GitHub Repo:', env.get('GH_REPO'));
console.log('   Auto Update:', env.get('AUTO_UPDATE'));
console.log('   Update Interval:', env.get('UPDATE_INTERVAL'), 'ms');
console.log('   GitHub Token:', env.get('GH_TOKEN') ? '✓ Present' : '✗ Missing');

// Configure auto-updater
autoUpdater.autoDownload = env.get('AUTO_UPDATE') !== 'false';
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.setFeedURL({
    provider: 'github',
    owner: env.get('GH_OWNER'),
    repo: env.get('GH_REPO'),
    token: env.get('GH_TOKEN')
});

// Add update event listeners
console.log('\n2. Setting up update event listeners:');

autoUpdater.on('checking-for-update', () => {
    console.log('   ℹ Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
    console.log('   ✓ Update available:', info.version);
    console.log('   ℹ Current version:', app.getVersion());
    console.log('   ℹ Release notes:', info.releaseNotes || 'No release notes available');
});

autoUpdater.on('update-not-available', (info) => {
    console.log('   ℹ No updates available');
    console.log('   ℹ Current version:', app.getVersion());
});

autoUpdater.on('error', (err) => {
    console.log('   ✗ Update error:', err.message);
});

autoUpdater.on('download-progress', (progressObj) => {
    console.log('   ℹ Download progress:', Math.round(progressObj.percent) + '%');
});

autoUpdater.on('update-downloaded', (info) => {
    console.log('   ✓ Update downloaded:', info.version);
    console.log('   ℹ The update will be installed on next restart');
});

// Create a minimal app window (required for electron-updater)
app.whenReady().then(() => {
    const win = new BrowserWindow({ 
        width: 800, 
        height: 600,
        show: false // Hide the window since this is just a test
    });

    console.log('\n3. Checking for updates:');
    autoUpdater.checkForUpdates().catch(err => {
        console.log('   ✗ Error checking for updates:', err.message);
    });
});

// Keep the app running for a bit to see the results
setTimeout(() => {
    console.log('\nTest completed. Exiting...');
    app.quit();
}, 10000); // Wait 10 seconds before quitting 