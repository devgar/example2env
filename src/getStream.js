'use strict'

const { statSync } = require('fs')
const { resolve } = require('path')
const { pathToFileURL, fileURLToPath } = require('url')
const getUri = require('get-uri')
const got = require('got')

const PromiseSome = (promises) => Promise.allSettled(promises)
  .then(r => {
    const f = r.find(r_ => r_.status === 'fulfilled')
    if (!f) throw r[0].reason
    return f.value
  })

// The trailing slash matters: without it the URL parser treats the last
// path segment as a file name and drops it, so a relative argument used to
// resolve against the parent directory instead of the current one.
const base = pathToFileURL(process.cwd()).href + '/'
const GH_RAW_URL = 'https://raw.githubusercontent.com/'

const isDir = path => statSync(path, { throwIfNoEntry: false })?.isDirectory()

const getDir = dir => PromiseSome([
    getUri(pathToFileURL(resolve(dir, '.env.example')).href),
    getUri(pathToFileURL(resolve(dir, '.env')).href)
  ])

const gh = (repo, branch = 'master', file = '.env.example') =>
  `${GH_RAW_URL}/${repo}/${branch}/${file}`

const getGithubDefaultBranch = repo => {
  return got(`https://api.github.com/repos/${repo}`)
    .then(res => JSON.parse(res.body))
    .then(obj => obj.default_branch)
    .catch(err => { throw err })
  }

const getGithub = repo => getGithubDefaultBranch(repo)
  .then(branch => PromiseSome([
    getUri(gh(repo, branch)),
    getUri(gh(repo, branch, '.env'))
  ]))
  .catch(err => { throw err })

// async so that a bad url or an unreadable path rejects instead of throwing
// synchronously, which used to escape the caller's .catch entirely.
module.exports = async (u = '') => {
  const { href, protocol, pathname } = new URL(u, base)
  if (['github:','gh:'].includes(protocol))
    return getGithub(pathname)
  // pathname is percent-encoded, so it has to be decoded before it reaches
  // fs or path; get-uri decodes the href itself.
  if ('file:' === protocol) {
    const path = fileURLToPath(href)
    if (isDir(path)) return getDir(path)
  }
  return getUri(href)
}
