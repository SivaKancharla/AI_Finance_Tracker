import env from '../../config/env.js';

export class RateGate {
  constructor(maxRpm = env.LLM_MAX_RPM || 10, queueTimeoutMs = 20000) {
    this.maxRpm = maxRpm;
    this.queueTimeoutMs = queueTimeoutMs;
    this.timestamps = [];
    this.queue = [];
    this.timer = null;
  }

  /**
   * Waits for an execution slot within the rolling 60-second window.
   * If queued longer than queueTimeoutMs, rejects with a timeout error.
   * 
   * @returns {Promise<void>}
   */
  async acquire() {
    // In test environment, skip gating if desired or enforce if maxRpm specified
    if (env.NODE_ENV === 'test' && !process.env.FORCE_RATE_GATE) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const entry = {
        resolve,
        reject,
        timer: setTimeout(() => {
          const idx = this.queue.indexOf(entry);
          if (idx !== -1) {
            this.queue.splice(idx, 1);
          }
          const err = new Error('Rate gate queue wait timeout exceeded (20s)');
          err.code = 'RATE_GATE_TIMEOUT';
          err.errorType = 'rate_limit';
          reject(err);
        }, this.queueTimeoutMs)
      };

      this.queue.push(entry);
      this._processQueue();
    });
  }

  _processQueue() {
    const now = Date.now();
    // Remove timestamps older than 60 seconds
    this.timestamps = this.timestamps.filter((t) => now - t < 60000);

    while (this.queue.length > 0 && this.timestamps.length < this.maxRpm) {
      const entry = this.queue.shift();
      clearTimeout(entry.timer);
      this.timestamps.push(Date.now());
      entry.resolve();
    }

    // Schedule next slot drain if queue still has pending callers
    if (this.queue.length > 0 && !this.timer) {
      const oldest = this.timestamps[0] || now;
      const waitMs = Math.max(50, 60000 - (now - oldest) + 20);
      this.timer = setTimeout(() => {
        this.timer = null;
        this._processQueue();
      }, waitMs);
    }
  }

  reset() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    for (const item of this.queue) {
      clearTimeout(item.timer);
    }
    this.queue = [];
    this.timestamps = [];
  }
}

export const rateGate = new RateGate();
export default rateGate;
