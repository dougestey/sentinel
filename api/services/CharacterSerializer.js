module.exports = {

  async one(idOrName) {
    let query = (function() {
      if (isNaN(idOrName)) {
        return { name: idOrName };
      } else {
        return idOrName;
      }
    })();

    let character = await Character.findOne(query)
      .populate('corporation')
      .populate('alliance')
      .populate('fleet')
      .populate('history');

    let knownCyno = false;
    let losses = await Kill.find({ victim: character.id })
      .sort('time DESC');

    for (let loss of losses) {
      for (let item of loss.items) {
        if (item.item_type_id === 21096) {
          knownCyno = true;
        }
      }
    }

    character.losses = losses;
    character.knownCyno = knownCyno;

    return character;
  }

};
