require('now-env')

const { send, json } = require('micro')
const { router, get, post } = require('microrouter')
const cors = require('micro-cors')()
const Fuse = require('fuse.js')
const api = require('./api.js')
const { normalize } = require('./util.js')

let cache
let search
let paginateBy = 100

async function getPhotos (force) {
  if (!cache || force) {
    cache = null
    cache = await api.getEntries({ content_type: 'photo', limit: 999 })
      .then(({ items }) => normalize(items))
      .catch(e => {
        console.log('Initial photos fetch failed')
      })
  }
  return cache
}

function createSearch () {
  search = null
  return new Fuse(cache, {
    keys: ['title', 'descriptors', 'description']
  })
}

module.exports = async (req, res) => {
  cache = await getPhotos()
  search = createSearch()

  return router(
    get('/photos', cors((req, res) => {
      const q = req.query.q
      const page = req.query.page || 0
      const offset = page > 0 ? paginateBy * (page - 1) : 0
      const length = page > 1 ? paginateBy * page : paginateBy

      if (q) {
        console.log('query')
        const results = search.search(q)
        const paginated = results.slice(offset, length)
        send(res, 200, paginated)
      } else {
        console.log('no query')
        const paginated = cache.slice(offset, length)
        send(res, 200, paginated)
      }
    })),
    get('/photos/:id', cors((req, res) => {
      const match = cache.filter(photo => photo.id === req.params.id)[0]
      send(res, 200, match)
    }))
  )(req, res)
}
