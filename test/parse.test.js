'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { Readable } = require('node:stream')

const parse = require('../src/parse')

const parseLines = (...lines) => parse(Readable.from([lines.join('\n')]))
const parseOne = async line => (await parseLines(line))[0]

test('ignores comments and blank lines', async () => {
  assert.deepEqual(await parseLines('# a comment', '  # indented', '', '   '), [])
})

test('reads a name and its value', async () => {
  const { name, value } = await parseOne('DB_NAME=larabel')
  assert.equal(name, 'DB_NAME')
  assert.equal(value, 'larabel')
})

test('reads a declared but empty value', async () => {
  const { name, value } = await parseOne('DISPLAY=')
  assert.equal(name, 'DISPLAY')
  assert.equal(value, '')
})

test('strips an inline comment from the value', async () => {
  assert.equal((await parseOne('USER=root # the admin')).value, 'root')
  assert.equal((await parseOne('DB_PASS= # to be filled')).value, '')
})

test('accepts an export prefix, in any case', async () => {
  assert.equal((await parseOne('export PATH=/usr/bin')).name, 'PATH')
  assert.equal((await parseOne('EXPORT PATH=/usr/bin')).value, '/usr/bin')
})

test('keeps equals signs inside the value', async () => {
  assert.equal((await parseOne('QUERY=a=1&b=2')).value, 'a=1&b=2')
})

test('extracts ${...} parameters', async () => {
  const { value, params } = await parseOne('DB_URL=${DB_USER}:${DB_PASS}@${DB_HOST}')
  assert.equal(value, '${DB_USER}:${DB_PASS}@${DB_HOST}')
  assert.deepEqual(params.map(p => p.name), ['DB_USER', 'DB_PASS', 'DB_HOST'])
  assert.deepEqual(params.map(p => p.param), ['${DB_USER}', '${DB_PASS}', '${DB_HOST}'])
})

test('leaves params undefined when the value has none', async () => {
  assert.equal((await parseOne('USER=root')).params, undefined)
})

test('reads every declaration in a multi-line stream', async () => {
  const vars = await parseLines('# header', 'A=1', '', 'B=2', 'C=')
  assert.deepEqual(vars.map(v => v.name), ['A', 'B', 'C'])
})

// Documents current behaviour, not desired behaviour: a bare `NAME` with no
// `=` is silently dropped, so it never gets prompted for. Change this test
// when that is fixed.
test('currently drops a declaration with no equals sign', async () => {
  assert.deepEqual(await parseLines('DB_HOST'), [])
})
