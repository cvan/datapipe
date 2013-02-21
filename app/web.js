var express = require('express');
var irc = require('irc');
var nunjucks = require('nunjucks');

var app = express.createServer(express.logger());
var env = new nunjucks.Environment(new nunjucks.FileSystemLoader('views/'));
env.express(app);

app.use("/static", express.static(__dirname + '/static'));
app.use(express.bodyParser());

var client = new irc.Client('irc.mozilla.org', 'extensivebot', {channels: ['#webdev']});

function ping(url, callback) {
    client.say('#webdev', 'crimsontwins: ' + url);
}

app.get('/', function(request, response) {
    response.render('index.html');
});

app.post('/post', function(request, response) {
    var hash = request.body.hash;
    if (!hash) {
        console.log('No hash :(');
        return;
    }
    console.log('Hash: ' + hash);
    ping('http://imgur.com/' + hash + '.png');
    response.json({success: true});
});

var port = 8080;
app.listen(port, function() {
  console.log("Listening on " + port);
});
