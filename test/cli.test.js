'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { execFile } = require('node:child_process')
const { mkdtemp } = require('node:fs/promises')
const { tmpdir } = require('node:os')
const { join, resolve } = require('node:path')

const cli = resolve(__dirname, '..', 'src', 'index.js')

// Run in a scratch directory: the CLI writes .env into its working directory.
const run = async args => {
  const cwd = await mkdtemp(join(tmpdir(), 'example2env-'))
  return new Promise(done => {
    execFile(process.execPath, [cli, ...args], { cwd }, (err, stdout, stderr) =>
      done({ code: err ? err.code : 0, stdout, stderr }))
  })
}

test('exits non-zero when the source cannot be read', async () => {
  const { code } = await run(['./definitely-not-here'])
  assert.equal(code, 1)
})

test('reports a missing source as one readable line, not a stack trace', async () => {
  const { stderr } = await run(['./definitely-not-here'])
  assert.notEqual(stderr.trim(), '')
  assert.equal(stderr.trim().split('\n').length, 1)
  assert.doesNotMatch(stderr, /^\s+at .+:\d+:\d+\)?$/m)
})
