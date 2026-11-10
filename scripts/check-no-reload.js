const fs = require('fs');
const sw = fs.readFileSync('sw.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const problems = [];

const activateStart = sw.indexOf("addEventListener('activate'");
const activateEnd = sw.indexOf("function guideJob");
const activate = activateStart >= 0 ? sw.slice(activateStart, activateEnd) : '';
if (activate.includes('client.navigate') || activate.includes('location.')) {
  problems.push('sw.js must not reload pages that are already open');
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
if (!html.includes("if (href.charAt(0) === '#') e.preventDefault()")) {
  problems.push('buttons inside the guide must stay on the same page');
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('guide navigation stays on the page');
