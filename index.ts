import TeamFetcher, { TeamInfo } from './src/team-fetcher';
import TeamsFetcher from './src/teams-fetcher';
import RankingsFetcher from './src/rankings-fetcher';
import Writer from './src/stats-writer';

console.log('hi!');
let delay = () => {
  return new Promise((resolve, reject) => {
    //let time = Math.floor(250 + Math.random()*500);
    setTimeout(resolve, 10); // no delay if we are cached
  });
};
/*
let fetcher = new TeamFetcher('http://www.sports-reference.com/cbb/schools/kansas/2017.html');
fetcher.run().then(results => {
  console.log(results);
});
*/
/*
RankingsFetcher.fetch('Kentucky').then(results => {
  console.log('results',results);
});
*/
let done = 0;
let writer = new Writer();
writer.setupWriter()
  .then(() => {
    return new TeamsFetcher().run();
  })
  .then((teamShortInfos) => {
    let promise = Promise.resolve();
    teamShortInfos.forEach((shortInfo) => {
      promise = promise.then(() => {
        console.log('fetching',shortInfo.name);
        return delay().then(() => {
          let fetcher = new TeamFetcher(shortInfo);
          return fetcher.run();
        }).then((teamInfo: TeamInfo) => {
          console.log('done fetching',shortInfo.name);
          return writer.write(teamInfo);
        }).then(() => {
          done++;
          console.log('completed',done);
        });
      });
    });
    return promise;
  }).then(() => {
    console.log('DONE!');
  });
