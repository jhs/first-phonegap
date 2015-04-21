var DBClass = PouchBacked

function PouchBacked () {
  var self = this

  self.db = new PouchDB('photos')
  self.replication = {'db': 'https://jhs.cloudant.com/photos', 'in':null, 'out':null}

  self.indexer = new Promise(build_index)
  self.indexer.then(function() {
    console.log('Pouch index ready')
  })

  function build_index(on_ok, on_er) {
    console.log('Build location index')

    var index = {fields:['latitude', 'longitude']}
    self.db.createIndex({index:index}, function(er, res) {
      if (er) {
        console.log('Pouch index failed: ' + er.message)
        return on_er(er)
      }

      console.log('Build tag index')
      var index = {fields: ['tags']}
      self.db.createIndex({index:index}, function(er, res) {
        if (er) {
          console.log('Pouch tags index failed: ' + er.message)
          return on_er(er)
        }

        console.log('Pouch tags index: ' + res.result)
        on_ok()
      })
    })
  }
}

PouchBacked.prototype.onState = function(state) {
  // This function will be replaced by the user.
}

PouchBacked.prototype.search = function(options, callback) {
  var self = this
  self.indexer.then(function() {
    self._search(options, callback)
  })
}

PouchBacked.prototype._search = function(options, callback) {
  var self = this
  console.log('Photo search: ' + JSON.stringify(options))

  var conditions = []
  var search_tag = normalize_tag(options.term)
  if (search_tag)
    conditions.push({tags: {$exists: true}})

  // A "near" query is within 1 degree of latitude and longitude either way.
  if (options.near) {
    conditions.push({latitude : {$gt: options.near.latitude  - 1}})
    conditions.push({latitude : {$lt: options.near.latitude  + 1}})
    conditions.push({longitude: {$gt: options.near.longitude - 1}})
    conditions.push({longitude: {$lt: options.near.longitude + 1}})
  }

  if (conditions.length == 0)
    var query = {tags: {$exists: true}} // Match all photos
  else if (conditions.length == 1)
    var query = conditions[0]
  else
    var query = {$and: conditions}

  console.log('PouchDB Query: ' + JSON.stringify(query))
  return this.db.find({selector:query}, function(er, res) {
    if (er) {
      console.log('Pouch error: '+er.name+': ' + er.message)
      return callback(er)
    }

    var result = res.docs
    if (search_tag)
      result = res.docs.filter(function(doc) {
        return ~doc.tags.indexOf(search_tag)
      })

    console.log('Docs with tag: '+result.length + '/' + res.docs.length)
    //console.log(JSON.stringify(res.docs))
    callback(null, result)
  })
}

PouchBacked.prototype.store = function(photo, callback) {
  var self = this

  var kb = (photo.body.length / 1024).toFixed(1)
  console.log('Store photo ('+kb+' kb): ' + JSON.stringify(photo.meta))

  if (typeof callback != 'function')
    callback = function() {}

  var doc = JSON.parse(JSON.stringify(photo.meta))

  // Conver to more natural types.
  doc.is_private = (doc.is_private == 'true')
  doc.latitude = +doc.latitude || null
  doc.longitude = +doc.longitude || null

  // De-dupe the tags and store them sorted.
  doc.tags = {}
  photo.meta.tags.split(/\s+/).forEach(function(tag) {
    tag = normalize_tag(tag)
    if (tag)
      doc.tags[tag] = 1
  })
  doc.tags = Object.keys(doc.tags).sort()

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
  self.db.post(doc, function(er, res) {
    if (er) {
      console.log('Pouch error: '+er.name+': ' + er.message)
      return callback(er)
    }

    // Log the cloud URL for debugging.
    var cloud_url = self.replication.db + '/' + res.id + '/photo'
    console.log('Saved photo ' + res.id + '; cloud URL: ' + cloud_url)

    callback(null)
  })
}

PouchBacked.prototype.online = function() {
  var self = this

  console.log('PouchDB: online')
  self.db.info(function(er, info) {
    console.log('DB info: ' + JSON.stringify([er, info]))
    if (er)
      return console.log('ERROR: Info lookup: ' + er.message)
    self.replicate(info.db_name)
  })
}

PouchBacked.prototype.replicate = function(db_name) {
  var self = this

  var db_url = self.replication.db
  var opts = {live:true, retry:true}

  // Track the state of both replications.
  var state = {'in':'syncing', 'out':'syncing'}
  function set_state(dir, value) {
    console.log('State: '+dir+' = ' + value)
    state[dir] = value
    if (state.in == 'catchup' && state.out == 'catchup')
      self.onState('Up to date', true)
    else
      self.onState('Syncing...')
  }

  if (!self.replication.in) {
    console.log('Begin replication: in')
    self.replication.in = self.db.replicate.from(self.replication.db, opts)
    self.replication.in.on('paused', on_pause('in'))
    self.replication.in.on('active', on_active('in'))
    self.replication.in.on('error' , on_error('in'))
  }

  if (!self.replication.out) {
    console.log('Begin replication: out')
    self.replication.out = self.db.replicate.to(self.replication.db, opts)
    self.replication.out.on('paused', on_pause('out'))
    self.replication.out.on('active', on_active('out'))
    self.replication.out.on('error' , on_error('out'))
  }

  function on_pause(dir) {
    return function (er) {
      if (er)
        console.log('Replication '+dir+' pause with error: ' + er.message)
      else {
        console.log('Replication '+dir+' caught up')
        set_state(dir, 'catchup')
      }
    }
  }

  function on_active(dir) {
    return function() {
      console.log('Replication active: ' + dir)
      set_state(dir, 'syncing')
    }
  }

  function on_error(dir) {
    return function(er) {
      console.log('ERROR Stop replication '+dir+': ' + er.message)
      self.replication[dir].cancel()
    }
  }
}

PouchBacked.prototype.offline = function() {
  console.log('PouchDB: offline')
  this.onState('')
}

// Used for debugging.
PouchBacked.prototype.destroy = function(callback) {
  this.db.destroy(function(er, res) {
    if (er)
      return callback(er)

    console.log('Destroy DB: ' + JSON.stringify(res))
    callback(null, res)
  })
}

function normalize_tag(str) {
  if (typeof str != 'string')
    str = ''
  return str.toLowerCase().replace(/[^a-z]/g, '')
}
