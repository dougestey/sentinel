/**
 * ZkillSocket
 *
 * @description :: Interface to zKillboard's Websocket service.
 * @help        :: See https://github.com/zKillboard/zKillboard/wiki/Websocket
 */

const WebSocket = require('ws');

let ZkillSocket = {

  connect() {
    this.socket = new WebSocket('wss://zkillboard.com:2096');

    sails.log.debug(`[${new Date().toLocaleTimeString()}] [ZkillSocket] Initializing new socket instance.`);

    this.initialize();
  },

  ping() {
    this.socket.ping();
  },

  initialize() {
    // Set up heartbeat.
    if (this.heartbeatCheck) {
      clearInterval(this.heartbeatCheck);
    }

    this.isAlive = true;

    this.heartbeatCheck = setInterval(() => {
      if (!this.isAlive) {
        sails.log.debug(`[${new Date().toLocaleTimeString()}] [ZkillSocket] No heartbeat detected in over 30 seconds.`);

        sails.log.debug(`[${new Date().toLocaleTimeString()}] [ZkillSocket] Will attempt to reconnect in 10 seconds.`);

        sails.config.sentinel.connected = false;
        sails.config.sentinel.failures.zkill++;

        return setTimeout(this.connect, 10000);
      }

      this.isAlive = false;

      this.ping();
    }, 30000);

    this.socket.on('pong', () => {
      this.isAlive = true;

      sails.config.sentinel.connected = true;

      sails.log.debug(`[${new Date().toLocaleTimeString()}] [ZkillSocket] Heartbeat response received from Zkill.`);
    });

    // Subscribe to the full killstream.
    this.socket.on('open', () => {
      sails.log.debug(`[${new Date().toLocaleTimeString()}] [ZkillSocket] Connected.`);
      sails.config.sentinel.connected = true;

      this.socket.send(JSON.stringify({
        action: 'sub',
        channel: 'killstream'
      }));
    });

    this.socket.on('message', async(data) => {
      let package = await Package.create({ body: data }).fetch();

      let job = sails.config.jobs.create('process_zkill_package', { id: package.id });

      // Failure/backoff strategy
      job.attempts(3).backoff({ type: 'exponential' });

      job.on('failed', function(err) {
        sails.log.error(`[${new Date().toLocaleTimeString()}] [Zkill.processZkillPackage] Job for ${package.id} failed`);
        sails.log.error(err);
      });

      job.save();
    });

    this.socket.on('close', (code, reason) => {
      sails.log.error(`[${new Date().toLocaleTimeString()}] [ZkillSocket] Connection was closed: ${code} ${reason}`);

      sails.log.debug(`[${new Date().toLocaleTimeString()}] [ZkillSocket] Attempting to re-establish...`);

      setTimeout(this.connect, 10000);
    });

    this.socket.on('error', (error) => {
      sails.log.error(`[${new Date().toLocaleTimeString()}] [ZkillSocket] Error from Zkill:`, error);
    });

    sails.log.debug(`[${new Date().toLocaleTimeString()}] [ZkillSocket] All message handlers initialized.`);
  },

};

module.exports = ZkillSocket;
