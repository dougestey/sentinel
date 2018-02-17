/**
 * ActiveSockets
 *
 * @description :: Keeps track of active client sockets.
 * @help        :: See https://next.sailsjs.com/documentation/concepts/services
 */

// Key value pairs, socket: characterId
let pool = {};

let ActiveSockets = {

  getPool() {
    return pool;
  },

  joinPool(req) {
    let characterId = req.session.characterToken.CharacterID,
        socketId = sails.sockets.getId(req);

    if (!_.has(pool, socketId)) {
      sails.sockets.join(req, 'activeSockets');
      pool[socketId] = characterId;
    }
  },

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

module.exports = ActiveSockets;
