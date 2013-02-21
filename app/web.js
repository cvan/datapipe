var express = require('express');
var nunjucks = require('nunjucks');
var redis = require('redis');
var redisClient = redis.createClient();
var HASH_KEY = 'dpalloveryourface';

var app = express.createServer(express.logger());
var env = new nunjucks.Environment(new nunjucks.FileSystemLoader('views/'));
env.express(app);

app.use('/static', express.static(__dirname + '/static'));
app.use(express.bodyParser());

app.get('/', function(request, response) {
    response.render('index.html');
});

app.post('/pay', function(request, response) {
    var purchase = request.body.data.object;
    console.log(purchase.amount + ' requests: ' + purchase.description);
    // key: hash of the domain.
    // value: number of requests remaining.
    redisClient.hset(HASH_KEY, purchase.description, purchase.amount, redis.print);
    response.json({success: true});
});

var port = 8080;
app.listen(port, function() {
    console.log('Listening on', port);
});
