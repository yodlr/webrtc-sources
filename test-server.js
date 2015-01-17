var https = require('https');
var fs = require('fs');

var options = {
  key: fs.readFileSync('certs/server.key'),
  cert: fs.readFileSync('certs/server.crt')
};

https.createServer(options, function (req, res) {
  if (req.url==='/') {
    return fs.createReadStream('test.html').pipe(res);
  }
  if (req.url==='/micselect.bundle.js') {
    return fs.createReadStream('micselect.bundle.js').pipe(res);
  }
  res.writeHead(200);
  res.end("hello world\n");
}).listen(8000);