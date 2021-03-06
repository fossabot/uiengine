const assert = require('assert')
const path = require('path')

const Markdown = require('../src/util/markdown')

describe('Markdown', () => {
  describe('#fromFile', () => {
    it('should return rendered markdown', done => {
      Markdown.fromFile(path.join(__dirname, 'fixtures/markdown.md'))
        .then(data => {
          assert.equal(data, '<h1 id="homepage">Homepage</h1>\n<p>Welcome!</p>')
          done()
        })
        .catch(done)
    })
  })

  describe('#fromString', () => {
    it('should return rendered markdown', done => {
      Markdown.fromString('# Homepage\n\nWelcome!')
        .then(data => {
          assert.equal(data, '<h1 id="homepage">Homepage</h1>\n<p>Welcome!</p>')
          done()
        })
        .catch(done)
    })
  })
})
