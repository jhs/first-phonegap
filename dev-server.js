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

var Hapi = require("hapi")

var WWW = __dirname + '/platforms/browser/www'

function start_server(scores) {
  var verbose = false

  var server = new Hapi.Server //({port:9966, "0.0.0.0", {debug:{request:['info']}})
  server.connection({port:9988, host:'0.0.0.0'})

  server.route({ method: 'GET'
               , path: '/verbose'
               , handler: toggle_verbose
               })
  server.route({ method: 'GET'
               , path: '/{file*}'
               , handler: {directory: {path:WWW}}
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

if (require.main === module)
  start_server()
