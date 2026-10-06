import fs from 'fs';
const path = 'd:/projekbaru/frontend/src/pages/FinancePage.jsx';
let content = fs.readFileSync(path, 'utf8');

const startStr = '<div className={styles.statsGrid}>';
const endStr = '          </>';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + content.substring(endIndex);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Successfully removed the stats grid and table section.');
} else {
  console.log('Could not find the target strings.');
}
