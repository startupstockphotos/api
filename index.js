const url = require('url')
const qs = require('qs')
const Fuse = require('fuse.js')
const api = require('router')()
const fetch = require('node-fetch')
const database = require('./database.js')

const { NOW } = process.env

const origin = NOW ? 'https://ssp-static.now.sh' : 'http://localhost:3002'

function paginate (arr, query) {
  const limit = query.limit ? parseInt(query.limit) : 24
  const page = query.page ? parseInt(query.page) : null
  const offset = query.offset ? parseInt(query.offset) : null

  let results

  if (page !== null || offset !== null) {
    const start = offset || (limit * page || 0)
    const end = ((page || 0) + 1) * limit
    results = arr.slice(start, end)
  } else {
    results = arr.slice(0, limit)
  }

  return results
}

Promise.all(
  database.map(({ id, tags, description }) => ({
    id,
    tags,
    description,
    stats: `${origin}/photos/processed/${id}/stats.json`,
    images: {
      placeholder: `${origin}/photos/processed/${id}/placeholder.jpg`,
      display: `${origin}/photos/processed/${id}/display.jpg`,
      raw: `${origin}/photos/raw/${id}.jpg`
    }
  }))
    .reverse()
    .map(image => {
      return fetch(image.stats)
        .then(res => res.json())
        .then(stats => Object.assign(image, {
          stats
        }))
    })
).then(db => {
  const index = new Fuse(db, {
    keys: [
      'tags',
      'description'
    ]
  })

  /**
   * Indexing
   */
  api.get('/photos', (req, res) => {
    const args = qs.parse(url.parse(req.url).query || '')
    const photos = paginate(db, args)

    res.end(JSON.stringify({
      hits: db.length,
      pages: Math.ceil(db.length / (args.limit || 24)),
      photos
    }))
  })

  /**
   * Search
   */
  api.get('/search/:query', (req, res) => {
    const { query } = req.params

    const hits = index.search(query)
    const args = qs.parse(url.parse(req.url).query || '')
    const photos = paginate(hits, args)

    res.end(JSON.stringify({
      query,
      hits: hits.length,
      pages: Math.ceil(hits.length / (args.limit || 24)),
      photos
    }))
  })

  /**
   * Single photo
   */
  api.get('/photos/:id', (req, res) => {
    const { id } = req.params
    const photo = db.filter(i => i.id === id)[0]

    if (photo) {
      res.end(JSON.stringify(photo))
    } else {
      res.statusCode = 404
      res.end(JSON.stringify({
        errors: [
          `photo ${id} does not exist`
        ]
      }))
    }
  })

  require('connect')()
    .use(require('compression')())
    .use((req, res, next) => {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Access-Control-Allow-Origin', '*')
      next()
    })
    .use('/api/v1', api)
    .use((req, res) => {
      res.end(JSON.stringify({
        message: 'Welcome to the Startup Stock Photos API'
      }))
    })
    .listen(3001, () => {
      console.log('api running on 3001')
    })
})

