var IS_TOUCH = ('ontouchstart' in window)
var CLICK = IS_TOUCH ? 'touchend' : 'click'

document.addEventListener('deviceready', onDeviceReady)
document.addEventListener('online', onOnline)
document.addEventListener('offline', onOffline)

function onDeviceReady() {
  console.log('Device ready: ' + JSON.stringify(device))

  if (typeof jQuery != 'function')
    return console.log('Error: jQuery not found')
  if (! jQuery.mobile)
    return console.log('Error: jQuery.mobile not found')

  go_to('')
  StatusBar.styleDefault()
  StatusBar.overlaysWebView(false);
  navigator.splashscreen.hide()

  fix_browser_photo()
  console.log('Start')

  search_photos()

  // Interactivity
  jQuery('#photo-button').on(CLICK, take_photo)
  jQuery('#form-photo').submit(save_photo)
  jQuery('#form-photo a.cancel').on(CLICK, clear_photo_form)
}

function search_photos() {
  getCurrentPosition(function(er, pos) {
    var query = {}

    if (er)
      console.log('No position information: ' + er.code+': ' + er.message)
    else if (pos && pos.coords)
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

  row('Total photos', photos.length)

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
    result.append('<div class="ui-block-a"><h3>Tags</h3></div>')

    tags.forEach(function(tag, i) {
      if (i < 3)
        row(tag.name, tag.count)
    })
  }

  function row(key, val) {
    result.append('<div class="ui-block-a"><strong>' + key + '</strong></div>')
    result.append('<div class="ui-block-b">' + val + '</div>')
  }

  function cmp_tag_tuple(A, B) {
    // Make the sort descending, so B - A.
    return B.count - A.count
  }
}

function take_photo() {
  var opts = { quality : 50,
               destinationType : Camera.DestinationType.DATA_URL,
               sourceType : Camera.PictureSourceType.CAMERA,
               allowEdit : true,
               encodingType: Camera.EncodingType.JPEG,
               targetWidth: 300,
               targetHeight: 300,
               cameraDirection: Camera.Direction.FRONT,
               //popoverOptions: CameraPopoverOptions,
               saveToPhotoAlbum: false
             }

  console.log('Take photo: ' + JSON.stringify(opts))
  navigator.camera.getPicture(function(ok) { done(null, ok) }, function(er) { done(er) }, opts);

  function done(er, photo) {
    if (er)
      return console.log('Camera error: ' + er)
    if (! photo)
      return console.log('Error: no photo returned')

    console.log('Got photo; length: ' + photo.length)
    go_to('#prep-photo')

    var prefix = (device.platform == 'browser') ? 'data:image/png;base64,' : 'data:image/jpeg;base64,'
    jQuery('.new-photo').attr('src', prefix+photo)

    getCurrentPosition(function(er, pos) {
      if (er)
        return console.log('No position information: ' + er.code+': ' + er.message)

      $('input[name="form-photo-latitude"]').val(pos.coords.latitude)
      $('input[name="form-photo-longitude"]').val(pos.coords.longitude)
      $('input[name="form-photo-timestamp"]').val(pos.timestamp.toJSON())
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
}

function clear_photo_form(ev) {
  jQuery('#form-photo input').val('')
  jQuery('#form-photo select').val('false').slider('refresh')
}

function onOnline(x) {
  jQuery('#network-status').html('Online')
}

function onOffline() {
  jQuery('#network-status').html('Offline')
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

function fix_browser_photo() {
  if (device.platform != 'browser')
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
