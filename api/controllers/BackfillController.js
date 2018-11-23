/**
 * BackfillController
 *
 * @description :: Server-side logic for managing Backfills
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

const fs = require('fs');
const BACKFILL_RANGE_SQL = fs.readFileSync('sql/backfill_range.sql', { encoding: 'UTF-8' });

module.exports = {
  async all(req, res) {
    let { rows: ranges } = await Kill.getDatastore().sendNativeQuery(BACKFILL_RANGE_SQL);

    ranges = ranges.filter((range) => {
      if (range.end - range.start > 1000) {
        return range;
      }
    });

    return res.status(200).json(ranges);
  },
}
