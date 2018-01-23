require('now-env')

const { send } = require('micro')
const { router, get } = require('microrouter')
const api = require('./api.js')
const { normalize } = require('./util.js')

let cache

module.exports = async (req, res) => {
  cache = await api.getEntries({ content_type: 'photo' })
    .then(({ items }) => normalize(items))
    .catch(e => {
      console.log('Initial photos fetch failed')
    })

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
