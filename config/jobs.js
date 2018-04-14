/**
 * Jobs
 * (sails.config.jobs)
 *
 * Configured server cron jobs. Powered by Kue.
 *
 */

let kue = require('kue'),
    moment = require('moment');

let jobs = kue.createQueue({
      prefix: 'kue',
      redis: {
        host: '127.0.0.1',
        port: 6666,
        auth: ''
      },
      disableSearch: true
    });

let ZkillJobs = require('../jobs/ZkillJobs');

// ui for jobs
kue.app.listen(6564);

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
    Fleet.find({ isActive: true })
      .then((fleets) => {
        fleets = fleets.map(async(fleet) => {
          let lastSeen = moment(fleet.lastSeen),
              now = moment();

          let diff = now.diff(lastSeen, 'minutes');

          if (Math.abs(diff) > parseInt(process.env.FLEET_EXPIRY_IN_MINUTES))
            await Fleet.update(fleet.id, { isActive: false, endTime: new Date().toISOString() });
        });

        done(null);
      })
  });

  jobs.process('determine_fleet_threat_level', (job, done) => {
    Fleet.find({ isActive: true })
      .populate('characters')
      .then(async(fleets) => {
        for (let fleet of fleets) {
          let dangerRatio = await Character.avg('dangerRatio', { fleet: fleet.id, dangerRatio: { '>' : 0 } });

          await Fleet.update(fleet.id, { dangerRatio });
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
    Character.find({ dangerRatio: 0, lastZkillUpdate: '' })
      .limit(10)
      .then((characters) => {
        if (characters && characters instanceof Error) {
          sails.log.error(`[Job.update_danger_ratios] ${characters}`);
          done(characters);
        }

        for (let character of characters) {
          ZkillStats.character(character.characterId)
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
  require('../jobs/ZkillJobs').kickoff();
  require('../jobs/FleetJobs').kickoff();
  require('../jobs/SwaggerJobs').kickoff();

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
