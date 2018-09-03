/**
 * Primary file for API.
 */

// Dependencies
var http = require('http');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;

// The server should respond to all requests with a string
var server = http.createServer(function (req, res) {
  // get url and parse it;
  var parsedUrl = url.parse(req.url, true);

  //get the path from url;
  var path = parsedUrl.pathname;
  // trim all slashes from both sides of the path string
  console.log('path: ', path);
  var trimmedPath = path.replace(/^\/+|\/+$/g,'');

  //Get the HTTP methods;
  var method = req.method.toLowerCase();  

  // Get the query string object;
  var queryString = parsedUrl.query;

  //Get headers;
  var headers = req.headers;

  //Get the payloads if it is;
  var decoder = new StringDecoder('utf-8');
  var buffer = '';
  req.on('data', function (data) {
    buffer += decoder.write(data);
  })

  req.on('end', function () {
    buffer += decoder.end();
    
    //send a response;
    res.end(' Hello world! ');
  
    // then log path the user asked for
    // console.log('Request received path: ' + trimmedPath + ' with the method ' + method + ' with these query string params: ', queryString); 
    console.log('Request received with these payload: ', buffer);
  })
});

//Start server  and have it listen on port 3000;
server.listen(3000, function () {
  console.log('Server is listening on port 3000');
});