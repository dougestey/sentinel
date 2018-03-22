/**
 * Dispatcher
 *
 * @description :: Dispatches data to interested entities.
 * @help        :: See https://next.sailsjs.com/documentation/concepts/services
 */

let pool = {};

let Dispatcher = {

  joinPool(req) {
    let socketId = sails.sockets.getId(req);

    if (!socketId) {
      sails.log.error(`[Dispatcher.joinPool] Couldn't get a socket id.`);
    }

    if (!_.has(pool, socketId)) {
      sails.sockets.join(req, 'activeSockets');

      sails.log.debug(`[Dispatcher.joinPool] ${socketId} joins the pool.`);

      pool[socketId] = [];
    } else {
      sails.log.debug(`[Dispatcher.joinPool] ${socketId} is already in the pool.`);
    }
  },

  // Notify connected sockets of new data
  notifySockets(data, type, system) {
    sails.io.sockets.in('activeSockets').clients((err, members) => {
      sails.log.debug(`[Dispatcher.notifySockets] ${members.length} members in the pool.`);

      members.map((socketId) => {
        sails.log.debug(`[Dispatcher.notifySockets] Notifying ${socketId} of ${type}...`);
        sails.log.silly(`[Dispatcher.notifySockets] ${data}`);

        sails.sockets.broadcast(socketId, type, data);
      });
    });
  }

};

module.exports = Dispatcher;
