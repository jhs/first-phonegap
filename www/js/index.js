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
  StatusBar.overlaysWebView(true);
  navigator.splashscreen.hide()

  fix_browser_photo()

  console.log('Start')

  jQuery('#photo-button').on(CLICK, take_photo)

//  var img = document.getElementById('face')
//  img.addEventListener(event_type, take_photo)

//  console.log('Get position')
//  getCurrentPosition(function(er, pos) {
//    if (er) {
//      console.log('Geo error '+er.code + ': ' + er.message)
//      return console.log(er)
//    }
//
//    console.log('Latitude: '          + pos.coords.latitude          + '\n' +
//                'Longitude: '         + pos.coords.longitude         + '\n' +
//                'Altitude: '          + pos.coords.altitude          + '\n' +
//                'Accuracy: '          + pos.coords.accuracy          + '\n' +
//                'Altitude Accuracy: ' + pos.coords.altitudeAccuracy  + '\n' +
//                'Heading: '           + pos.coords.heading           + '\n' +
//                'Speed: '             + pos.coords.speed             + '\n' +
//                'Timestamp: '         + pos.timestamp                + '\n')
//  })
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
  } else
    console.log('jQuery Mobile photo fix: Unknown')
}

function take_photo() {
  var opts = { quality : 75,
               destinationType : Camera.DestinationType.DATA_URL,
               sourceType : Camera.PictureSourceType.CAMERA,
               allowEdit : false,
               encodingType: Camera.EncodingType.JPEG,
               targetWidth: 50,
               targetHeight: 50,
               cameraDirection: Camera.Direction.FRONT,
               //popoverOptions: CameraPopoverOptions,
               saveToPhotoAlbum: false }

  console.log('Take photo: ' + JSON.stringify(opts))
  navigator.camera.getPicture(function(ok) { done(null, ok) }, function(er) { done(er) }, opts);

  // Move the browser video/image capture into the visible UI.
//  if (device.platform == 'browser')
//    setTimeout(fix_capture_button, 500)

  function fix_capture_button() {
  }

  function done(er, photo) {
    if (er)
      return console.log('Camera error: ' + er)
    if (! photo)
      return console.log('Error: no photo returned')

    console.log('Got photo')
    jQuery('.new-photo').attr('src', 'data:image/jpeg;base64,'+photo)
    window.location.hash = '#prep-photo'
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

  function on_ok(pos) { callback(null, pos) }
  function on_er(er)  { callback(er)        }
}
