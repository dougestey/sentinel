const everyFiveSeconds = 5000;

let ZkillPolling = {

  kickoff() {
    setInterval(Scheduler.readKillStream, everyFiveSeconds);
  }

};

module.exports = ZkillPolling;
