/**
 * CharacterController
 *
 * @description :: Character lookup controller
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

  async find(req, res) {
    let { name } = req.query;

    if (name) {
      characters = await Character.find({
        where: { 
          name: {
            contains: name
          }
        }
      });
    } else {
      characters = await Character.find(req.query);
    }

    let results = [];

    for (let character of characters) {
      let result = await CharacterSerializer.one(character.id);

      results.push(result);
    }

    return res.status(200).json(results);
  },

  async findOne(req, res) {
    if (!req.params.id)
      return res.badRequest();

    let { id } = req.params;

    let character = await CharacterSerializer.one(id);

    if (!character)
      return res.notFound();

    return res.status(200).json(character);
  }

};
