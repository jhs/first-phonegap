var IS_TOUCH = ('ontouchstart' in window)

document.addEventListener('deviceready', onDeviceReady)
document.addEventListener('online', onOnline)
document.addEventListener('offline', onOffline)

function onDeviceReady() {
  console.log('Device ready; touch=' + IS_TOUCH)
  var $ = document.querySelector

  var parent = document.getElementById('deviceready')
  parent.querySelector('.listening').setAttribute('style', 'display:none')
  parent.querySelector('.received').setAttribute('style', 'display:block')

  var event_type = 'click'
  if (IS_TOUCH)
    event_type = 'touchend'

  var img = document.getElementById('face')
  img.addEventListener(event_type, run_scan)

  function run_scan(ev) {
    console.log('Scan for barcode! touches=' + !!ev.touches)
    console.log(JSON.stringify(ev))
    console.log('What is cordova: ' + JSON.stringify(Object.keys(cordova)))
    cordova.plugins.barcodeScanner.scan(
      function (result) {
          console.log("We got a barcode\n" +
                "Result: " + result.text + "\n" +
                "Format: " + result.format + "\n" +
                "Cancelled: " + result.cancelled);
      },
      function (error) {
          console.log("Scanning failed: " + error);
      });
    console.log('Started scan')
  }

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
