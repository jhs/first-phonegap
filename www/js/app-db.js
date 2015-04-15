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
  var kb = Math.round(photo.body.length / 1024)
  console.log('Store photo ('+kb+' kb): ' + JSON.stringify(photo.meta))

  setTimeout(callback, 10)
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
