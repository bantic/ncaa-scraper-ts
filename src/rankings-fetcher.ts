import { URLS } from './constants';
import getURL from './get-url';
import cheerio = require('cheerio');
import RowConverter, { Transformer } from './row-converter';

let RANKINGS;

const TEAM_ALIASES = {
  UNC: 'North Carolina',
  SMU: 'Southern Methodist',
  VCU: 'Virginia Commonwealth',
  USC: 'Southern California',
  ETSU: 'East Tennessee State'
}

export interface TeamRanking {
  ranking: number,
  ppg: number,
  SOS: number
  oSRS: number,
  dSRS: number,
  SRS: number,
  oRTG: number,
  dRTG: number,
  nRTG: number
};

const TRANSFORMERS = {
  toInt: (el, val) => parseInt(val, 10),
  toFloat: (el, val) => parseFloat(val)
};

const rowConverter = new RowConverter({
  ranker: Transformer.create('ranking', [TRANSFORMERS.toInt]),
  school_name: Transformer.create('name', []),
  pts_per_g: Transformer.create('ppg', [TRANSFORMERS.toFloat]),
  sos: Transformer.create('SOS', [TRANSFORMERS.toFloat]),
  srs_off: Transformer.create('oSRS', [TRANSFORMERS.toFloat]),
  srs_def: Transformer.create('dSRS', [TRANSFORMERS.toFloat]),
  srs: Transformer.create('SRS', [TRANSFORMERS.toFloat]),
  off_rtg: Transformer.create('oRTG', [TRANSFORMERS.toFloat]),
  def_rtg: Transformer.create('dRTG', [TRANSFORMERS.toFloat]),
  net_rtg: Transformer.create('nRTG', [TRANSFORMERS.toFloat]),
});

export default class RankingsFetcher {
  public static fetch(name): Promise<TeamRanking> {
    return new RankingsFetcher().run().then(results => {
      let namePieces = name.split(' ');
      while (namePieces.length) {
        let curName = namePieces.join(' ');
        if (TEAM_ALIASES[curName]) {
          curName = TEAM_ALIASES[curName]; // specific fixes for some schools          
        }
        let result = results[curName];
        if (result) { return result; }
        namePieces.pop();
      }
    });
  }

  run() {
    if (RANKINGS) {
      return Promise.resolve(RANKINGS);
    } else {
      return getURL(URLS.TEAMS_RANKINGS)
        .then(response => {
          RANKINGS = this.parseResponse(response);
        })
        .then(() => RANKINGS);
    }    
  }

  parseResponse(response) {
    let $ = cheerio.load(response);
    let rows = $('table#ratings tr:not(.thead)');
    let self = this;
    let results = {};
    rows.each(function() {
      let info = self.parseRow($(this), $);
      let name = info.name;
      delete info.name;
      results[name] = info;
    });
    return results;
  }

  parseRow(row, $) {
    return rowConverter.convert(row, $);
  }
}