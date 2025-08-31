const { execSync } = require('child_process');
const os = require('os');

if (os.platform() === 'darwin') {
  console.log('Detected macOS, installing macos-alias...');
  try {
    execSync('pnpm install macos-alias', { stdio: 'inherit' });
  } catch (error) {
    console.error('Failed to install macos-alias on macOS:', error);
    process.exit(1);
  }
} else {
  console.log('Not macOS, skipping macos-alias installation.');
}