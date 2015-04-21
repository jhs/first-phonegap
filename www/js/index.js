var IS_TOUCH = ('ontouchstart' in window)
var CLICK = IS_TOUCH ? 'touchend' : 'click'
var DB = null
var FS = null

document.addEventListener('deviceready', onDeviceReady)

function onDeviceReady() {
  console.log('Device ready: ' + JSON.stringify(device))
  DB = new DBClass

  init_fs()

  // Listen to network events and manually kick-off the first one.
  document.addEventListener('online', onOnline)
  document.addEventListener('offline', onOffline)
  DB.onState = on_db_state
  if (navigator.connection.type == 'none')
    onOffline()
  else
    onOnline()

  if (typeof jQuery != 'function')
    return console.log('Error: jQuery not found')
  if (! jQuery.mobile)
    return console.log('Error: jQuery.mobile not found')

  // For development
  if (0) return DB.destroy(function(er) { if (!er) $('body').html('Cleaned') })

  StatusBar.overlaysWebView(false)
  StatusBar.styleDefault()

  go_to('')
  navigator.splashscreen.hide()

  fix_browser_photo()
  console.log('Start')

  search_photos()

  // Interactivity
  jQuery('#camera-button').on(CLICK, take_photo)
  jQuery('#library-button').on(CLICK, photo_from_library)
  jQuery('#form-photo').submit(save_photo)
  jQuery('#form-photo a.cancel').on(CLICK, clear_photo_form)

  jQuery('#form-search').submit(on_search_input)
  jQuery('#photo-search-near').change(on_search_input)
}

function init_fs() {
  if (!cordova.file || typeof requestFileSystem != 'function')
    return console.log('No filesystem support')

  console.log('Initialize filesystem')
  Object.keys(cordova.file).forEach(function(key) {
    console.log('  ' + key + ': ' + cordova.file[key])
  })

  requestFileSystem(LocalFileSystem.PERSISTENT, 0, fs_ok, fs_err('requestFileSystem'))

  function fs_ok(fs) {
    console.log('Filesystem online')
    FS = fs
  }
}

function fs_err(label, callback) {
  var codes = []
  Object.keys(FileError).forEach(function(key) {
    if (key.match(/_ERR$/))
      codes.push(key)
  })

  return err_reporter

  function err_reporter(er) {
    var msg = (er && er.code) || 'Unknown error'
    for (var i = 0; i < codes.length; i++)
      if (er && er.code == FileError[ codes[i] ])
        msg = codes[i]

    console.log('ERROR Filesystem '+label+': ' + msg)
    if (callback)
      callback(er)
  }
}

function on_search_input(ev) {
  console.log('Re-run photo search')
  ev.preventDefault()

  jQuery('input#photo-search').blur()
  search_photos()
}

function search_photos() {
  getCurrentPosition(function(er, pos) {
    var query = {}
    var is_nearby_search = (jQuery('select[name="photo-search-near"]').val() == 'true')

    if (er)
      console.log('No position information: ' + er.code+': ' + er.message)
    else if (is_nearby_search && pos && pos.coords)
      query.near = {latitude:pos.coords.latitude, longitude:pos.coords.longitude}

    query.term = jQuery('input#photo-search').val()

    DB.search(query, function(er, photos) {
      if (er)
        console.log('Error searching photos: ' + er.message)
      else
        photo_results(photos)
    })
  })
}

function photo_results(photos) {
  console.log('Photo results: ' + photos.length)

  var result = jQuery('#search-result')
  result.empty()

  row('Photos', photos.length)

  // Count the private photos and the tags.
  var private_count = 0
  var tags = {}

  for (var i = 0; i < photos.length; i++) {
    if (photos[i].is_private)
      private_count += 1

    photos[i].tags.forEach(function(tag) {
      tags[tag] = 1 + (tags[tag] || 0)
    })
  }

  row('Private photos', private_count)

  // Display the top 3 tags.
  tags = Object.keys(tags).map(function(name) { return {name:name, count:tags[name]} })
  tags.sort(cmp_tag_tuple)
  if (tags.length > 0) {
    row('&nbsp;', '&nbsp;')
    result.append('<div class="ui-block-a"><h3 class="tag-heading">Tags</h3></div>')

    tags.forEach(function(tag, i) {
      if (i < 3)
        row(tag.name, tag.count)
    })
  }

  function row(key, val) {
    result.append('<div class="ui-block-a">' + key + '</div>')
    result.append('<div class="ui-block-b">' + val + '</div>')
  }

  function cmp_tag_tuple(A, B) {
    // Make the sort descending, so B - A.
    return B.count - A.count
  }
}

