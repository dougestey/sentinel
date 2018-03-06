const everyThreeSeconds = 1000 * 3;

let ZkillJobs = {

  kickoff() {
    setInterval(Scheduler.readKillStream, everyThreeSeconds);
  }

};

module.exports = ZkillJobs;
