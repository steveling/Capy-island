// Stamps every script and stylesheet address in index.html with a fingerprint of the file's contents
// (js/world.js -> js/world.js?v=3f2a91c0e4). GitHub Pages lets browsers reuse files for 10 minutes, and a page
// that mixes new and old cached scripts breaks; with the stamp, a changed file gets a new address, so a
// refresh can't pick up a stale copy, while unchanged files keep theirs and stay cached.
//   node scripts/stamp.js          rewrite index.html
//   node scripts/stamp.js --check  exit 1 (listing the files) if index.html is out of date
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const ASSET = /((?:src|href)=")((?:js|css)\/[\w.-]+\.(?:js|css))(?:\?v=[0-9a-f]*)?(")/g;

const fingerprint = file =>
  crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(ROOT, file)))
    .digest('hex')
    .slice(0, 10);

function stamped(html) {
  return html.replace(ASSET, (m, pre, file, post) => `${pre}${file}?v=${fingerprint(file)}${post}`);
}

if (require.main === module) {
  const html = fs.readFileSync(INDEX, 'utf8'),
    next = stamped(html);
  if (process.argv.includes('--check')) {
    const stale = [...html.matchAll(ASSET)].map(m => m[0]).filter(m => !next.includes(m));
    if (stale.length) {
      console.error('index.html is out of date for:\n  ' + stale.join('\n  ') + '\nRun: npm run stamp');
      process.exit(1);
    }
    console.log('index.html stamps are up to date');
  } else if (next !== html) {
    fs.writeFileSync(INDEX, next);
    console.log('index.html stamped');
  } else console.log('index.html already up to date');
}

module.exports = { stamped };
