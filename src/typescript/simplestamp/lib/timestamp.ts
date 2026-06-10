/**
 * @fileoverview Wrapper with convenience methods for the underlying SimpleStamp protobuf.
 *
 * @author davidarvan
 * @license Unlicense https://unlicense.org
 */
import * as crypto from 'crypto';

import { Attestation } from '../models/simplestamp/v1/attestation';
import { AttestationStatus } from '../models/simplestamp/v1/status';
import { Identity } from '../models/simplestamp/v1/identity';
import { Location } from '../models/simplestamp/v1/location';
import { SimpleStamp } from '../models/simplestamp/v1/timestamp';
import { OperationType } from '../models/simplestamp/v1/operation';
import { Calendar } from './calendar';
import { Execution } from './execution';
import { Parser } from './parser';

const NONCE_SIZE = 16;

// Map from numeric OperationType → readable label
const OPERATION_TYPE_LABELS = new Map<number, string>(
  (Object.entries(OperationType) as [string, number | string][])
    .filter(([, v]) => typeof v === 'number')
    .map(([k, v]) => [v as number, k]),
);

// Map from numeric AttestationStatus → readable label
const STATUS_LABELS = new Map<number, string>(
  (Object.entries(AttestationStatus) as [string, number | string][])
    .filter(([, v]) => typeof v === 'number')
    .map(([k, v]) => [v as number, k]),
);

export class Timestamp {
  /** @internal */ timestamp_: SimpleStamp;
  /** @internal */ calendar_: Calendar;

  constructor(hash: Buffer) {
    if (!(hash instanceof Buffer) || !hash.length) {
      throw new Error('Timestamp requires a hash of type Buffer with content.');
    }

    this.calendar_ = new Calendar();
    this.timestamp_ = SimpleStamp.create({
      hash: Uint8Array.from(hash),
      nonce: Uint8Array.from(crypto.randomBytes(NONCE_SIZE)),
      created: Timestamp.getNow_(),
    });
  }

  /** Parse a serialized binary representation of an existing Timestamp. */
  static fromBinary(binary: Buffer): Timestamp {
    const ts = new Timestamp(Buffer.alloc(32));
    try {
      ts.timestamp_ = SimpleStamp.decode(binary);
    } catch (e) {
      throw new Error('Failed to decode binary data to SimpleStamp.');
    }
    return ts;
  }

  /**
   * Add an Attestation to this Timestamp's list.
   * Returns false if one with the same calendar URL already exists.
   */
  addAttestation(attestation: Attestation): boolean {
    const exists = this.timestamp_.attestations
      .some((a) => a.calendarUrl === attestation.calendarUrl);

    if (exists) {
      return false;
    }

    const att = { ...attestation, submitted: Timestamp.getNow_() };
    this.timestamp_.attestations.push(att);
    return true;
  }

  /**
   * Search attestations for one matching the calendar key.
   */
  getAttestationsByKey(calendarKey: Buffer): Attestation {
    const attestation = this.timestamp_.attestations.find((a) => {
      const key = Execution.deriveCalendarKey(this.getDigestHash(), a.operations);
      return key.equals(calendarKey);
    });

    if (!attestation) {
      throw new Error('No attestation was found with a matching calendar key.');
    }

    return attestation;
  }

  /** Get a readable label for an AttestationStatus value. */
  static getAttestationStatusLabel(status: number): string {
    return (STATUS_LABELS.get(status) ?? STATUS_LABELS.get(0) ?? 'ATTESTATION_STATUS_INVALID')
      .replace('ATTESTATION_STATUS_', '');
  }

  /**
   * Compute the digest hash: SHA256(SHA256(hash + nonce [+ source] [+ identity] [+ location]))
   */
  getDigestHash(): Buffer {
    const components: Buffer[] = [
      Buffer.from(this.timestamp_.hash),
      Buffer.from(this.timestamp_.nonce),
    ];

    if (this.timestamp_.source) {
      components.push(Buffer.from(this.timestamp_.source, 'utf8'));
    }

    if (this.timestamp_.identity !== undefined) {
      components.push(
        Buffer.from(Identity.encode(this.timestamp_.identity).finish()),
      );
    }

    if (this.timestamp_.location !== undefined) {
      components.push(
        Buffer.from(Location.encode(this.timestamp_.location).finish()),
      );
    }

    const combined = Buffer.concat(components);
    return Execution.sha256(Execution.sha256(combined));
  }

  /** Get a readable label for an OperationType value. */
  static getOperationTypeLabel(type: number): string {
    return (
      OPERATION_TYPE_LABELS.get(type) ??
      OPERATION_TYPE_LABELS.get(OperationType.OPERATION_TYPE_ATTESTATION) ??
      'OPERATION_TYPE_ATTESTATION'
    ).replace('OPERATION_TYPE_', '');
  }

  /** Get attestations in the pending state. */
  getPending(): Attestation[] {
    return this.timestamp_.attestations
      .filter((a) => a.status === AttestationStatus.ATTESTATION_STATUS_PENDING);
  }

  /** Whether there are attestations with pending updates. */
  hasPending(): boolean {
    return this.getPending().length > 0;
  }

  /**
   * Take the binary response from calling /digest, process it, and merge into attestations.
   */
  importDigestResponse(binary: Buffer): boolean {
    const operations = Parser.parseServerResponse(binary);
    const attestation = Attestation.create({ operations });
    const processed = Execution.processOperations(this.getDigestHash(), attestation);
    return this.addAttestation(processed);
  }

