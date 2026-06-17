const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const browserDir = path.join(__dirname, '..', 'dist', 'bowerbox', 'browser');
const zipPath = path.join(__dirname, '..', 'innovatedquantum-deploy.zip');

if (!fs.existsSync(browserDir)) {
  console.error('Build output not found. Run npm run build:godaddy first.');
  process.exit(1);
}

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

const isWindows = process.platform === 'win32';

if (isWindows) {
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${browserDir}\\*' -DestinationPath '${zipPath}' -Force"`,
    { stdio: 'inherit' }
  );
} else {
  execSync(`cd "${browserDir}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
}

console.log(`\nDeploy package ready: ${zipPath}`);
console.log('Upload and extract everything into GoDaddy public_html.\n');
