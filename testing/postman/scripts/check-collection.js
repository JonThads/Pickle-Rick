// PR-35: an offline guard against silently omitting a newly mounted endpoint.
// Runtime assertions remain Newman's job; this check cannot prove behavior.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const collection = require('../PickleRick.postman_collection.json');
const flatten = (items) => items.flatMap((item) => item.request ? [item] : flatten(item.item || []));
const requests = flatten(collection.item);
const normalize = (url) => url.replace(/^\{\{baseUrl\}\}/, '').split('?')[0]
  .replace(/\{\{[^}]+\}\}|:[A-Za-z]+/g, ':id');
const covered = new Set(requests.map(({ request }) =>
  `${request.method} ${normalize(typeof request.url === 'string' ? request.url : request.url.raw)}`));
const app = fs.readFileSync(path.join(root, 'backend-node/src/app.js'), 'utf8');
let count = 0;
for (const [, mount, router] of app.matchAll(/app\.use\('([^']+)', (\w+Routes)\)/g)) {
  const source = fs.readFileSync(path.join(root, `backend-node/src/routes/${router}.js`), 'utf8');
  for (const [, method, route] of source.matchAll(/router\.(get|post|patch|delete|put)\('([^']+)'/g)) {
    const endpoint = `${method.toUpperCase()} ${normalize(mount + (route === '/' ? '' : route))}`;
    assert(covered.has(endpoint), `Missing endpoint: ${endpoint}`);
    count++;
  }
}
for (const item of requests) {
  const script = (item.event || []).filter((event) => event.listen === 'test')
    .flatMap((event) => event.script.exec).join('\n');
  assert.match(script, /pm\.response\.to\.have\.status\(/, `${item.name}: missing status assertion`);
  assert.match(script, /pm\.test\('response shape'/, `${item.name}: missing shape assertion`);
}
assert.equal(collection.item.at(-1).name, 'Cleanup', 'Cleanup must run last');
for (const variable of collection.variable) {
  assert.equal(variable.value, '', `${variable.key}: runtime state must not be exported`);
}
console.log(`${count} business endpoints covered; ${requests.length} requests have status and shape assertions; cleanup last.`);
