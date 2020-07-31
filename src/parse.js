const readline = require('readline');

const var_name_regex = /^(?:EXPORT )?(\w+)(?:\=)/i
const var_value_regex = /^(?:EXPORT )?(?:\w+)(?:\=)([^#]+)?/i
const var_param_regex = /\${(\w+)}/g

const parametrize = param =>
  ({ param, name: param.match(/\${(\w+)}/)[1] })

const extractVarName = str =>
  str.match(var_name_regex)?.[1]?.trim()
const extractVarValue = str =>
  (str.match(var_value_regex)?.[1] || '')?.trim()
const extractVarParams = str =>
  str.match(var_param_regex)?.map(parametrize)

const extract = (stream) => new Promise((accept, _reject) => {
  const rl = readline.createInterface({
    input: stream,
    output: process.stdout,
    terminal: false
  })

  const array = new Array()
  
  rl.on('line', (line) => {
    let name = extractVarName(line)
    if (!name) return
    let value = extractVarValue(line)
    let params = extractVarParams(line)
    array.push({ name, value, params })
  })

  rl.on('close', () => {
    accept(array)
  })
})

module.exports = extract
