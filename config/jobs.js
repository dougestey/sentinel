/**
 * Jobs
 * (sails.config.jobs)
 *
 * Configured server cron jobs. Powered by Kue.
 *
 */

let kue = require('kue'),
    moment = require('moment');
    port = 6667,
    webUiPort = 6574;

if (process.env.NODE_ENV === 'production') {
  port = 6666;
  webUiPort = 6564;
}

let jobs = kue.createQueue({
      prefix: 'sentinel',
      redis: {
        host: '127.0.0.1',
        port,
        auth: ''
      },
      disableSearch: true
    });

let ZkillJobs = require('../jobs/ZkillJobs');

// ui for jobs
kue.app.listen(webUiPort);

// give kue workers time to finish active job
process.once('SIGTERM', function() {
  jobs.shutdown(function(error) {
    sails.log.debug('Kue saw SIGTERM: ', error || 'ok');
    process.exit(0);
  }, 5000);
});

function init() {

  // Fleet

  jobs.process('determine_fleet_health', (job, done) => {
    let now = moment(),
        fiveMinutesAgo = now.subtract(5, 'minutes').toISOString();

    Fleet.find({
      isActive: true,
      lastFleetHealthCheck : { '<=' : fiveMinutesAgo }
    })
      .limit(50)
      .then(async(fleets) => {
        for (let fleet of fleets) {
          let lastSeen = moment(fleet.lastSeen),
              now = moment();

          let diff = now.diff(lastSeen);
          let fleetExpireTimeInMilliseconds = parseInt(process.env.FLEET_EXPIRY_IN_MINUTES) * 60 * 1000;

          if (diff > fleetExpireTimeInMilliseconds) {
            await Fleet.update(fleet.id, {
              isActive: false,
              endTime: now.toISOString(),
              lastFleetHealthCheck: now.toISOString()
            });

            if (!fleet.system)
              sails.log.error(`[Job.determineFleetHealth] No fleet.system for fleet with id ${fleet.id}.`);

            fleet = await FleetSerializer.one(fleet.id);

            Dispatcher.notifySockets(fleet, 'fleet_expire');
          } else {
            await Fleet.update(fleet.id, { lastFleetHealthCheck: now.toISOString() });
          }
        }

        done(null);
      })
  });

  jobs.process('determine_fleet_threat_level', (job, done) => {
    let now = moment(),
        fiveMinutesAgo = now.subtract(5, 'minutes').toISOString();

    Fleet.find({
        isActive: true,
        lastFleetThreatLevelCheck: { '<=' : fiveMinutesAgo }
      })
      .limit(25)
      .populate('characters')
      .then(async(fleets) => {
        for (let fleet of fleets) {
          if (fleet.characters.length) {
            let dangerRatio = await Character.avg('dangerRatio', { fleet: fleet.id, dangerRatio: { '>' : 0 } });
            let lastFleetThreatLevelCheck = moment().toISOString();

            await Fleet.update(fleet.id, { dangerRatio, lastFleetThreatLevelCheck });

            fleet = await FleetSerializer.one(fleet.id);

            Dispatcher.notifySockets(fleet, 'fleet');
          }
        }

        done(null);
      })
  });

  // Zkill

  jobs.process('read_kill_stream', (job, done) => {
    ZkillPush.fetch()
      .then((result) => {
        if (result && result instanceof Error) {
          done(result);
        } else {
          done(null, result);
        }

        // Keep movin' buddy, these kills ain't gonna track themselves.
        setTimeout(ZkillJobs.readKillStream, 1000);
      });
  });

  jobs.process('update_danger_ratios', (job, done) => {
    let now = moment(),
        maxCacheTime = parseInt(process.env.CACHE_CHARACTERS_IN_DAYS),
        threshold = now.subtract(maxCacheTime, 'days').toISOString();

    Character.find({
        or: [
          { lastZkillUpdate: '' },
          { lastZkillUpdate: { '<=' : threshold } }
        ]
      })
      .limit(10)
      .then((characters) => {
        if (characters && characters instanceof Error) {
          sails.log.error(`[Job.update_danger_ratios] ${characters}`);
          done(characters);
        }

        for (let character of characters) {
          ZkillStats.character(character.id)
            .then(async(stats) => {
              let { dangerRatio } = stats,
                  lastZkillUpdate = new Date().toISOString();

              await Character.update(character.id, { dangerRatio, lastZkillUpdate });
            })
            .catch((error) => {
              sails.log.error(`[Job.update_danger_ratios] ${error}`);
            });
        }

        done(null);
      })
  });

  // TODO:  if we ever cluster the server, these jobs should be in a
  //        worker process

  // Interval Jobs
  if (process.env.TRACK_ENABLED === 'true') {
    require('../jobs/ZkillJobs').kickoff();
    require('../jobs/FleetJobs').kickoff();
    require('../jobs/SwaggerJobs').kickoff();
  }

  // remove jobs once completed
  jobs.on('job complete', function(id) {
    kue.Job.get(id, function(err, job) {
      if (err) {
        console.log(`Job ${id} failed: ${err}`);
      }

      if (err) { return; }
      job.remove();
    });
  });
}

var Jobs = {
  init: init,
  create: jobs.create
};

module.exports.jobs = Jobs;
