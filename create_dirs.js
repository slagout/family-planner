const fs = require('fs');
const path = require('path');

const dirs = [
  'src/services',
  'src/components/TouchOptimized',
  'src/i18n',
  'public/locales/en',
  'public/locales/fr'
];

const basePath = 'C:\\Users\\capit\\Documents\\4391_home_auto\\family-planner\\frontend';

dirs.forEach(dir => {
  const fullPath = path.join(basePath, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created: ${fullPath}`);
  }
});

console.log('All directories created');
