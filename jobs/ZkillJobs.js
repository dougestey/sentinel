const everySecond = 1000;

let ZkillJobs = {

  kickoff() {
    setInterval(Scheduler.readKillStream, everySecond);
  }

};

module.exports = ZkillJobs;
