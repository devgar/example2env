#!/usr/bin/env node

'use strict';

const { readFileSync, writeFileSync } = require('fs')

const inquirer = require('inquirer')

const var_name_regex = /^(?:EXPORT )?(\w+)(?:\=)/i
const var_value_regex = /^(?:EXPORT )?(?:\w+)(?:\=)([^#]+)?/i
const var_param_regex = /\${(\w+)}/g

const prefix = '?   '

const parametrize = (param) => 
  ({ param, name: param.match(/\${(\w+)}/)[1] })

const extractVarName = (str) => 
  str.match(var_name_regex)?.[1]?.trim()
const extractVarValue = (str) => 
  (str.match(var_value_regex)?.[1] || '')?.trim()
const extractVarParams = (str) => 
  str.match(var_param_regex)?.map(parametrize)

const defaultize = (name, value) => (ans) => 
  ans[name] || process.env[name] || value

const paramsReduction = (ans) => (a, {param, name}) => 
  a.replace(param, ans[name])

const paramissedDefaultize = (name, value, params) => (ans) => 
  ans[`#${name}`] && params.every(({ name }) => ans[name])
    ? params.reduce(paramsReduction(ans), value)
    : value

const validate = (input) => !!input

const paramissedMessage = ({ name, params }) => (ans) =>
  `Complete «${name}» using its defined params?`

const confirmQuestionize = ({ name, params }) => ({
  type: 'confirm',
  name: `#${name}`, 
  message: paramissedMessage({ name, params}),
  default: true
})

const whenize = (parent) => parent && ((ans) => ans[`#${parent}`])

const optionalQuestionize = (parent) => ({ name }) =>
  ({ ...questionize({ name }), prefix: `? ${parent}`, when: whenize(parent) })

const paramissedQuestionize = ({ name, value, params }) => [
  confirmQuestionize({ name, value, params }),
  ...params.map(optionalQuestionize(name)),
  paramissedResultQuestionize({ name, value, params })
]

const paramissedResultQuestionize = ({ name, value, params }) =>
  ({ name, message: `${name}:`, default: paramissedDefaultize(name, value, params)})

const questionize = ({ name, value, params }) => params
  ? paramissedQuestionize({ name, value, params })
  : { name, message: `${name}:`, default: defaultize(name, value), validate }

const renderData = (vars, ans) =>
  vars.map(({ name }) => `${name}=${ans[name]}`).join('\n')

const writeResult = (body) => writeFileSync('.env', body)

const lines = readFileSync('.env.example', 'utf-8').split('\n')

const vars = lines.reduce((a, line) => {
  let name = extractVarName(line)
  if (!name) return a
  let value = extractVarValue(line)
  let params = extractVarParams(line)
  return [...a, { name, value, params }]
}, [])

const questions = vars.map(questionize).flat(1)

inquirer.prompt(questions)
.then(ans => renderData(vars, ans)).then(writeResult)
.catch(err => console.error('Error inside Inquirer', err))
