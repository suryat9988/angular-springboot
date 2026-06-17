const fs = require('fs');
const path = require('path');

const browserDir = path.join(__dirname, '..', 'dist', 'bowerbox', 'browser');
const indexPath = path.join(browserDir, 'index.html');
const notFoundPath = path.join(browserDir, '404.html');

if (!fs.existsSync(indexPath)) {
  console.error('Build output not found. Run npm run build:godaddy first.');
  process.exit(1);
}

fs.copyFileSync(indexPath, notFoundPath);
console.log('Created 404.html for static hosting SPA routing.');
