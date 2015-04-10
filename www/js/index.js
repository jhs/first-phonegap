document.addEventListener('deviceready', onDeviceReady)
document.addEventListener('online', onOnline)
document.addEventListener('offline', onOffline)

function onDeviceReady() {
  console.log('Device ready')

  var parent = document.getElementById('deviceready')

  parent.querySelector('.listening').setAttribute('style', 'display:none')
  parent.querySelector('.received').setAttribute('style', 'display:block')

  console.log('string :%s: %o was json', 'a-string', [1,2,3])
  console.log({object:"I am an object"})
  console.log('json %j', {obj:'I am an object in JSON?'})

  console.log('Get position')
  getCurrentPosition(function(er, pos) {
    if (er) {
      console.log('Geo error '+er.code + ': ' + er.message)
      return console.log(er)
    }

    console.log('Latitude: '          + pos.coords.latitude          + '\n' +
                'Longitude: '         + pos.coords.longitude         + '\n' +
                'Altitude: '          + pos.coords.altitude          + '\n' +
                'Accuracy: '          + pos.coords.accuracy          + '\n' +
                'Altitude Accuracy: ' + pos.coords.altitudeAccuracy  + '\n' +
                'Heading: '           + pos.coords.heading           + '\n' +
                'Speed: '             + pos.coords.speed             + '\n' +
                'Timestamp: '         + pos.timestamp                + '\n')
  })
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
