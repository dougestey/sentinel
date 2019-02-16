# Sentinel

A WebSocket-compatible kill & fleet tracker for EVE Online, built [on Sails.js](https://sailsjs.com/). Part of the magic behind the [GLOSS](https://github.com/dougestey/gloss) project.

## Features ##
- Backed by PostgreSQL
- Live reporting from zKillboard's [WebSocket service](https://github.com/zKillboard/zKillboard/wiki/Websocket)
- Identifies fleet patterns based on recorded kills
- Resolves characters, corporations and alliances via [ESI](https://esi.tech.ccp.is/)
- Resolves shiptypes and systems via the [EVE Online SDE](https://developers.eveonline.com/resource/resources)
- Sophisticated job queue scheduling via [Kue](https://github.com/Automattic/kue)

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

And now you're listening for kills and saving them to the DB in real time.

Provided it's not firewalled, a frontend to the job queue will be available at `http://<BASE_URL>:6574`.

If you're going to leave this thing running permanently, you should run it with `NODE_ENV=production` (i.e. `npm start`).

## Support ##

Got a problem? File a GitHub issue. Please be nice.

Want to support the developer? [ISK donations welcome](https://zkillboard.com/corporation/98498664/).
