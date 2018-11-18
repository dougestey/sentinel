/**
 * FleetController
 *
 * @description :: Server-side logic for managing Fleets
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

  async findOne(req, res) {
    if (!req.params.id)
      return res.badRequest();

    let { id } = req.params;

    let fleet = await FleetSerializer.one(id);

    if (!fleet)
      return res.notFound();

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
