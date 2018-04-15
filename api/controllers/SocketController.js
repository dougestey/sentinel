/**
 * SocketController
 *
 * @description :: Server-side logic for managing Sockets
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

  connect(req, res) {
    if (req.isSocket) {
      Dispatcher.joinPool(req);

      return res.status(200).send();
    }

    return res.status(403).send();
  }

}
