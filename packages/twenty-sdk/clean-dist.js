const fs = require('fs');
const path = require('path');

const targets = [
  'dist/sdk',
  'dist/define',
  'dist/billing',
  'dist/front-component',
  'dist/logic-function',
  'dist/utils'
];

targets.forEach(target => {
  const targetPath = path.resolve(__dirname, target);
  if (!fs.existsSync(targetPath)) return;

  if (target === 'dist/sdk') {
    // Delete the whole directory
    fs.rmSync(targetPath, { recursive: true, force: true });
    console.log(`Deleted: ${targetPath}`);
  } else {
    // Delete only .d.ts and .d.ts.map files recursively inside this directory
    cleanDirectory(targetPath);
  }
});

function cleanDirectory(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      cleanDirectory(fullPath);
      // If the directory becomes empty, we can clean it up
      if (fs.readdirSync(fullPath).length === 0) {
        fs.rmdirSync(fullPath);
      }
    } else if (file.isFile() && (file.name.endsWith('.d.ts') || file.name.endsWith('.d.ts.map'))) {
      fs.unlinkSync(fullPath);
      console.log(`Deleted: ${fullPath}`);
    }
  }
}
