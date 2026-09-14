'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { resolve } = require('node:path')

const getStream = require('../src/getStream')

const repoRoot = resolve(__dirname, '..')
const missing = resolve(repoRoot, 'no-such-path-here')

const readAll = async stream => {
  let out = ''
  for await (const chunk of stream) out += chunk
  return out
}

test('never throws synchronously, so the caller can always catch', () => {
  let result
  assert.doesNotThrow(() => { result = getStream(missing) })
  assert.ok(result instanceof Promise)
  result.catch(() => {})
})

test('rejects when the path does not exist', async () => {
  await assert.rejects(getStream(missing))
})

test('rejects on an unparseable url instead of throwing', async () => {
  let result
  assert.doesNotThrow(() => { result = getStream('http://[') })
  await assert.rejects(result)
})

test('reads a file given an absolute path', async () => {
  const body = await readAll(await getStream(resolve(repoRoot, '.env.example')))
  assert.match(body, /DB_NAME=larabel/)
})

test('reads .env.example when given a directory', async () => {
  const body = await readAll(await getStream(repoRoot))
  assert.match(body, /DB_NAME=larabel/)
})
