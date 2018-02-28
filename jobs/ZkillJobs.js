const everyFiveSeconds = 5000;

let ZkillJobs = {

  kickoff() {
    setInterval(Scheduler.readKillStream, everyFiveSeconds);
  }

};

module.exports = ZkillJobs;
