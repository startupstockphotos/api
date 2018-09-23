const url = require('url')
const qs = require('qs')
const Fuse = require('fuse.js')
const api = require('router')()
const fetch = require('node-fetch')
const database = require('./database.js')

const { NOW } = process.env

const origin = NOW ? 'https://ssp-static.now.sh' : 'http://localhost:3002'

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

  api.get('/photos', (req, res) => {
    const args = qs.parse(url.parse(req.url) || '')

    const limit = args.limit ? parseInt(args.limit) : 24
    const page = args.page ? parseInt(args.page) : null
    const offset = args.offset ? parseInt(args.offset) : null

    let results

    if (page !== null || offset !== null) {
      const start = offset || (limit * page || 0)
      const end = ((page || 0) + 1) * limit
      results = db.slice(start, end)
    } else {
      results = db.slice(0, limit)
    }

    res.end(JSON.stringify(results))
  })

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

  api.get('/search/:query', (req, res) => {
    const { query } = req.params

    res.end(JSON.stringify(index.search(query)))
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