function photo_from_library(ev) {
  return take_photo(ev, Camera.PictureSourceType.SAVEDPHOTOALBUM)
}

function take_photo(ev, sourceType) {
  ev.preventDefault()

  if (typeof sourceType != 'number')
    sourceType = Camera.PictureSourceType.CAMERA

  var opts = { quality : 50,
               sourceType: sourceType,
               mediaType: Camera.MediaType.PICTURE,
               //allowEdit : true,
               encodingType: Camera.EncodingType.JPEG,
               cameraDirection: Camera.Direction.FRONT,
               //popoverOptions: CameraPopoverOptions,
               saveToPhotoAlbum: false
             }

  // This is rough. PhoneGap Developer cannot load file:/// URLs, and the iOS app cannot support data URLs.
  var destType = 'DATA_URL'
  var os = pg_platform()
  if (os == 'PG') {
    opts.targetWidth = 500
    opts.targetHeight = 500
  } else if (os == 'iOS')
    destType = 'FILE_URI'

  console.log('Photo destination type for '+os+': ' + destType)
  opts.destinationType = Camera.DestinationType[destType]

  console.log('Take photo: ' + JSON.stringify(opts))
  navigator.camera.getPicture(function(ok) { done(null, ok) }, function(er) { done(er) }, opts);

  function done(er, photo) {
    if (er)
      return console.log('Camera error: ' + er)
    if (! photo)
      return console.log('Error: no photo returned')

    console.log('Got photo; length: ' + photo.length)
    if (photo.length < 300)
      console.log('Photo data: ' + photo)
    go_to('#prep-photo')

    if (photo.match(/^file:\/\/\//)) {
      console.log('Set to the url: ' + photo)
      jQuery('.new-photo').attr('src', photo)
    } else if (pg_platform() == 'browser')
      jQuery('.new-photo').attr('src', 'data:image/png;base64,' + photo)
    else
      jQuery('.new-photo').attr('src', 'data:image/jpeg;base64,' + photo)

    getCurrentPosition(function(er, pos) {
      if (er)
        return console.log('No position information: ' + er.code+': ' + er.message)

      var ts = pos.timestamp
      if (typeof ts == 'number')
        ts = new Date(ts)

      // Always set the timestamp but for library photos, do not use the current position.
      $('input[name="form-photo-timestamp"]').val(ts.toJSON())

      if (sourceType == Camera.PictureSourceType.SAVEDPHOTOALBUM) {
        console.log('No location information for image from photo album')
        $('input[name="form-photo-latitude"]').val('')
        $('input[name="form-photo-longitude"]').val('')
      } else {
        $('input[name="form-photo-latitude"]').val(pos.coords.latitude)
        $('input[name="form-photo-longitude"]').val(pos.coords.longitude)
      }
    })
  }
}

function save_photo(ev) {
  console.log('Save photo')
  ev.preventDefault()

  var src = jQuery('img.new-photo').attr('src')
  var meta = {}
  meta.latitude    = jQuery('input[name="form-photo-latitude"]').val()
  meta.longitude   = jQuery('input[name="form-photo-longitude"]').val()
  meta.timestamp   = jQuery('input[name="form-photo-timestamp"]').val()
  meta.description = jQuery('input[name="form-photo-description"]').val()
  meta.tags        = jQuery('input[name="form-photo-tags"]').val()
  meta.is_private  = jQuery('select[name="form-photo-private"]').val()

  console.log('Photo src '+src.length+' bytes: ' + JSON.stringify(meta))

  go_to('')
  clear_photo_form()

  if (src.match(/^data:/))
    send_to_db(src)
  else if(src.match(/^file:\/\//))
    fs_read_base64(src, function(er, data_url) {
      if (er)
        return console.log('ERROR Failed to read photo URL: ' + er.message)
      else
        send_to_db(data_url)
    })
  else
    console.log('ERROR: Do not know how to save photo')

  function send_to_db(data_url) {
    DB.store({body:data_url, meta:meta}, function(er, res) {
      if (er)
        console.log('Photo store error: ' + er.message)
      else
        search_photos() // Re-populate the search results.
    })
  }
}

function clear_photo_form(ev) {
  jQuery('#form-photo input').val('')
  jQuery('#form-photo select').val('false').slider('refresh')
}

function onOnline() {
  jQuery('#network-status').html('Online')
  DB.online()
}

function onOffline() {
  jQuery('#network-status').html('Offline')
  DB.offline()
}

function on_db_state(state, is_refresh) {
  var element = jQuery('#network-status')
  var label = element.html()
  label = label.replace(/\|.*$/, '')
  if (state)
    label += ' | ' + state

  element.html(label)

  if (is_refresh) {
    console.log('Refresh photos after DB sync')
    search_photos()
  }
}

var position_cache = null
function getCurrentPosition(callback) {
  if (position_cache)
    return callback(null, position_cache)

  return navigator.geolocation.getCurrentPosition(on_ok, on_er)

  function on_er(er) { callback(er) }
  function on_ok(pos) {
    console.log('Latitude: '          + pos.coords.latitude        )
    console.log('Longitude: '         + pos.coords.longitude       )
    console.log('Altitude: '          + pos.coords.altitude        )
    console.log('Accuracy: '          + pos.coords.accuracy        )
    console.log('Altitude Accuracy: ' + pos.coords.altitudeAccuracy)
    console.log('Heading: '           + pos.coords.heading         )
    console.log('Speed: '             + pos.coords.speed           )
    console.log('Timestamp: '         + pos.timestamp              )

    position_cache = pos
    callback(null, pos)
  }
}

//
// Miscellaneous
//

function fs_read_base64(url, callback) {
  console.log('Read base64: ' + url)

  if (!FS)
    return callback(new Error('Filesystem not online or supported'))

  resolveLocalFileSystemURI(url, on_resolve, fs_err('resolveLocalFileSystemURI', callback))

  function on_resolve(entry) {
    console.log('Found file: ' + url)
    entry.file(on_file, fs_err('entry.file', callback))

    function on_file(file) {
      console.log('Opened file: ' + url)
      var reader = new FileReader
      reader.onerror = fs_err('FileReader', callback)
      reader.onloadend = on_done
      reader.readAsDataURL(file)

      function on_done(ev) {
        var body = this.result //.replace(/^data:.*?;base64,/, '')
        console.log('Read '+url+' Base64 size: ' + body.length)
        callback(null, body)
      }
    }
  }
}

function go_to(target) {
  // I am not sure if this is the correct way to do things with jQuery Mobile.
  window.location.hash = target
}

function pg_platform() {
  // Return the platform, but distinguish between the PhoneGap Developer app and a real iOS app.
  if (device.platform != 'iOS')
    return device.platform

  // PhoneGap Developer does not (currently?) set .manufacturer = "Apple".
  if (device.manufacturer == 'Apple')
    return 'iOS' // A real iOS app

  return 'PG'
}

function fix_browser_photo() {
  if (pg_platform() != 'browser')
    return console.log('jQuery Mobile photo fix: Not a browser')

  var getUserMedia = null
  function wrapped(opts, on_ok, on_er) {
    if (getUserMedia)
      return getUserMedia.call(navigator, opts, wrapped_on_ok, on_er)

    function wrapped_on_ok(stream) {
      on_ok(stream)

      console.log('Move browser video capture')
      var video = $('video')
      video.detach()
      video.appendTo('#main')
      video[0].play()

      var capture_btn = $('button').filter(function(i,el) { return el.innerHTML == 'Capture!' })
      capture_btn.detach()
      capture_btn.appendTo('#main')
    }
  }

  wrapped.is_fixed = true
  if (navigator.mozGetUserMedia && !navigator.mozGetUserMedia.is_fixed) {
    console.log('jQuery Mobile photo fix: Mozilla')
    getUserMedia = navigator.mozGetUserMedia
    navigator.mozGetUserMedia = wrapped
  } else if (navigator.getUserMedia && !navigator.getUserMedia.is_fixed) {
    console.log('jQuery Mobile photo fix: Chrome')
    getUserMedia = navigator.getUserMedia
    navigator.getUserMedia = wrapped
  } else
    console.log('jQuery Mobile photo fix: Unknown')
}
