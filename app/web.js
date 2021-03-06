var settings = require('./settings_local.js');

var http = require('http');
var https = require('https');
var url = require('url');

var express = require('express');
var nunjucks = require('nunjucks');
var redis = require('redis');
var stripe = require('stripe')(settings.stripe.private);

var DO_RATE_LIMIT = false;
var RATE_LIMIT = 10;  // Per minute

var redisClient = redis.createClient(settings.redis.port || '', settings.redis.host || '');
if (settings.redis.auth) {
    redisClient.auth(settings.redis.auth);
}

function getDomain(origin) {
    if (origin.substr(0, 5) == 'http:' ||
        origin.substr(0, 6) == 'https:') {
        origin = url.parse(origin).hostname;
    }
    if (origin.substr(0, 4) == 'www.') {
        origin = origin.substr(4);
    }
    return origin;
}

var app = express(express.logger());
var env = new nunjucks.Environment(new nunjucks.FileSystemLoader('views/'));
env.express(app);

app.use('/static', express.static(__dirname + '/static'));
app.use(express.bodyParser());

app.get('/', function(request, response) {
    response.render('index.html', {
        stripePK: settings.stripe.public
    });
});

app.get('/credits', function(request, response) {
    var qpos;
    if ((qpos = request.url.indexOf('?')) === -1) {
        return dp_error('URL not provided.');
    }

    var origin = getDomain(request.url.substr(qpos + 1));
    console.log(origin);

    redisClient.zscore('origins', origin, function(err, data) {
        if (err) {
            data = 0;
        }
        response.json({remaining: +data});
    });
});

app.post('/pay', function(request, response) {
    var purchase = request.body.data.object;
    redisClient.get('charge:'+purchase.id, function(err, data) {

        if (err || !data) {
            response.json({error: 'naughty naughty'});
            return;
        }

        // [num_requests, 'domain.biz']
        data = data.split('|');

        redisClient.zincrby('origins', data[0], getDomain(data[1]), redis.print);
        console.log(data);
        console.log('yay');
        response.json({success: true});
    });
});

app.all('/url', function(request, response) {

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
    if ((qpos = ourl.indexOf('?')) === -1) {
        return dp_error('URL not provided.');
    }
    var remote_url = ourl.substr(qpos + 1);
    console.log(remote_url);

    function process(remaining, origin) {
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
                    'X-Data-Pipe-Remaining': remaining,
                    'Access-Control-Allow-Origin': origin  // CORS
                });

                pres.on('data', function(data) {
                    datalen += data.length;
                    if (datalen > 1024 * 1024) {
                        pres.abort();
                        return dp_error('Buffer too large');
                    }
                    buff.push(data);
                });

                pres.on('end', function() {
                    response.send(pres.statusCode, buff.join(''));
                });
            }
        );
        proxy_req.on('error', function(e) {
            return dp_error('Req err: ' + e.message);
        });
        proxy_req.end();
    }

    var origin = request.get('Origin');
    if (!origin) {
        return dp_error('No Origin header');
    }

    var origin_host = getDomain(url.parse(origin).href);
    console.log(origin_host);
    if (DO_RATE_LIMIT) {
        if (origin_host === 'localhost') {
            var ip_key = 'ip::' + request.ip;
            redisClient.incr(ip_key, function(err, data) {
                var ival = +data;
                if (ival > RATE_LIMIT) {
                    return dp_error('Exceeded localhost quota. Try again in a minute.');
                } else if (ival == 1) {
                    redisClient.expire(ip_key, 60, redis.print);
                }
                process(RATE_LIMIT - ival, '*');
            });
        } else {
            redisClient.zincrby('origins', -1, origin_host, function(err, val) {
                var ival = +val;
                if (ival < 0) {
                    redisClient.zincrby('origins', 1, origin_host, redis.print);
                    return dp_error('Exceeded quota for origin.');
                } else {
                    process(ival, origin);
                }
            });
        }
    }
});

var prices = {
    1000: 500,
    10000: 2500,
    100000: 7500
};

app.post('/charge', function(request, response) {
    var opts = {
        amount: 1000,
        currency: 'usd',
        card: request.body.stripeToken,
        description: request.body.domain
    };
    stripe.charges.create(opts, function(err, charge) {
        if (err) {
            console.log(err);
            response.json(err);
            response.redirect('/');
        } else {
            console.log('creating charge');
            console.log(charge);
            redisClient.set('charge:'+charge.id, [1000, getDomain(request.body.domain)].join('|'));
            response.redirect('/');
        }
    });
});

var port = 8080;
app.listen(port, function() {
    console.log('Listening on', port);
});
