// Simple sliding-window rate limiter so the whole bot (across every guild it's
// monitoring) never exceeds start.gg's documented limit of 80 requests / 60s.
export class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.timestamps = [];
    this.queue = [];
    this.processing = false;
  }

  schedule(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this._process();
    });
  }

  async _process() {
    if (this.processing) return;
    this.processing = true;
    try {
      while (this.queue.length > 0) {
        const now = Date.now();
        this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);

        if (this.timestamps.length >= this.maxRequests) {
          const oldest = this.timestamps[0];
          const waitMs = this.windowMs - (now - oldest) + 25;
          await sleep(waitMs);
          continue;
        }

        const { fn, resolve, reject } = this.queue.shift();
        this.timestamps.push(Date.now());
        try {
          resolve(await fn());
        } catch (err) {
          reject(err);
        }
      }
    } finally {
      this.processing = false;
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
