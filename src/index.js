#!/usr/bin/env node

'use strict'

const { writeFileSync } = require('fs')
const getStream = require('./getStream')
const parse = require('./parse')
const questionize = require('./questionize')

const inquirer = require('inquirer')

const prefix = '?   '

const renderData = (vars, ans) =>
  vars.map(({ name }) => `${name}=${ans[name]}`).join('\n')

const writeResult = body => writeFileSync('.env', body)

const p = process.argv[2] || ''

getStream(p)
  .then(stream => parse(stream))
  .then(vars => 
    Promise.all([vars, [].concat(...vars.map(questionize))]))
  .then(([vars, questions]) => 
    Promise.all([vars, inquirer.prompt(questions)]))
  .then(([vars, ans]) => renderData(vars, ans))
  .then(body => writeResult(body))
  .catch(err => console.error(err))
