/**
 * @fileoverview Calendar server interface. Handles HTTP calls to the calendar server.
 *
 * @author davidarvan
 * @license Unlicense https://unlicense.org
 */
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';

import { Attestation } from '../models/simplestamp/v1/attestation';
import { Execution } from './execution';

const DEFAULT_CALENDAR_URLS: string[] = fs
  .readFileSync(path.join(__dirname, '../config/calendars'), 'utf8')
  .split('\n')
  .filter((line) => line.length > 0);

type RequestFn = (options: https.RequestOptions, payload?: Buffer) => Promise<Buffer | undefined>;

export class Calendar {
  /** @internal */ request_: RequestFn = Calendar.defaultRequest_;

  /**
   * Call /digest on all calendars.
   * Returns the number of successful stamps.
   */
  async stamp(timestamp: import('./timestamp').Timestamp, optUrls?: string[]): Promise<number> {
    let stamps = 0;
    const stampUrls = (optUrls ?? DEFAULT_CALENDAR_URLS).map((url) => new URL(url));

    const digests = await Promise.all(
      stampUrls.map((url) => this.stampOne(url, timestamp.getDigestHash())),
    );

    digests.forEach((binary) => {
      if (!binary) return;
      try {
        timestamp.importDigestResponse(binary);
        stamps += 1;
      } catch (_e) {
        // Don't rethrow; let other imports potentially work
      }
    });

    return stamps;
  }

  /** Call /digest on one calendar. */
  async stampOne(url: URL, hash: Buffer): Promise<Buffer | undefined> {
    const options: https.RequestOptions = {
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

  /** Fetch updates from the calendar server for all pending attestations. */
  async update(timestamp: import('./timestamp').Timestamp): Promise<boolean> {
    const pending = timestamp.getPending();

    if (!pending.length) {
      return false;
    }

    const updated = await Promise.all(
      pending.map((p) => this.updateInternal_(timestamp, p)),
    );

    return updated.includes(true);
  }

  private async updateInternal_(
    timestamp: import('./timestamp').Timestamp,
    attestation: Attestation,
  ): Promise<boolean> {
    const digestHash = timestamp.getDigestHash();
    const calendarKey = Execution.deriveCalendarKey(digestHash, attestation.operations);

    const url = new URL(attestation.calendarUrl);
    const options: https.RequestOptions = {
      headers: {
        Accept: 'application/vnd.opentimestamps.v1',
      },
      hostname: url.hostname,
      method: 'GET',
      path: `/timestamp/${calendarKey.toString('hex')}`,
    };

    const data = await this.request_(options);

    try {
      if (data) {
        timestamp.upgradeAttestation(calendarKey, data);
      }
      return true;
    } catch (_e) {
      return false;
    }
  }

  /* istanbul ignore next */
  private static async defaultRequest_(
    options: https.RequestOptions,
    payload?: Buffer,
  ): Promise<Buffer | undefined> {
    const requestOptions = { ...options };

    if (payload) {
      requestOptions.headers = {
        ...requestOptions.headers,
        'Content-Length': Buffer.byteLength(payload),
      };
    }

    return new Promise((resolve) => {
      const data: Buffer[] = [];
      const req = https.request(requestOptions, (res) => {
        res.setEncoding('binary');
        res.on('data', (chunk: string) => {
          data.push(Buffer.from(chunk, 'binary'));
        });
        res.on('end', () => {
          resolve(Buffer.concat(data));
        });
      });

      req.on('error', (e) => {
        console.log(`Error calling ${requestOptions.hostname}: ${String(e)}`);
        resolve(undefined);
      });

      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  }
}
