const api = require('./contentful.js')

let cache

function normalize (photos) {
  return photos
    .map((photo, i) => Object.assign({
      id: photo.sys.id,
      title: photo.fields.title,
      descriptors: photo.fields.descriptors
    }, photo.fields.image.fields))
}

module.exports = {
  fetch (force) {
    if (!cache || force) {
      cache = api.getEntries({ content_type: 'photo' })
        .then(({ items }) => normalize(items))
        .catch(e => {
          console.log('Initial photos fetch failed')
        })
    }

    return cache
  },
  refetch () {
    return this.fetch(true)
  }
}
