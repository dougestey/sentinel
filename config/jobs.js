/**
 * Jobs
 * (sails.config.jobs)
 *
 * Configured server cron jobs. Powered by Kue.
 *
 */

var kue = require('kue'),
    moment = require('moment');

var jobs = kue.createQueue({
      prefix: 'kue',
      redis: {
        host: '127.0.0.1',
        port: 6378,
        auth: ''
      },
      disableSearch: true
    });

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

  jobs.process('read_kill_stream', (job, done) => {
    ZkillPush.fetch()
      .then((result) => {
        if (result && result instanceof Error) {
          done(result);
        } else {
          done(null, result);
        }
      }, (error) => {
        done(error);
      });
  });

  jobs.process('determine_fleet_health', (job, done) => {
    Fleet.find({ isActive: true })
      .then((fleets) => {
        fleets = fleets.map(async(fleet) => {
          let lastSeen = moment(fleet.lastSeen),
              now = moment();

          let diff = now.diff(lastSeen, 'minutes');

          if (Math.abs(diff) > 55)
            await Fleet.update(fleet.id, { isActive: false, endTime: fleet.lastSeen });
        });

        done(null);
      })
  });

  // TODO:  if we ever cluster the server, these jobs should be in a
  //        worker process

  // Interval Jobs
  require('../jobs/ZkillJobs').kickoff();
  require('../jobs/FleetJobs').kickoff();

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
