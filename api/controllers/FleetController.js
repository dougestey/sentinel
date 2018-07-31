/**
 * FleetController
 *
 * @description :: Server-side logic for managing Fleets
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

  async track(req, res) {
    if (!req.params.fleetId)
      return res.badRequest();

    let { fleetId } = req.params;

    let fleet = await FleetSerializer.one(fleetId);

    if (!fleet)
      return res.notFound();

    // Subscribe sockets to future fleet updates.
    if (req.isSocket) {
      Dispatcher.joinPool(req);
    }

    return res.status(200).json(fleet);
  },

  async active (req, res) {
    let fleets = await Fleet.find({ isActive: true });
    let resolved = [];

    for (let fleet of fleets) {
      let resolvedFleet = await FleetSerializer.one(fleet.id);

      resolved.push(resolvedFleet);
    }

    return res.status(200).json(resolved);
  }

};
