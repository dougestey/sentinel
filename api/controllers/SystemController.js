/**
 * SystemController
 *
 * @description :: Server-side logic for managing Systems
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

  async track(req, res) {
    if (!req.params.systemId)
      return res.badRequest();

    let { systemId } = req.params;

    let system = await System.findOne({ systemId });

    if (!system)
      return res.notFound();

    let fleets = await Fleet.find({ system: system.id, isActive: true })
      .populate('characters')
      .sort('lastSeen DESC');

    let kills = await Kill.find({ system: system.id })
      .populate('ship')
      .populate('victim')
      .populate('fleet')
      .sort('time DESC')
      .limit(10);

    if (req.isSocket) {
      System.subscribe(req, [system.id]);
    }

    return res.status(200).json({ systemId, system, fleets, kills });
  }

};
