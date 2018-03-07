/**
 * Dispatcher
 *
 * @description :: Dispatches data to interested entities.
 * @help        :: See https://next.sailsjs.com/documentation/concepts/services
 */


let Dispatcher = {

  // Notify connected sockets of new data
  notifySockets(data, type, system) {
    let room = System.getRoomName(system);

    // We only want to notify connected sockets of kills
    // in their subscribed system(s).
    sails.io.sockets.in(room).clients((err, members) => {
      members.map((socketId) => {
        sails.sockets.broadcast(socketId, type, data);
      });
    });
  }

};

module.exports = Dispatcher;
