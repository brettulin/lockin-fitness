const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the version type from command line arguments (patch, minor, or major)
const versionType = process.argv[2] || 'patch';

try {
    // Read current version from package.json
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const currentVersion = packageJson.version;
    
    // Update version in package.json
    console.log(`Current version: ${currentVersion}`);
    execSync(`npm version ${versionType} --no-git-tag-version`);
    
    // Read new version
    const updatedPackageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const newVersion = updatedPackageJson.version;
    console.log(`New version: ${newVersion}`);
    
    // Update version in index.html
    const indexPath = path.join(__dirname, '..', 'index.html');
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    indexContent = indexContent.replace(
        /<p>Version .*?<\/p>/,
        `<p>Version ${newVersion}</p>`
    );
    fs.writeFileSync(indexPath, indexContent);
    
    // Build the application
    console.log('\nBuilding application...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // Create release notes
    const releaseNotes = `# Version ${newVersion}

## What's New
- Auto-update system improvements
- Performance enhancements
- Bug fixes

## Installation
Download and run the installer for your platform.`;
    
    fs.writeFileSync('release-notes.md', releaseNotes);
    console.log('\nRelease notes created: release-notes.md');
    
    console.log('\nRelease preparation complete!');
    console.log('\nNext steps:');
    console.log('1. Review the changes');
    console.log('2. Commit the changes: git commit -am "Release v' + newVersion + '"');
    console.log('3. Create a tag: git tag v' + newVersion);
    console.log('4. Push changes: git push && git push --tags');
    console.log('5. Run: npm run release');
    
} catch (error) {
    console.error('Error preparing release:', error);
    process.exit(1);
} 