import request = require('request');
import cachedRequest = require('cached-request');

let chromeUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0 Safari/537.36';
let safariUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.75.14 (KHTML, like Gecko) Version/7.0.3 Safari/7046A194A';
const TTL = 1000 * 60 * 60 * 4; // cache for 4 hours

let requester = cachedRequest(request);
requester.setCacheDirectory('cached_requests');

export default function getURL(url: string): Promise<string>{
  return new Promise((resolve, reject) => {
    requester({
      url,
      headers: { 'User-Agent': safariUA},
      ttl: TTL
    }, function(error, response, body) {
      if (error) { return reject(error); }
      return resolve(body);
    });
  });
}