var IS_TOUCH = ('ontouchstart' in window)

document.addEventListener('deviceready', onDeviceReady)
document.addEventListener('online', onOnline)
document.addEventListener('offline', onOffline)

function onDeviceReady() {
  console.log('Device ready: ' + JSON.stringify(device))

  if (typeof jQuery != 'function')
    return console.log('Error: jQuery not found')
  if (! jQuery.mobile)
    return console.log('Error: jQuery.mobile not found')

  navigator.splashscreen.hide()
  console.log('Start')

  //debugger
  //jQuery('#menu').menu()

//  var parent = document.getElementById('deviceready')
//  parent.querySelector('.listening').setAttribute('style', 'display:none')
//  parent.querySelector('.received').setAttribute('style', 'display:block')
//
//  var event_type = 'click'
//  if (IS_TOUCH)
//    event_type = 'touchend'
//
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

function take_photo() {

  var opts = { quality : 75,
               destinationType : Camera.DestinationType.DATA_URL,
               sourceType : Camera.PictureSourceType.CAMERA,
               allowEdit : true,
               encodingType: Camera.EncodingType.JPEG,
               targetWidth: 100,
               targetHeight: 100,
               cameraDirection: Camera.Direction.FRONT,
               //popoverOptions: CameraPopoverOptions,
               saveToPhotoAlbum: false }

  console.log('Take photo: ' + JSON.stringify(opts))
  navigator.camera.getPicture(function(ok) { done(null, ok) }, function(er) { done(er) }, opts);

  function done(er, img) {
    if (er)
      return console.log('Camera error: ' + er)

    console.log('Got image: ' + img)
    var image = document.getElementById('cameraImg')
    console.log('Found image element: ' + !!image)
    if (device.platform == 'browser' || true) // XXX forcing DATA_URL above
      image.src = 'data:image/jpeg;base64,' + img
    else {
      console.log('Set src: ' + img)
      image.src = img
    }
  }
}

function onOnline(x) {
  console.log('Online')
  console.log(x)
}

function onOffline() {
  console.log('Offline')
}

function getCurrentPosition(callback) {
  return navigator.geolocation.getCurrentPosition(on_ok, on_er)

  function on_ok(pos) { callback(null, pos) }
  function on_er(er)  { callback(er)        }
}
