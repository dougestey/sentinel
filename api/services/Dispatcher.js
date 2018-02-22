/**
 * Dispatcher
 *
 * @description :: Dispatches data to interested entities.
 * @help        :: See https://next.sailsjs.com/documentation/concepts/services
 */


let Dispatcher = {

  // Process the kill data so we can act on it.
  async processKill(record) {
    let system = await Swagger.system(record.systemId);
    let room = System.getRoomName(system.id);

    // We only want to notify connected sockets of kills
    // in their subscribed system(s).
    sails.io.sockets.in(room).clients((err, members) => {
      members.map(async(socketId) => {
        let kill = await ZkillResolve.kill(record);

        // Pipe it down to the client
        sails.sockets.broadcast(socketId, 'kill', kill);
      });
    });
  }

};

module.exports = Dispatcher;
