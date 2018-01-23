function normalize (photos) {
  return photos
    .map((photo, i) => Object.assign({
      id: photo.sys.id,
      title: photo.fields.title,
      descriptors: photo.fields.descriptors
    }, photo.fields.image.fields))
}

module.exports = {
  normalize
}
