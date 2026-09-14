'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const questionize = require('../src/questionize')

const URL_VAR = {
  name: 'DB_URL',
  value: '${DB_PROTOCOL}://${DB_USER}@${DB_HOST}',
  params: [
    { param: '${DB_PROTOCOL}', name: 'DB_PROTOCOL' },
    { param: '${DB_USER}', name: 'DB_USER' },
    { param: '${DB_HOST}', name: 'DB_HOST' }
  ]
}

test('a plain variable becomes one question', () => {
  const q = questionize({ name: 'USER', value: 'root' })
  assert.equal(q.name, 'USER')
  assert.equal(q.message, 'USER:')
  assert.equal(typeof q.default, 'function')
})

test('the default prefers an existing answer, then the environment, then the template', t => {
  const { default: resolve } = questionize({ name: 'TEST_VAR_X', value: 'from-template' })

  assert.equal(resolve({}), 'from-template')

  process.env.TEST_VAR_X = 'from-env'
  t.after(() => { delete process.env.TEST_VAR_X })
  assert.equal(resolve({}), 'from-env')

  assert.equal(resolve({ TEST_VAR_X: 'from-answer' }), 'from-answer')
})

test('validate rejects an empty answer', () => {
  const { validate } = questionize({ name: 'USER', value: '' })
  assert.equal(validate(''), false)
  assert.equal(validate('root'), true)
})

test('a parameterised variable becomes a confirm, one question per param, and a result', () => {
  const qs = questionize(URL_VAR)
  assert.equal(qs.length, URL_VAR.params.length + 2)

  const [confirm, ...rest] = qs
  const result = rest.pop()

  assert.equal(confirm.type, 'confirm')
  assert.equal(confirm.name, '#DB_URL')
  assert.equal(confirm.default, true)
  assert.match(confirm.message({}), /DB_URL/)

  assert.deepEqual(rest.map(q => q.name), ['DB_PROTOCOL', 'DB_USER', 'DB_HOST'])
  assert.equal(result.name, 'DB_URL')
})

test('the param questions only appear once the confirm is accepted', () => {
  const [, param] = questionize(URL_VAR)
  assert.equal(param.prefix, '? DB_URL')
  assert.equal(param.when({ '#DB_URL': true }), true)
  assert.equal(param.when({ '#DB_URL': false }), false)
})

test('the result interpolates every param into the template', () => {
  const resolve = questionize(URL_VAR).at(-1).default
  assert.equal(
    resolve({ '#DB_URL': true, DB_PROTOCOL: 'postgres', DB_USER: 'ed', DB_HOST: 'localhost' }),
    'postgres://ed@localhost'
  )
})

test('the result keeps the raw template when the confirm was declined', () => {
  const resolve = questionize(URL_VAR).at(-1).default
  assert.equal(
    resolve({ '#DB_URL': false, DB_PROTOCOL: 'postgres', DB_USER: 'ed', DB_HOST: 'localhost' }),
    URL_VAR.value
  )
})

test('the result keeps the raw template when a param went unanswered', () => {
  const resolve = questionize(URL_VAR).at(-1).default
  assert.equal(
    resolve({ '#DB_URL': true, DB_PROTOCOL: 'postgres', DB_USER: 'ed' }),
    URL_VAR.value
  )
})
