const fs = require('fs');
const sw = fs.readFileSync('sw.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const problems = [];

const activateStart = sw.indexOf("addEventListener('activate'");
const activateEnd = sw.indexOf("addEventListener('fetch'");
const activate = activateStart >= 0 && activateEnd > activateStart ? sw.slice(activateStart, activateEnd) : '';
if (!activate || activate.includes('client.navigate') || activate.includes('location.')) {
  problems.push('sw.js must not reload pages that are already open');
}
if (sw.includes('respondWith')) {
  problems.push('sw.js must not answer page or file loads');
}

const fetchStart = sw.indexOf("addEventListener('fetch'");
const fetchEnd = sw.indexOf("addEventListener('message'");
const fetchBody = fetchStart >= 0 ? sw.slice(fetchStart, fetchEnd) : '';
const skipDocuments = fetchBody.indexOf('if (isDocument(req)) return;');
const respond = fetchBody.indexOf('respondWith');
if (skipDocuments < 0 || (respond >= 0 && skipDocuments > respond)) {
  problems.push('sw.js must let the guide page load on its own');
}

if (html.includes("location.replace('./?gglive=") || html.includes('location.replace("./?gglive=')) {
  problems.push('index.html must not reload the guide to pick up a new copy');
}
if (!html.includes("href.charAt(0) === '#'") || !html.includes('e.preventDefault()')) {
  problems.push('buttons inside the guide must stay on the same page');
}
if (/location\.hash\s*=[^=]/.test(html)) {
  problems.push('tabs must not change the page address in a way that reloads iPhone');
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('guide navigation stays on the page');
