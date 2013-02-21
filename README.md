datapipe
========

Because `GET`ting your data shouldn't be a pipedream.


Installation
============

    cd app/
    cp settings.js settings_local.js
    npm install
    pip install dotcloud

Install redis and its launch agent (Mac OS X):

    brew install redis
    ln -nfs /usr/local/Cellar/redis/*/homebrew.mxcl.redis.plist ~/Library/LaunchAgents/


Development
===========

If you want to play with Stripe payments:

    gem install localtunnel
    localtunnel 8080

Then go https://manage.stripe.com/account/webhooks and enter
http://`<somethingridiculous>`.localtunnel.com/pay and then you can test that webhook.

To play with redis:

    redis-cli

To keep an eye on the commands being sent to redis:

    redis-cli monitor

To clear your redis database:

    redis-cli flushall


Deployment
==========

To destroy the app on dotcloud:

    dotcloud destroy

To create the app on dotcloud (we need to do this only the first time):

    dotcloud create -f sandbox datapipe
    dotcloud create -f live datapipe

To connect to the dotcloud instance:

    dotcloud connect datapipe

To push code to dotcloud:

    dotcloud push

After the code has been updated it'll print out the URL, for example:

    http://datapipe-hywnaqan.dotcloud.com

To SSH into the dotcloud instance:

    dotcloud run www && cd current

To view the logs:

    tail -f /var/log/supervisor/app.log

To view the redis connection info:

    dotcloud info data

Pushing code:

    dotcloud push && dotcloud run www

To add the domain:

    dotcloud domain add www datapi.pe
