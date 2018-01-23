require('now-env')
const { send } = require('micro')
const { router, get } = require('microrouter')
const photos = require('./lib/photos.js')

let cache

module.exports = async (req, res) => {
  cache = await photos.fetch()

  return router(
    get('/photos', (req, res) => {
      send(res, 200, cache)
    }),
    get('/photos/:id', (req, res) => {
      const match = cache.filter(photo => photo.id === req.params.id)[0]
      send(res, 200, match)
    })
  )(req, res)
}
