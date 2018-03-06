/**
 * SystemController
 *
 * @description :: Server-side logic for managing Systems
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

  async findOne(req, res) {
    if (!req.params.systemId)
      return res.badRequest();

    let system = await System.findOne({ systemId: req.params.systemId })
      .populate('fleets')
      .populate('kills');

    if (!system)
      return res.notFound();

    if (req.isSocket) {
      System.subscribe(req, [system.id]);
    }

    let { fleets, kills } = system;

    return res.status(200).json({ systemId, fleets, kills });
  }

};
