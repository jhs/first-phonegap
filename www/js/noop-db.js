var DB = new NoopDB

function NoopDB () {
}

NoopDB.prototype.search = function(options, callback) {
  console.log('Noop search: ' + JSON.stringify(options))

  var result =
    [ { latitude:16.2, longitude:101, timestamp:"2015-04-15T03:43:37.780Z"
      , description: "Me in the jungle", "tags":['me', 'holiday'], is_private: true
      }
    , { latitude:13, longitude:101, timestamp:"2015-03-15T03:43:37.780Z"
      , description: "Me at work", "tags":['me', 'work'], is_private: false
      }
    ]

  setTimeout(callback, 100, null, result)
}

NoopDB.prototype.store = function(photo, callback) {
  var kb = Math.round(photo.body.length / 1024)
  console.log('Store photo ('+kb+' kb): ' + JSON.stringify(photo.meta))

  setTimeout(callback, 50)
}
