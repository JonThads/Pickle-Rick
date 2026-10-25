// PR-35 / NFR-03: exercise runner failures without needing to corrupt a live
// database. Actual SQL cleanup and HTTP contracts are verified by Newman.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const runId = '11111111-1111-4111-8111-111111111111';
const source = name => fs.readFileSync(path.join(__dirname, name), 'utf8');

function runner({ failures = [], startError, cleanupError, running = true, failedUpload = false } = {}) {
  const calls = [];
  return new Promise(resolve => {
    const requireStub = name => {
      if (name === 'newman') return { run(options, callback) {
        calls.push(['newman', options]);
        if (startError) throw startError;
        const run = new EventEmitter();
        setImmediate(() => {
          if (failedUpload) {
            run.emit('request', null, { item: { name: 'Register - player' }, response: { code: 201, json: () => ({ user: { id: runId } }) } });
            run.emit('request', null, { item: { name: 'Photo - Upload Fixture' }, response: { code: 500 } });
          }
          callback(null, { run: { failures } });
        });
        return run;
      }};
      if (name === './teardown') return async options => {
        calls.push(['teardown', options]);
        if (cleanupError) throw cleanupError;
      };
      if (name === 'node:fs') return {
        mkdirSync() {}, writeFileSync: (file, content) => calls.push(['manifest', JSON.parse(content)]),
      };
      if (name === 'node:child_process') return { spawnSync: () => ({ status: 0, stdout: running ? 'postgres\nbackend-node\n' : '' }) };
      return require(name);
    };
    vm.runInNewContext(source('run.js'), {
      require: requireStub, __dirname,
      console: { error() {} },
      process: { env: {}, exit: code => resolve({ code, calls }) },
    });
  });
}

test('runner always tears down after pass, assertion failure, or startup exception', async () => {
  for (const options of [{}, { failures: [{}] }, { startError: new Error('startup') }]) {
    const result = await runner(options);
    assert.equal(result.code, options.failures || options.startError ? 1 : 0);
    assert.equal(result.calls.at(-1)[0], 'teardown');
    assert.match(result.calls.at(-1)[1].runId, /^[0-9a-f-]{36}$/);
    assert.equal(result.calls[0][1].reporter.htmlextra.skipSensitiveData, true);
  }
});

test('cleanup error fails a passing collection', async () => {
  assert.equal((await runner({ cleanupError: new Error('cleanup') })).code, 1);
});

test('missing Compose database prevents API execution', async () => {
  const result = await runner({ running: false });
  assert.equal(result.code, 1);
  assert.equal(result.calls.filter(([name]) => name === 'newman').length, 0);
});

test('uploading test user is recorded before an upload fails', async () => {
  const result = await runner({ failedUpload: true, failures: [{}] });
  assert.equal(result.code, 1);
  assert.deepEqual(result.calls.find(([name]) => name === 'manifest')[1], { uploadUserIds: [runId] });
});

function cleaner({ files = [], readError, sqlExit = 0, manifestData, uploadFiles = [] } = {}) {
  const calls = [];
  const fakeFs = {
    readdir: async directory => directory.endsWith('uploads') ? uploadFiles : files,
    readFile: async () => {
      if (readError) throw readError;
      return JSON.stringify(manifestData || [`/uploads/${runId}-123.svg`]);
    },
    rm: async file => calls.push(['rm', file]),
    unlink: async file => calls.push(['unlink', file]),
  };
  const requireStub = name => {
    if (name === 'node:fs/promises') return fakeFs;
    if (name === 'child_process') return { spawn(command, args, options) {
      calls.push(['spawn', command, args, options]);
      const child = new EventEmitter();
      child.stderr = new EventEmitter();
      child.stdin = { write: sql => calls.push(['sql', sql]), end: () => setImmediate(() => child.emit('close', sqlExit)) };
      return child;
    }};
    return require(name);
  };
  const module = { exports: {} };
  vm.runInNewContext(source('teardown.js'), { require: requireStub, module, __dirname, console, process });
  return { cleanup: module.exports, calls };
}

test('normal cleanup scopes SQL to its run and Compose to repository root', async () => {
  const { cleanup, calls } = cleaner();
  await cleanup({ runId });
  const sql = calls.find(([name]) => name === 'sql')[1];
  assert(!sql.includes("email LIKE 'pm-%@"));
  assert(sql.includes(`email LIKE 'pm-${runId}-%@picklerick.test'`));
  assert.equal(calls.find(([name]) => name === 'spawn')[3].cwd, path.resolve(__dirname, '../../..'));
});

test('standalone recovery removes only exact manifested photos and reserved accounts', async () => {
  const { cleanup, calls } = cleaner({ files: [`uploads-${runId}.json`, 'report.html', 'unrelated.json'] });
  await cleanup();
  assert.equal(calls.filter(([name]) => name === 'rm').length, 1);
  assert.equal(calls.find(([name]) => name === 'rm')[1], path.resolve(__dirname, `../../../backend-node/uploads/${runId}-123.svg`));
  assert(calls.find(([name]) => name === 'sql')[1].includes("email LIKE 'pm-%@picklerick.test'"));
});

test('file cleanup failure still attempts SQL and reports failure', async () => {
  const { cleanup, calls } = cleaner({ files: [`uploads-${runId}.json`], readError: new Error('file unavailable') });
  await assert.rejects(cleanup(), /file unavailable/);
  assert(calls.some(([name]) => name === 'sql'), 'database cleanup must not be skipped');
});

test('SQL cleanup failure is not reported as success', async () => {
  const { cleanup } = cleaner({ sqlExit: 1 });
  await assert.rejects(cleanup({ runId }), /psql exited with code 1/);
});

test('failed-upload recovery removes only files of the recorded disposable uploader', async () => {
  const testPhoto = `${runId}-123.svg`;
  const { cleanup, calls } = cleaner({
    files: [`uploads-${runId}.json`], manifestData: { uploadUserIds: [runId] },
    uploadFiles: [testPhoto, '22222222-2222-4222-8222-222222222222-123.svg', '.gitkeep'],
  });
  await cleanup();
  assert.deepEqual(calls.filter(([name]) => name === 'rm').map(([, file]) => path.basename(file)), [testPhoto]);
});
