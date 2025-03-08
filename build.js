const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Build configuration
const config = {
  frontendDir: path.join(__dirname, '../frontend'),
  electronDir: __dirname,
  buildDir: path.join(__dirname, 'dist'),
};

async function buildApp() {
  try {
    console.log('Building React frontend...');
    execSync('npm run build', { cwd: config.frontendDir, stdio: 'inherit' });

    console.log('Copying frontend build to electron directory...');
    const frontendBuildDir = path.join(config.frontendDir, 'build');
    const electronBuildDir = path.join(config.electronDir, 'build');
    
    if (!fs.existsSync(electronBuildDir)) {
      fs.mkdirSync(electronBuildDir, { recursive: true });
    }

    fs.cpSync(frontendBuildDir, electronBuildDir, { recursive: true });

    console.log('Building electron app...');
    execSync('npm run build', { cwd: config.electronDir, stdio: 'inherit' });

    console.log('Build completed successfully!');
    console.log(`Installer can be found in: ${config.buildDir}`);
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildApp(); 