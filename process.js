const path = require('path')
const fs = require('fs-extra')
const jimp = require('jimp')
const log = require('log-update')

function write (img, p, name) {
  return img.writeAsync(path.join('static', p, name))
}

function watermark (img) {
  return jimp.loadFont(jimp.FONT_SANS_32_WHITE)
    .then(font => {
      return img.print(font, 0, 0, {
        text: 'STARTUP STOCK',
        alignmentX: jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: jimp.VERTICAL_ALIGN_MIDDLE
      }, 1000)
    })
}

function gen (filepath) {
  const name = path.basename(filepath, '.jpg')

  return Promise.all([
    jimp.read(filepath)
      .then(img => img.resize(800, jimp.AUTO))
      .then(img => img.pixelate(20))
      .then(img => img.quality(30))
      .then(img => write(img, name, 'placeholder.jpg')),
    jimp.read(filepath)
      .then(img => img.resize(2000, jimp.AUTO))
      .then(img => img.quality(50))
      // .then(watermark)
      .then(img => write(img, name, 'display.jpg'))
  ])
}

/**
 * Process
 */
const { _: args } = require('minimist')(process.argv.slice(2))

fs.ensureDir('static')

if (args[0] === 'all') {
  let count = 0

  fs.readdir('raw', (err, files) => {
    files = files.map(f => path.join('raw', f))

    const length = files.length

    log(`processing ${length} files`)

    ;(function process (file) {
      gen(file).then(() => {
        log(`processed ${++count} of ${length} files`)

        if (files.length) {
          process(files.pop())
        } else {
          log('processing complete')
        }
      })
    })(files.pop())
  })
} else if (/\.jpg/.test(args[0])) {
  log(`processing ${args[0]}`)

  gen(path.resolve(args[0])).then(() => {
    log('processing complete')
  })
}
