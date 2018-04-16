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

    systemId = parseInt(systemId);

    let system = await Swagger.system(systemId);

    if (!system)
      return res.notFound();

    let fleets = await Fleet.find({ system: system.id, isActive: true })
      .populate('characters')
      .populate('kills')
      .sort('lastSeen DESC');

    let kills = await Kill.find({ system: system.id })
      .populate('ship')
      .populate('victim')
      .populate('fleet')
      .sort('time DESC')
      .limit(10);

    let resolvedFleets = [];

    for (let fleet of fleets) {
      let resolvedFleet = await FleetSerializer.one(fleet.id);

      resolvedFleets.push(resolvedFleet);
    }

    // Subscribe sockets to future system updates.
    if (req.isSocket) {
      Dispatcher.joinPool(req);
    }

    return res.status(200).json(
      {
        systemId,
        system,
        fleets: resolvedFleets,
        kills
      }
    );
  }

};
