'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { execFile } = require('node:child_process')
const { mkdtemp, mkdir, writeFile } = require('node:fs/promises')
const { tmpdir } = require('node:os')
const { join, resolve } = require('node:path')

const getStreamPath = resolve(__dirname, '..', 'src', 'getStream.js')

// getStream resolves relative arguments against process.cwd() captured at
// require time, so each case needs its own child process.
const readFrom = (cwd, arg) => new Promise(done => {
  const script = `
    require(${JSON.stringify(getStreamPath)})(process.argv[1])
      .then(async stream => {
        let out = ''
        for await (const chunk of stream) out += chunk
        process.stdout.write(out)
      })
      .catch(err => { process.stderr.write(String(err.message)); process.exitCode = 1 })
  `
  execFile(process.execPath, ['-e', script, arg], { cwd }, (err, stdout, stderr) =>
    done({ stdout, stderr, code: err ? err.code : 0 }))
})

// A working directory holding its own .env.example, plus a sub/ holding
// another. Reading the wrong one is the bug, so they must be distinguishable.
const scratch = async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'example2env-paths-'))
  await writeFile(join(cwd, '.env.example'), 'FROM=root\n')
  await mkdir(join(cwd, 'sub'))
  await writeFile(join(cwd, 'sub', '.env.example'), 'FROM=sub\n')
  return cwd
}

test('a ./ relative path reads below the working directory', async () => {
  const cwd = await scratch()
  assert.match((await readFrom(cwd, './sub')).stdout, /FROM=sub/)
})

test('a bare relative path reads below the working directory', async () => {
  const cwd = await scratch()
  assert.match((await readFrom(cwd, 'sub')).stdout, /FROM=sub/)
})

test('a "." argument reads the working directory', async () => {
  const cwd = await scratch()
  assert.match((await readFrom(cwd, '.')).stdout, /FROM=root/)
})

test('no argument reads the working directory itself', async () => {
  const cwd = await scratch()
  assert.match((await readFrom(cwd, '')).stdout, /FROM=root/)
})

test('an absolute path is still honoured', async () => {
  const cwd = await scratch()
  assert.match((await readFrom(cwd, join(cwd, 'sub'))).stdout, /FROM=sub/)
})
