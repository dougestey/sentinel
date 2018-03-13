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

    if (!_.has(pool, socketId)) {
      sails.sockets.join(req, 'activeSockets');
      pool[socketId] = [];
    }
  },

  // Notify connected sockets of new data
  notifySockets(data, type, system) {
    sails.io.sockets.in('activeSockets').clients((err, members) => {
      members.map((socketId) => {
        sails.sockets.broadcast(socketId, type, data);
      });
    });
  }

};

module.exports = Dispatcher;
