document.addEventListener('deviceready', onDeviceReady)
document.addEventListener('online', onOnline)
document.addEventListener('offline', onOffline)

function onDeviceReady() {
  console.log('Device ready')

  debugger
  var parent = document.getElementById('deviceready')

  parent.querySelector('.listening').setAttribute('style', 'display:none')
  parent.querySelector('.received').setAttribute('style', 'display:block')

  console.log('string :%s: %o was json', 'a-string', [1,2,3])
  console.log({object:"I am an object"})
  console.log('json %j', {obj:'I am an object in JSON?'})
}

function onOnline(x) {
  debugger
  console.log('Online')
  console.log(x)
}

function onOffline() {
  console.log('Offline')
}
