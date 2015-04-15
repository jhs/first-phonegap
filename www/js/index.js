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

  window.location.hash = ''
  StatusBar.styleDefault()
  StatusBar.overlaysWebView(false);
  navigator.splashscreen.hide()

  fix_browser_photo()

  console.log('Start')

  jQuery('#photo-button').on(CLICK, take_photo)
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
    window.location.hash = '#prep-photo'

    var prefix = (device.platform == 'browser') ? 'data:image/png;base64,' : 'data:image/jpeg;base64,'
    jQuery('.new-photo').attr('src', prefix+photo)

    getCurrentPosition(function(er, pos) {
      if (er)
        return console.log('No position information: ' + er.code+': ' + er.message)

      $('input[name="form-photo-latitude"]').val(pos.coords.latitude)
      $('input[name="form-photo-longitude"]').val(pos.coords.longitude)
      $('input[name="form-photo-timestamp"]').val(pos.timestamp)
    })
  }
}

function onOnline(x) {
  jQuery('#network-status').html('Online')
}

function onOffline() {
  jQuery('#network-status').html('Offline')
}

function getCurrentPosition(callback) {
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
    callback(null, pos)
  }
}

//
// Miscellaneous
//

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
