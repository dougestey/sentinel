/**
 * ZkillSocket
 *
 * @description :: Interface to zKillboard's Websocket service.
 * @help        :: See https://github.com/zKillboard/zKillboard/wiki/Websocket
 */

const WebSocket = require('ws');
const socket = new WebSocket('wss://zkillboard.com:2096');

let ZkillSocket = {

  initialize() {
    // Subscribe to the full killstream.
    socket.on('open', () => {
      sails.log.debug('[ZkillSocket] Connected.');

      socket.send(JSON.stringify({
        action: 'sub',
        channel: 'killstream'
      }));
    });

    socket.on('message', async(data) => {
      let package = await Package.create({ body: data }).fetch();

      let job = sails.config.jobs.create('process_zkill_package', { id: package.id });

      // Failure/backoff strategy
      job.attempts(3).backoff({ type:'exponential' });

      job.on('failed', function(err) {
        sails.log.error('[Zkill.processZkillPackage] Job failed');
        sails.log.error(err);
      });

      job.save();
    });
  },

};

module.exports = ZkillSocket;