  /** Whether this Timestamp has been stamped (has attestations). */
  isStamped(): boolean {
    return this.timestamp_.attestations.length > 0;
  }

  /** Set the free-form description field. */
  setDescription(description: string): void {
    this.timestamp_.description = description;
  }

  /** Set identity information. Throws if already stamped. */
  setIdentity(
    countryCode: string,
    state: string,
    city: string,
    organization: string,
    section: string,
    commonName: string,
    email: string,
    fullName: string,
  ): void {
    if (this.isStamped()) {
      throw new Error('Timestamp already sent for attestation, cannot set the identity.');
    }
    this.timestamp_.identity = Identity.create({
      countryCode,
      state,
      city,
      organization,
      section,
      commonName,
      email,
      fullName,
    });
  }

  /** Set location and trajectory. Throws if already stamped. */
  setLocation(
    latitude: number,
    longitude = 0,
    altitude?: number,
    accuracy?: number,
    direction?: number,
    velocity?: number,
  ): void {
    if (this.isStamped()) {
      throw new Error('Timestamp already sent for attestation, cannot set the location.');
    }
    this.timestamp_.location = Location.create({
      latitude,
      longitude,
      altitude: altitude ?? 0,
      accuracyMeters: accuracy ?? 0,
      direction: direction ?? 0,
      velocity: velocity ?? 0,
    });
  }

  /** Override the random nonce value (mostly useful for testing). */
  setNonce(nonce: Buffer): void {
    this.timestamp_.nonce = Uint8Array.from(nonce);
  }

  /** Set the source field (file name, URL, etc.). */
  setSource(source: string): void {
    this.timestamp_.source = source;
  }

  /** Call /digest on all calendars. Returns the number of successful stamps. */
  async stamp(optUrls?: string[]): Promise<number> {
    return this.calendar_.stamp(this, optUrls);
  }

  /** Serialize to a portable binary representation. */
  toBinary(): Buffer {
    return Buffer.from(SimpleStamp.encode(this.timestamp_).finish());
  }

  /** JSON representation for inspecting/debugging. Not meant for re-importing. */
  toJSON(): Record<string, unknown> {
    const json: Record<string, unknown> = {
      attestations: [],
      created: new Date(this.timestamp_.created * 1000).toISOString(),
      hash: Buffer.from(this.timestamp_.hash).toString('hex'),
      nonce: Buffer.from(this.timestamp_.nonce).toString('hex'),
      source: this.timestamp_.source,
    };

    if (this.timestamp_.identity !== undefined) {
      json.identity = { ...this.timestamp_.identity };
    }

    if (this.timestamp_.location !== undefined) {
      json.location = { ...this.timestamp_.location };
    }

    const attestationsJson: Record<string, unknown>[] = [];
    this.timestamp_.attestations.forEach((attestation) => {
      const obj: Record<string, unknown> = {
        blockMerkleRoot: Buffer.from(attestation.blockMerkleRoot).toString('hex'),
        blockHeight: attestation.blockHeight,
        calendarKey: Execution.deriveCalendarKey(
          this.getDigestHash(),
          attestation.operations,
        ).toString('hex'),
        calendarUrl: attestation.calendarUrl,
        status: Timestamp.getAttestationStatusLabel(attestation.status),
        submitted: new Date(attestation.submitted * 1000).toISOString(),
        timestampMerkleRoot: Buffer.from(attestation.timestampMerkleRoot).toString('hex'),
        transactionId: Buffer.from(attestation.transactionId).toString('hex'),
        operations: attestation.operations.map((operation) => ({
          blockHeight: operation.blockHeight,
          calendarUrl: operation.calendarUrl,
          status: operation.status
            ? Timestamp.getAttestationStatusLabel(operation.status) : '',
          type: Timestamp.getOperationTypeLabel(operation.type),
          value: Buffer.from(operation.value).toString('hex'),
        })),
      };
      attestationsJson.push(obj);
    });
    json.attestations = attestationsJson;

    return json;
  }

  /** Nicer string representation. Not meant for re-importing. */
  toString(): string {
    return `SimpleStamp: ${JSON.stringify(this.toJSON())}`;
  }

  /** Compute updates from the calendar server. */
  async update(): Promise<boolean> {
    return this.calendar_.update(this);
  }

  /**
   * Find the attestation by calendar key, attach new operations, and execute them.
   */
  upgradeAttestation(calendarKey: Buffer, binary: Buffer): boolean {
    const existing = this.getAttestationsByKey(calendarKey);

    if (existing.status !== AttestationStatus.ATTESTATION_STATUS_PENDING) {
      throw new Error('Attestation has already been upgraded with timestamp data.');
    }

    let operations = existing.operations;
    try {
      const parsed = Parser.parseServerResponse(binary);
      operations = existing.operations.concat(parsed);
    } catch (_e) {
      // Bad or unrecognized data from the server — continue with existing operations only
    }

    const idx = this.timestamp_.attestations.indexOf(existing);
    const upgraded = { ...existing, operations };
    this.timestamp_.attestations[idx] = Execution.processOperations(
      this.getDigestHash(),
      upgraded,
    );
    return true;
  }

  /** Utility method for UNIX timestamp in seconds. @internal */
  static getNow_(): number {
    return Math.floor(Date.now() / 1000);
  }
}
