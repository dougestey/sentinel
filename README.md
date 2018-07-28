# Sentinel

A WebSocket-compatible kill & fleet tracker for EVE Online, built [on Sails.js](https://sailsjs.com/). Part of the magic behind the [Gloss](https://github.com/dougestey/gloss) project.

## Features ##
- [ESI](https://esi.tech.ccp.is/) support
- Live reporting from zKillboard's [RedisQ](https://github.com/zKillboard/RedisQ) service
- [Database-agnostic](https://sailsjs.com/documentation/reference/configuration/sails-config-datastores#?supported-databases) (Sentinel doesn't care if you use PostgreSQL, Mongo, or even your [RAM](https://github.com/balderdashy/sails-disk))
- Sophisticated job queue scheduler via [Kue](https://github.com/Automattic/kue)

## Environment ##

- Install Node >= 8
- Install Yarn
- Install and [configure](config/datastores.js) a database (PostgreSQL preferred) 
- Install and [configure](config/jobs.js) Redis

The app will refuse to run without a valid root-level `.env` - see the [example file.](.env.example)

## Boot ##

    $ cd sentinel
    $ yarn
    $ node app.js

And now you're listening for kills and saving them to the DB in real time. RedisQ will remember who you are for up to 3 hours if you go offline, otherwise you're considered a new listener.

Provided it's not firewalled, a frontend to the job queue will be available at http://YOUR_URL:6574.

If you're going to leave this thing running permanently, you should run it `NODE_ENV=production` (i.e. `npm start`).

## Support ##

Got a problem? File a GitHub issue. Please be nice.

Want to support the developer? [ISK donations welcome](https://zkillboard.com/corporation/98498664/).
