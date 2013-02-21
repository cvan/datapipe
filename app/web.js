var express = require('express');
var nunjucks = require('nunjucks');

var app = express.createServer(express.logger());
var env = new nunjucks.Environment(new nunjucks.FileSystemLoader('views/'));
env.express(app);

app.use('/static', express.static(__dirname + '/static'));
app.use(express.bodyParser());

app.get('/', function(request, response) {
    response.render('index.html');
});

app.post('/pay', function(request, response) {
    console.log(request.body);
    response.json({success: true});
});

var port = 8080;
app.listen(port, function() {
    console.log('Listening on', port);
});
