import { URLS } from './constants';
import getURL from './get-url';
import cheerio = require('cheerio');

export interface TeamShortInfo {
  name: string,
  url: string,
  seed: number
}

export default class TeamsFetcher {
  SELECTORS: any;
  $: any;

  constructor() {
    this.SELECTORS = { row: "table#forecast tbody tr:not(.thead)" };
  }

  run(): Promise<TeamShortInfo[]> {
    console.log('runing');
    return getURL(URLS.TEAMS_LIST)
      .then(body =>  {
        //console.log(body); 
        this.$ = cheerio.load(body);
      })
      .then(() => this.parseBody());
  }

  parseBody() {
    let rows = this.$(this.SELECTORS.row);
    let self = this;
    return Array.from(rows.map(function(i, el) {
      let row = self.$(this);
      return self.parseRow(row);
    }));
  }

  parseRow(row): TeamShortInfo {
    return {
      seed: row.find("[data-stat=seed]").text(),
      name: row.find("[data-stat=school_name]").text(),
      url: URLS.TEAMS_BASE + row.find("[data-stat=school_name] a").attr("href")
    };
  }
}