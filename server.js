module.exports = start_server

// Copyright 2014 Cloudant Inc., an IBM Company
//
//    Licensed under the Apache License, Version 2.0 (the "License");
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at
//
//        http://www.apache.org/licenses/LICENSE-2.0
//
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an "AS IS" BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.

var fs = require('fs')
var Hapi = require("hapi")
var Primus = require('primus')
var request = require('request')

var WWW = __dirname + '/res/admin_www'
var PHOTOS = []
var PRIMUS = null
var COUCH = null

function start_server() {
  var creds = process.env.creds
  if (!creds)
    return console.log('ERROR must export creds=user:password')

  var server = new Hapi.Server(3001, "0.0.0.0", {debug:{request:['info']}})
  //server.connection({port:3001, host:'0.0.0.0'})
  //server.connection({port:3001, host:'::1'})

//  server.route({ method: 'GET'
//               , path: '/primus/primus.js'
//               , handler: primus_client
//               })
  server.route({ method: 'GET'
               , path: '/{file*}'
               , handler: {directory: {path:WWW}}
               })

  server.start(function() {
    console.log("Hapi server started @", server.info.uri)

    PRIMUS = new Primus(server.listener, {transformer:'websockets'})
    PRIMUS.on('connection', connection)
    PRIMUS.client_lib = PRIMUS.library()

    watch_couch('jhs.cloudant.com', process.env.creds)
  })
} // start_server

function primus_client(req, respond) {
  if (!PRIMUS)
    return respond('Not found').code(404)

  console.log('Send primus client')
  respond(PRIMUS.client_lib).header('content-type', 'application/javascript')
}

function connection(sock) {
  var remote = sock.address.ip + ':' + sock.address.port + '/' + sock.address.secure
  console.log('Connection: %s', remote)

  sock.on('end', function() { })

  for (var i = 0; i < PHOTOS.length; i++)
    sock.write({photo: PHOTOS[i]})
}

function watch_couch(couch, creds, since) {
  console.log('Watch couch %s: %s', couch, since)

  var DB = 'https://' + creds + '@' + couch + '/photos'
  var url = DB + '/_changes?include_docs=true'

  if (since)
    url += '&since=' + since

  request({url:url, json:true}, function(er, res) {
    if (er)
      console.log('Couch error: ' + er.message)
    else if (res.statusCode != 200)
      console.log('Bad response: %j', res.body)
    else {
      console.log('  Found %s updates', res.body.results.length)
      res.body.results.forEach(function(change) {
        var photo = change.doc
        photo.url = 'http://' + couch + '/photos/' + change.id + '/photo'

        // Queue up this photo and push to existing connections.
        PHOTOS.push(photo)
        if (PRIMUS)
          PRIMUS.write({photo:photo})
      })

      var wait = 10
      if (res.body.results.length)
        since = res.body.results[res.body.results.length - 1].seq

      console.log('Check again in %s seconds', wait)
      setTimeout(re_run, wait * 1000)
      function re_run() {
        watch_couch(couch, creds, since)
      }
    }
  })
}


if (require.main === module)
  start_server()
