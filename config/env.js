const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

class EnvironmentManager {
  constructor() {
    this.envPath = path.join(__dirname, '..', '.env');
    this.config = {};
    this.loadEnv();
  }

  loadEnv() {
    try {
      if (!fs.existsSync(this.envPath)) {
        console.warn('.env file not found. Creating template...');
        this.createEnvTemplate();
      }

      const envContent = fs.readFileSync(this.envPath, 'utf8');
      const lines = envContent.split('\n');

      this.config = {};

      for (const line of lines) {
        if (line.trim() && !line.startsWith('#')) {
          const [key, value] = line.split('=').map(part => part.trim());
          if (key && value) {
            this.config[key] = value;
          }
        }
      }

      this.validateConfig();
    } catch (error) {
      console.error('Error loading environment variables:', error);
    }
  }

  createEnvTemplate() {
    const template = `# LockIn Fitness Desktop Environment Configuration
# Replace these values with your actual credentials

# GitHub Configuration
GH_TOKEN=your_github_token_here
GH_OWNER=your_github_username
GH_REPO=your_github_repo

# API Configuration
API_URL=http://localhost:8000

# Update Configuration
AUTO_UPDATE=true
UPDATE_INTERVAL=14400000 # 4 hours in milliseconds
`;

    fs.writeFileSync(this.envPath, template);
  }

  validateConfig() {
    const requiredVars = ['GH_TOKEN'];
    const missingVars = requiredVars.filter(varName => !this.config[varName]);

    if (missingVars.length > 0) {
      console.warn(`Missing required environment variables: ${missingVars.join(', ')}`);
      console.warn('Please update your .env file with the required values.');
    }
  }

  get(key) {
    return this.config[key];
  }

  set(key, value) {
    this.config[key] = value;
    this.saveEnv();
  }

  saveEnv() {
    try {
      const content = Object.entries(this.config)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      fs.writeFileSync(this.envPath, content);
    } catch (error) {
      console.error('Error saving environment variables:', error);
    }
  }
}

module.exports = new EnvironmentManager(); 