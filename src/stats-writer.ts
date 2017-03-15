import { TeamInfo } from './team-fetcher';
import GoogleSpreadsheet = require('google-spreadsheet');
import { SHEET } from './constants';

export default class StatsWriter {
  doc: any;

  constructor() {
    this.doc = new GoogleSpreadsheet(SHEET.ID);
  }

  write(info: TeamInfo) {
    let data = this.serialize(info);
    let worksheetId = 1;
    return new Promise((resolve, reject) => {
      this.doc.addRow(worksheetId, data, function(err) {
        if (err) { return reject(err); }
        return resolve();
      })
    })
  }

  serialize(info: TeamInfo) {
    let keys = [
      "name","seed",
      "wins","losses",
      "regularSeasonWins","regularSeasonLosses",
      "closeLosses","roadWins",
      "blowoutRoadWins","roadLosses",
      "last10", "streaks",
      "ranking.ranking",
      "ranking.ppg",
      "ranking.SOS",
      "ranking.oSRS",
      "ranking.dSRS",
      "ranking.SRS",
      "ranking.oRTG",
      "ranking.dRTG",
      "ranking.nRTG"
    ];
    return keys.reduce((memo, acc) => {
      let obj = info;
      let key = acc;
      if (key.includes('.')) {
        let [outerKey, innerKey] = key.split('.');
        obj = obj[outerKey] || {};
        key = innerKey;
      }
      let val = obj[key];
      memo[key.toLowerCase()] = val;
      return memo;
    }, {});
  }

  setupWriter(): Promise<any> {
    return new Promise((resolve, reject) => {
      return this.doc.useServiceAccountAuth(SHEET.CREDS, function(err){
        if (err) { return reject(err); }
        return resolve();
      });
    });
  }
}