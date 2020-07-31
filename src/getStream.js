const { statSync } = require('fs')
const { resolve } = require('path')
const getUri = require('get-uri')
const got = require('got')

const PromiseSome = (promises) => Promise.allSettled(promises)
  .then(r => console.log(r.map(r_ => r_.status)) || r)
  .then(r => {
    const f = r.find(r_ => r_.status === 'fulfilled')
    if (!f) throw r[0].reason
    return f.value
  })

const base = 'file:' + process.cwd()
const GH_RAW_URL = 'https://raw.githubusercontent.com/'

const isDir = path => statSync(path).isDirectory()

const getDir = pathname => PromiseSome([
    getUri('file:' + resolve(pathname, '.env.example')),
    getUri('file:' + resolve(pathname, '.env'))
  ])
  .catch(err => { throw err })

const gh = (repo, branch = 'master', file = '.env.example') =>
  `${GH_RAW_URL}/${repo}/${branch}/${file}`

const getGithubDefaultBranch = repo => {
  console.log(`-- Fetching https://api.github.com/repos/${repo}`)
  return got(`https://api.github.com/repos/${repo}`)
    .then(res => JSON.parse(res.body))
    .then(obj => obj.default_branch)
    .then(branch => console.log('default branch:', branch) || branch)
    .catch(err => { throw err })
  }

const getGithub = repo => getGithubDefaultBranch(repo)
  .then(branch => PromiseSome([
    getUri(gh(repo, branch)),
    getUri(gh(repo, branch, '.env'))
  ]))
  .catch(err => { throw err })

module.exports =  (u = '') => {
  const { href, protocol, pathname } = new URL(u, base)
  if (!protocol) throw new Error('Invalid Url')
  if (['github:','gh:'].includes(protocol))
    return getGithub(pathname)
  if ('file:' === protocol && isDir(pathname))
    return getDir(pathname)
  return getUri(href)
}
