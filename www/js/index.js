var IS_TOUCH = ('ontouchstart' in window)
var CLICK = IS_TOUCH ? 'touchend' : 'click'
var DB = null
var FS = null

document.addEventListener('deviceready', onDeviceReady)

function onDeviceReady() {
  console.log('Device ready: ' + JSON.stringify(device))
  DB = new DBClass

  console.log('FS ' + JSON.stringify(cordova.file))
  //var jpg_url = 'file:///var/mobile/Containers/Data/Application/8B0CB15C-B110-43CD-859A-3C21571FA820/tmp/cdv_photo_003.jpg'

  window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, fs_ok, fs_err)
  function fs_ok(fs) {
    console.log('Filesystem online')
    FS = fs

    console.log('Read attempt...')
    read_file('tmp/cdv_photo_008.jpg', function(er, body) {
      if (er)
        return fs_err(er)
      console.log('YAY READ WORKED')
    })
  }

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
  if (0)
    return DB.destroy(function(er) {
      if (er) throw er
      $('body').html('Cleaned')
    })

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

function fs_err(er) {
  console.log('ERROR Filesystem: ' + er.code)
}

function read_file(url, callback) {
  //url = url.replace(/^file:\/\//, '')
  //url = url.replace(/^.*\/tmp/, 'tmp')
  console.log('Read file: ' + url)
  if (!FS)
    return callback(new Error('Filesystem not online'))

  try {
  FS.root.getFile(url, null, on_fs_ent, function(er) { fs_err(er); callback(er) })
  } catch (er) {
    return console.log('Error with getFile: ' + er || er.message || er.code)
  }

  function on_fs_ent(entry) {
    console.log('XXX Got file entry!')
    console.log(JSON.stringify(entry))
    callback(null, '')
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

  row('<strong>Photos</strong>', photos.length)

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

  row('<strong>Private photos</strong>', private_count)

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
      jQuery('.new-photo').attr('src', photo)
      read_file(photo, function(er, body) {
        if (er)
          console.log('Error reading photo: ' + er.message || er.code)
        console.log('YAY Got photo body: ' + body.length)
      })
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

  var body = jQuery('img.new-photo').attr('src')
  var meta = {}
  meta.latitude    = jQuery('input[name="form-photo-latitude"]').val()
  meta.longitude   = jQuery('input[name="form-photo-longitude"]').val()
  meta.timestamp   = jQuery('input[name="form-photo-timestamp"]').val()
  meta.description = jQuery('input[name="form-photo-description"]').val()
  meta.tags        = jQuery('input[name="form-photo-tags"]').val()
  meta.is_private  = jQuery('select[name="form-photo-private"]').val()

  console.log('Photo '+body.length+' bytes: ' + JSON.stringify(meta))

  go_to('')
  clear_photo_form()
  DB.store({body:body, meta:meta}, function(er, res) {
    if (er)
      console.log('Photo store error: ' + er.message)
    else
      search_photos() // Re-populate the search results.
  })
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

function on_db_state(state) {
  var element = jQuery('#network-status')
  var label = element.html()
  label = label.replace(/\|.*$/, '')
  if (state)
    label += ' | ' + state

  element.html(label)
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
