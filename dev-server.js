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

var PLATFORM_WWW = __dirname + '/platforms/browser/www'
var LOCAL_WWW    = __dirname + '/www'

function start_server(scores) {
  var verbose = false

  var server = new Hapi.Server //({port:9966, "0.0.0.0", {debug:{request:['info']}})
  server.connection({port:9988, host:'0.0.0.0'})
  server.connection({port:9988, host:'::1'})

  server.route({ method: 'GET'
               , path: '/verbose'
               , handler: toggle_verbose
               })
  server.route({ method: 'GET'
               , path: '/{file*}'
               , handler: handle_file
               })

  server.start(function() {
    console.log("Hapi server started @", server.info.uri)

//    var primus = new Primus(server.listener, {transformer:'websockets'})
//    primus.on('connection', connection)
  })

  function toggle_verbose(req, respond) {
    verbose = !verbose
    respond({verbose:verbose})
  }

  function log() {
    if (verbose)
      console.log.apply(console, arguments)
  }
} // start_server

function handle_file(request, reply) {
  var path = request.params.file || ''
  var local_path = LOCAL_WWW + '/' + path
  var built_path = PLATFORM_WWW + '/' + path

  fs.stat(local_path, function(er, stat) {
    var suffix = (stat && stat.isDirectory()) ? '/index.html' : ''

    if (er) {
      console.log('Built path: %s', built_path)
      reply.file(built_path+suffix)
    } else {
      console.log('Local path: %s', local_path)
      reply.file(local_path+suffix)
    }
  })
}


if (require.main === module)
  start_server()
