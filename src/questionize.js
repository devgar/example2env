'use strict'

const defaultize = (name, value) => ans =>
  ans[name] || process.env[name] || value

const paramsReduction = ans => (a, {param, name}) =>
  a.replace(param, ans[name])

const paramissedDefaultize = (name, value, params) => ans =>
  ans[`#${name}`] && params.every(({ name }) => ans[name])
    ? params.reduce(paramsReduction(ans), value)
    : value

const validate = input => !!input

const paramissedMessage = ({ name, params }) => ans =>
  `Complete «${name}» using its defined params?`

const confirmQuestionize = ({ name, params }) => ({
  type: 'confirm',
  name: `#${name}`,
  message: paramissedMessage({ name, params}),
  default: true
})

const whenize = parent => parent && (ans => ans[`#${parent}`])

const optionalQuestionize = parent => ({ name }) =>
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

module.exports = questionize