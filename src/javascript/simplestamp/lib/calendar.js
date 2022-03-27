/**
 * @fileoverview Calendar server interface. Handles making HTTP calls to the calendar server
 * and parsing the response. Abstracts details from other classes.
 *
 * The Calendar can submit a digest hash to the pool servers for attestation and call
 * the calendar server to look for updates after the hash has been stamped.
 *
 * @author davidarvan
 * @license Unlicense https://unlicense.org
 */
const fs = require('fs');
const https = require('https');
const path = require('path');

const Execution = require('./execution');

const DEFAULT_CALENDAR_URLS_ = fs.readFileSync(path.join(__dirname, '../config/calendars'), 'utf8')
  .split('\n').filter((line) => (line.length));

class Calendar {
  /**
   * Call the /digest endpoint on all of the calendars.
   *
   * @param {Timestamp} timestamp The Timestamp to be stamped by the calendar servers
   * @param  {Array.<string>} optUrls List of server URLs that will all be called in stamping to
   * @return {number} The number of stamps that worked.
   */
  async stamp(timestamp, optUrls) {
    let stamps = 0;
    const stampUrls = (optUrls || DEFAULT_CALENDAR_URLS_).map((url) => (new URL(url)));

    const digests = await Promise.all(
      stampUrls.map((url) => (this.stampOne(url, timestamp.getDigestHash()))),
    );

    digests.forEach((binary) => {
      try {
        timestamp.importDigestResponse(binary);
        stamps += 1;
      } catch (e) {
        // Don't rethrow, so the other imports can potentially work
        // eslint-disable-next-line no-console
        console.error('There was an error importing the digest data.', e);
      }
    });

    return stamps;
  }

  /**
   * Call the /digest endpoint on one calendar.
   *
   * @param {string} url The URL of the pool server
   * @param {Buffer} hash The hash to be stamped by the calendar servers
   * @return {Buffer} The binary content the server responded with.
   */
  async stampOne(url, hash) {
    const options = {
      headers: {
        Accept: 'application/vnd.opentimestamps.v1',
        'Content-Length': Buffer.byteLength(hash),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      hostname: url.hostname,
      method: 'POST',
      path: '/digest',
    };

    return this.request_(options, hash);
  }

  /**
   * Compute the URL for the calendar server and try to fetch updates to the digest hash.
   *
   * @param {Timestamp} timestamp The timestamp to attempt to update.
   * @return {boolean} Whether an update to the Timestamp was made.
   */
  // eslint-disable-next-line class-methods-use-this
  async update(timestamp) {
    const pending = timestamp.getPending();

    if (!pending.length) {
      return false;
    }

    const updated = await Promise.all(
      pending.map((p) => (this.updateInternal_(timestamp, p))),
    );

    return updated.includes(true);
  }

  /**
   * Extract out the code to query the calendar servers for updates to the attestation.
   *
   * @param {Timestamp} timestamp
   * @param {proto.simplestamp.v1.Attestation} attestation
   * @return {Promise}
   * @private
   */
  async updateInternal_(timestamp, attestation) {
    const digestHash = timestamp.getDigestHash();
    const calendarKey = Execution.deriveCalendarKey(
      digestHash,
      attestation.getOperationsList(),
    );

    const url = new URL(attestation.getCalendarUrl());

    const options = {
      headers: {
        Accept: 'application/vnd.opentimestamps.v1',
      },
      hostname: url.hostname,
      method: 'GET',
      path: `/timestamp/${calendarKey.toString('hex')}`,
    };

    const data = await this.request_(options);

    try {
      timestamp.upgradeAttestation(calendarKey, data);
      return true;
    } catch (e) {
      // Ignore parsing errors, the attestation was not upgraded
      return false;
    }
  }

  /**
   * Promisify the https library request.
   *
   * @param {Object} options The options with which to call the request.
   * @param {Buffer} payload The optional data to post.
   * @return {Promise.<Buffer>}
   * @private
   * @ignore
   */
  /* istanbul ignore next */
  // eslint-disable-next-line class-methods-use-this
  async request_(options, payload) {
    const requestOptions = options;

    if (payload) {
      requestOptions.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    return new Promise((resolve) => {
      const data = [];
      const req = https.request(options, (res) => {
        res.setEncoding('binary');

        res.on('data', (chunk) => {
          data.push(Buffer.from(chunk, 'binary'));
        });

        res.on('end', () => {
          resolve(Buffer.concat(data));
        });
      });

      req.on('error', (e) => {
        // Don't throw an error here so that an error with the server doesn't block others
        // eslint-disable-next-line no-console
        console.log(`There was an error trying to call ${req.url} on the remote server.`, e);
        resolve();
      });

      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  }
}

module.exports = Calendar;
