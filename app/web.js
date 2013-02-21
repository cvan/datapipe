var http = require('http');
var https = require('https');
var url = require('url');

var express = require('express');
var nunjucks = require('nunjucks');
var redis = require('redis');
var stripe = require('stripe');

var HASH_KEY = 'dpalloveryourface';
var redisClient = redis.createClient();

var app = express(express.logger());
var env = new nunjucks.Environment(new nunjucks.FileSystemLoader('views/'));
env.express(app);

app.use('/static', express.static(__dirname + '/static'));
app.use(express.bodyParser());

app.get('/', function(request, response) {
    response.render('index.html');
});

app.post('/pay', function(request, response) {
    var purchase = request.body.data.object;
    console.log(request.body);
    console.log(purchase.amount + ' requests: ' + purchase.description);
    // key: hash of the domain.
    // value: number of requests remaining.
    redisClient.hset(HASH_KEY, purchase.description, purchase.amount, redis.print);
    response.json({success: true});
});

app.all('/url/', function(request, response) {

    function dp_error(error) {
        response.set('X-Data-Pipe-Error', 'True');
        response.send(400, error);
    }

    var verb = request.route.method;
    if (verb != 'get') {
        return dp_error('Non-GET requests are not supported.');
    }

    var ourl = request.originalUrl;
    var qpos;
    if ((qpos = ourl.indexOf('?')) == -1) {
        return dp_error('URL not provided.');
    }
    var remote_url = ourl.substr(qpos + 1);
    console.log(remote_url);

    // Putch yo biz niss lojick hurr

    var urldata = url.parse(remote_url);
    urldata.port = urldata.port || (urldata.protocol == 'https:' ? 443 : 80);
    urldata.path = urldata.path || '';
    urldata.hash = urldata.hash || '';
    var options = {
        host: urldata.hostname,
        port: urldata.port,
        path: urldata.path + urldata.hash,
        method: 'GET'
    };

    var buff = [];
    var datalen = 0;
    var proxy_req = (urldata.protocol == 'https:' ? https.request : http.request)(
        options,
        function(pres) {
            // Set the returned HTTP headers to the client request.
            response.set(pres.headers);
            // Set our HTTP headers to the client request.
            response.set({
                'X-Data-Pipe-Remaining': 5000  // TODO: get this from redis
            });

            pres.on('data', function(data) {
                datalen += data.length;
                if (datalen > 1024 * 1024) {
                    pres.abort();
                    return dp_error('Buffer too large');
                }
                buff.push(data);
            })

            pres.on('end', function() {
                response.send(pres.statusCode, buff.join(''));
            })
        }
    );
    proxy_req.on('error', function(e) {
        return dp_error(e.message);
    });
    proxy_req.end();

});

var port = 8080;
app.listen(port, function() {
    console.log('Listening on', port);
});
