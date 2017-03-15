import getURL from './get-url';
import cheerio = require('cheerio');
import { URLS } from './constants';
import RowConverter, { Transformer } from './row-converter';
import RankingsFetcher, { TeamRanking }  from './rankings-fetcher';
import { TeamShortInfo } from './teams-fetcher';

export interface TeamInfo {
  name: string,
  seed: number,
  wins: number,
  losses: number,
  regularSeasonWins: number,
  regularSeasonLosses: number,
  closeLosses: number,
  roadWins: number,
  blowoutRoadWins: number,
  roadLosses: number,
  games: GameInfo[],
  ranking: TeamRanking,
  last10: string,
  streaks: string
};

interface GameInfo {
  date: string,
  type: GAME_TYPES,
  result: GAME_RESULTS,
  opponent: string,
  points: number,
  oppPoints: number,
  overtimes: number,
  location
}; 

const THRESHOLDS = {
  CLOSE_LOSS: 5,
  BLOWOUT: 18
};

enum LOCATIONS { HOME=1, AWAY, NEUTRAL, OTHER };
enum GAME_TYPES { REGULAR_SEASON=1, OTHER };
enum GAME_RESULTS {  WIN=1,  LOSS,  UNPLAYED };

let TRANSFORMS = {
  yyyyMmDd(el, val) { // return "MM-DD-YYYY"
    val = el.attr('csk');
    let [y, m, d] = val.split('-');
    let lpad = (str, len=2, padding='0'): string => {
      while (str.length <= len) {
        str = padding + str;
      }
      return str;
    };
    return [m,d,y].map(i => lpad(i)).join('-');
  },
  gameResult(el, val) {
    if (val === 'W') { return GAME_RESULTS.WIN; }
    if (val === 'L') { return GAME_RESULTS.LOSS; }
    return GAME_RESULTS.UNPLAYED;
  },
  toInt(el, val) { return parseInt(val, 10); },
  parseOT(el, val) {
    if (val === '') { return 0; }
    if (val === 'OT') { return 1; }
    return parseInt(val.slice(0,1));
  },
  gameType(el, val) {
    if (val === 'REG') { return GAME_TYPES.REGULAR_SEASON; }
    return GAME_TYPES.OTHER;
  },
  gameLocation(el, val) {
    if (val === '') { return LOCATIONS.HOME; }
    if (val === '@') { return LOCATIONS.AWAY; }
    if (val === 'N') { return LOCATIONS.NEUTRAL; }
    return LOCATIONS.OTHER;
  },
  opponentName(el, val) {
    let rankRegex = /\(\d?\d\)$/;
    if (rankRegex.test(val)) {
      val = val.replace(rankRegex, '');
    }
    return val;
  }
};

const rowConverter = new RowConverter({
  date_game: Transformer.create('date', [TRANSFORMS.yyyyMmDd]),
  game_type: Transformer.create('type', [TRANSFORMS.gameType]),
  game_location: Transformer.create('location', [TRANSFORMS.gameLocation]),
  opp_name: Transformer.create('opponent', [TRANSFORMS.opponentName]),
  game_result: Transformer.create('result', [TRANSFORMS.gameResult]),
  pts: Transformer.create('points', [TRANSFORMS.toInt]),
  opp_pts: Transformer.create('oppPoints', [TRANSFORMS.toInt]),
  overtimes: Transformer.create('overtimes', [TRANSFORMS.parseOT, TRANSFORMS.toInt])
});

export default class TeamFetcher {
  url: string;
  pages: any;
  name: string;
  seed: number;
  ranking: TeamRanking;

  constructor(info: TeamShortInfo) {
    this.url = info.url;
    this.seed = info.seed;
    this.name = info.name;
  }

  run(): Promise<TeamInfo> {
    this.pages = {};

    return getURL(this.url)
      .then(body => {
        this.pages.main = cheerio.load(body);
        return RankingsFetcher.fetch(this.name);
      }).then(ranking => {
        this.ranking = ranking;
      }).then(() => {
        let scheduleUrl = this.findScheduleUrl(this.pages.main);
        return getURL(scheduleUrl);
      })
      .then(body => {
        this.pages.schedule = cheerio.load(body);
      })
      .then(() => {
        let games = this.parseGameInfo(this.pages.schedule);
        let stats = this.aggregateGames(games);
        return stats;
      });
  }

  aggregateGames(games: GameInfo[]): TeamInfo {
    let isPlayed = (val: GameInfo) => val.result !== GAME_RESULTS.UNPLAYED;
    games = games.filter(isPlayed);

    let isWin = (val: GameInfo) => val.result === GAME_RESULTS.WIN;
    let isLoss = (val: GameInfo) => val.result === GAME_RESULTS.LOSS;
    let isRegularSeason = (val: GameInfo) => val.type === GAME_TYPES.REGULAR_SEASON;
    let isClose = (val: GameInfo) => Math.abs(val.points - val.oppPoints) <= THRESHOLDS.CLOSE_LOSS;
    let isBlowout = (val: GameInfo) => Math.abs(val.points - val.oppPoints) >= THRESHOLDS.BLOWOUT;
    let isAway = (val: GameInfo) => val.location === LOCATIONS.AWAY;

    let last10 = games.reverse().slice(0, 10);
    let last10Wins = last10.filter(isWin).length;
    let last10Losses = last10.filter(isLoss).length;

    let streaks = games.filter(isRegularSeason).reduce((memo, acc: GameInfo) => {
      let cur = memo[memo.length-1];
      if (acc.result === GAME_RESULTS.WIN) {
        memo[memo.length-1] = cur + 1;
      } else {
        memo.push(0);
      }
      return memo;
    }, [0]).filter(v => v !== 0).join(',');

    return {
      name: this.name,
      seed: this.seed,
      games,
      ranking: this.ranking,
      wins: games.filter(isWin).length,
      losses: games.filter(isLoss).length,
      regularSeasonWins: games.filter(isRegularSeason).filter(isWin).length,
      regularSeasonLosses: games.filter(isRegularSeason).filter(isLoss).length,
      closeLosses: games.filter(isLoss).filter(isClose).length,
      roadWins: games.filter(isRegularSeason).filter(isWin).filter(isAway).length,
      blowoutRoadWins: games.filter(isRegularSeason).filter(isWin).filter(isBlowout).length,
      roadLosses: games.filter(isRegularSeason).filter(isLoss).filter(isAway).length,
      last10: `${last10Wins}-${last10Losses}`,
      streaks
    };
  }

  findScheduleUrl($: any): string {
    let nav = $('div[role="navigation"]');
    let link = nav.find('a:contains(Schedule)');
    return URLS.TEAMS_BASE + link.attr('href');
  }

  parseGameInfo($: any): GameInfo[] {
    let rows: any = $('#schedule tbody tr:not(.thead)');
    let self = this;
    let results = [];
    rows.each(function() {
      results.push(self.parseRow($(this), $));
    });
    return results;
  }

  parseRow(row, $): GameInfo {
    let self = this;
    return rowConverter.convert(row, $);
  }
}
