module.exports = {

  async status(req, res) {
    return res.status(200).json(sails.config.sentinel);
  }

}
