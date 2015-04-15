var DB = new PouchBacked

function PouchBacked () {
  this.db = new PouchDB('photos')
}

PouchBacked.prototype.onState = function(state) {
  //console.log('Noop DB state: ' + state)
}

PouchBacked.prototype.search = function(options, callback) {
  console.log('Noop search: ' + JSON.stringify(options))

  var result =
    [ { latitude:16.2, longitude:101, timestamp:"2015-04-15T03:43:37.780Z"
      , description: "Me in the jungle", "tags":['me', 'holiday'], is_private: true
      }
    , { latitude:13, longitude:101, timestamp:"2015-03-15T03:43:37.780Z"
      , description: "Me at work", "tags":['me', 'work', 'office'], is_private: false
      }
    , { latitude:13, longitude:101, timestamp:"2015-03-15T03:43:37.780Z"
      , description: "My chair", "tags":['me', 'work', 'chair'], is_private: false
      }
    ]

  setTimeout(callback, 1, null, result)
}

PouchBacked.prototype.store = function(photo, callback) {
  var kb = (photo.body.length / 1024).toFixed(1)
  console.log('Store photo ('+kb+' kb): ' + JSON.stringify(photo.meta))

  if (typeof callback != 'function')
    callback = function() {}

  var doc = JSON.parse(JSON.stringify(photo.meta))

  // Conver to more natural types.
  doc.is_private = (doc.is_private == 'true')
  doc.latitude = +doc.latitude || null
  doc.longitude = +doc.longitude || null

  // Make the tags keys in an object to de-dupe, and to search with $exists
  doc.tags = {}
  photo.meta.tags.split(/\s+/).forEach(function(tag) {
    tag = tag.trim().toLowerCase()
    doc.tags[tag] = 1
  })

  doc._attachments = {photo:{content_type:null, data:null}}
  console.log('Doc before attachment: ' + JSON.stringify(doc))

  var match = photo.body.match(/^data:image\/jpeg;base64,(.*)$/)
  if (match) {
    console.log('Attach inline Base64 JPEG')
    doc._attachments.photo.content_type = 'image/jpeg'
    doc._attachments.photo.data = match[1]
  }

  var match = photo.body.match(/^data:image\/png;base64,(.*)$/)
  if (match) {
    console.log('Attach inline Base64 PNG')
    doc._attachments.photo.content_type = 'image/png'
    doc._attachments.photo.data = match[1]
  }

  if (! doc._attachments.photo.content_type)
    return console.log('ERROR: Unknown image to attach')

  console.log('Store doc')
  this.db.post(doc, function(er, res) {
    if (er) {
      console.log('Pouch error: '+er.name+': ' + er.message)
      return callback(er)
    }

    console.log('Saved photo: ' + JSON.stringify(res))
    callback(null)
  })
}

PouchBacked.prototype.online = function() {
  var self = this

  console.log('Noop DB: online')
  self.onState('Syncing...')
  setTimeout(function() { self.onState('Up to date') }, 3000)
}

PouchBacked.prototype.offline = function() {
  console.log('Noop DB: offline')
  this.onState('')
}
