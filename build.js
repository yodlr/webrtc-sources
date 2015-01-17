var bundle = require('browserify')({standalone: 'micselect'});
var fs = require('fs');


bundle.add('./index-browser');
bundle.bundle().pipe(fs.createWriteStream('micselect.bundle.js'));