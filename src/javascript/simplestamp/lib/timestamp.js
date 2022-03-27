/**
 * @fileoverview Wrapper with convenience methods for the underlying Timestamp protocol buffer.
 * Creates new timestamps for attestation, or can build a timestamp from an existing serialized
 * binary version.
 *
 * @author davidarvan
 * @license Unlicense https://unlicense.org
 */
const crypto = require('crypto');

const Calendar = require('./calendar');
const Execution = require('./execution');
const Parser = require('./parser');

const { Attestation } = require('../models/simplestamp/v1/attestation_pb');
const { AttestationStatus } = require('../models/simplestamp/v1/status_pb');
const { Identity } = require('../models/simplestamp/v1/identity_pb');
const { Location } = require('../models/simplestamp/v1/location_pb');
const { SimpleStamp } = require('../models/simplestamp/v1/timestamp_pb');
const { OperationType } = require('../models/simplestamp/v1/operation_pb');

const NONCE_SIZE_ = 16;

// Inverted key/value pairs from the OperationType enum to allow for fast lookup
// of nicer readable labels.
const OPERATION_TYPE_LABELS_ = {};
Object.entries(OperationType).forEach((entry) => {
  [OPERATION_TYPE_LABELS_[entry[1]]] = entry;
});

// Inverted key/value pairs from the AttestationStatus enum to allow for fast lookup
// of nicer readable labels.
const STATUS_LABELS_ = {};
Object.entries(AttestationStatus).forEach((entry) => {
  [STATUS_LABELS_[entry[1]]] = entry;
});

class Timestamp {
  /**
   * @param  {Buffer} hash The hash of the data to be timestamped.
   * @constructor
   */
  constructor(hash) {
    if (!(hash instanceof Buffer) || !hash.length) {
      throw new Error('Timestamp requires a hash of type Buffer with content.');
    }

    // Reference for overriding underlying methods in testing
    // @private {Calendar}
    this.calendar_ = new Calendar();

    this.timestamp_ = new SimpleStamp();
    this.timestamp_.setHash(hash);
    this.timestamp_.setNonce(Uint8Array.from(crypto.randomBytes(NONCE_SIZE_)));
    this.timestamp_.setCreated(Timestamp.getNow_());
  }

  /**
   * Parse a serialized binary representation of an existing Timestamp.
   *
   * @param {Buffer} binary The serialized binary data from file, database, etc.
   * @return {Timestamp}
   */
  static fromBinary(binary) {
    const ts = new Timestamp(Buffer.alloc(32));

    try {
      ts.timestamp_ = SimpleStamp.deserializeBinary(binary);
    } catch (e) {
      throw new Error('Failed to decode binary data to SimpleStamp.');
    }

    return ts;
  }

  /**
   * Add an Attestation to this Timestamp's list. Ignores it if there is already an attestation
   * with the same calendar URL.
   *
   * @param {proto.simplestamp.v1.Attestation} attestation
   * @return {boolean} If the data resulted in adding a new Attestation
   */
  addAttestation(attestation) {
    const exists = this.timestamp_.getAttestationsList()
      .some((a) => (a.getCalendarUrl() === attestation.getCalendarUrl()));

    if (exists) {
      return false;
    }

    attestation.setSubmitted(Timestamp.getNow_());
    this.timestamp_.addAttestations(attestation);
    return true;
  }

  /**
   * Search the timestamp's attestations for the one that matches the calendar key.
   *
   * @param {string} calendarKey The key used to construct the URL to the calendar server.
   * @return {proto.simplestamp.v1.AttestationStatus}
   */
  getAttestationsByKey(calendarKey) {
    const attestation = this.timestamp_.getAttestationsList().find((a) => {
      const attestationKey = Execution.deriveCalendarKey(
        this.getDigestHash(),
        a.getOperationsList(),
      );
      return attestationKey.equals(calendarKey);
    });

    if (!attestation) {
      throw new Error('No attestation was found with a matching calendar key.');
    }

    return attestation;
  }

  /**
   * Get the nice readable label for AttestationStatus values.
   *
   * @param {proto.simplestamp.v1.AttestationStatus} status
   * @return {string}
   */
  static getAttestationStatusLabel(status) {
    return (STATUS_LABELS_[status] || STATUS_LABELS_[0])
      .replace('ATTESTATION_STATUS_', '');
  }

  /**
   * Compute the hash that will be submitted as a hash of the combination of the
   * source data's hash and the unique nonce. If the source value or identity information
   * is set, include those as well.
   *
   * @return {Buffer}
   */
  getDigestHash() {
    const components = [
      Buffer.from(this.timestamp_.getHash()),
      Buffer.from(this.timestamp_.getNonce()),
    ];

    if (this.timestamp_.getSource()) {
      components.push(Buffer.from(this.timestamp_.getSource(), 'utf8'));
    }

    if (this.timestamp_.hasIdentity()) {
      components.push(Buffer.from(this.timestamp_.getIdentity().serializeBinary()));
    }

    if (this.timestamp_.hasLocation()) {
      components.push(Buffer.from(this.timestamp_.getLocation().serializeBinary()));
    }

    const combined = Buffer.concat(components);
    return Execution.sha256(Execution.sha256(combined));
  }

  /**
   * Get the nice readable label for OperationType values.
   *
   * @param {proto.simplestamp.v1.OperationType} type
   * @return {string}
   */
  static getOperationTypeLabel(type) {
    return (OPERATION_TYPE_LABELS_[type] || OPERATION_TYPE_LABELS_[0])
      .replace('OPERATION_TYPE_', '');
  }

  /**
   * Get the Attestations that are in the pending state and could potentially be
   * upgraded by checking the calendar server for updates.
   *
   * @return {boolean}
   */
  getPending() {
    return this.timestamp_.getAttestationsList()
      .filter((a) => (a.getStatus() === AttestationStatus.ATTESTATION_STATUS_PENDING));
  }

  /**
   * Whether there are attestations with pending updates.
   *
   * @return {boolean}
   */
  hasPending() {
    return this.getPending().length > 0;
  }

  /**
   * Take the binary response from calling /digest on a calendar server, process it,
   * and merge it into the attestations.
   *
   * @param {Buffer} binary
   * @return {boolean} If the data resulted in adding a new Attestation
   */
  importDigestResponse(binary) {
    const operations = Parser.parseServerResponse(binary);
    const attestation = new Attestation();
    attestation.setOperationsList(operations);

    const processed = Execution.processOperations(this.getDigestHash(), attestation);
    return this.addAttestation(processed);
  }

  /**
   * If this Timestamp has been "stamped", it will have Attestations in the
   * ATTESTATION_STATUS_PENDING state, otherwise it will have no Attestations.
   *
   * @return {boolean}
   */
  isStamped() {
    return !!this.timestamp_.getAttestationsList().length;
  }

  /**
   * Set the Identity information on the timestamp. All fields are optional.
   * Calling this function twice with missing fields that previously existed
   * will those previous values.
   *
   * @param {string} countryCode
   * @param {string} state
   * @param {string} city
   * @param {string} organization
   * @param {string} section
   * @param {string} commonName
   * @param {string} email
   * @param {string} fullName
   */
  setIdentity(
    countryCode,
    state,
    city,
    organization,
    section,
    commonName,
    email,
    fullName,
  ) {
    if (this.isStamped()) {
      throw new Error('Timestamp already sent for attestation, cannot set the identity.');
    }

    const identity = new Identity();
    identity.setCountryCode(countryCode);
    identity.setState(state);
    identity.setCity(city);
    identity.setOrganization(organization);
    identity.setSection(section);
    identity.setCommonName(commonName);
    identity.setEmail(email);
    identity.setFullName(fullName);

    this.timestamp_.setIdentity(identity);
  }

  /**
   * Set the location and trajectory of where this Timestamp was created.
   *
   * @param {number} latitude
   * @param {number} longitude
   * @param {number} altitude
   * @param {number} accuracy
   * @param {number} direction
   * @param {number} velocity
   */
  setLocation(
    latitude,
    longitude,
    altitude,
    accuracy,
    direction,
    velocity,
  ) {
    if (this.isStamped()) {
      throw new Error('Timestamp already sent for attestation, cannot set the location.');
    }

    const location = new Location();
    location.setLatitude(latitude);
    location.setLongitude(longitude);
    location.setAltitude(altitude);
    location.setAccuracyMeters(accuracy);
    location.setDirection(direction);
    location.setVelocity(velocity);
    this.timestamp_.setLocation(location);
  }

  /**
   * Override the random nonce value. Mostly useful for testing.
   *
   * @param {Buffer} nonce
   */
  setNonce(nonce) {
    this.timestamp_.setNonce(nonce);
  }

  /**
   * Set the source field; file name, URL, etc. Helpful for identifying the source
   * of the hash the data was derived from. This will be included when computing
   * the digest hash.
   *
   * @param {string} source
   */
  setSource(source) {
    this.timestamp_.setSource(source);
  }

  /**
   * Call the /digest endpoint on all of the calendars. Convenience method to the Calendar class.
   *
   * @param  {Array.<string>} optUrls List of server URLs that will all be called in stamping to
   * @return {number} The number of stamps that worked.
   */
  async stamp(optUrls) {
    return this.calendar_.stamp(this, optUrls);
  }

  /**
   * Create a portable, serialized version of the Timestamp.
   *
   * @return {Buffer}
   */
  toBinary() {
    return Buffer.from(this.timestamp_.serializeBinary());
  }

  /**
   * JSON representation of a Timestamp
   *
   * Converts enum and UNIX timestamp values to more readable formats. This is
   * meant for inspecting and debugging, not for reimporting.
   *
   * @return {Object}
   */
  toJSON() {
    const json = {
      attestations: [],
      created: (new Date(this.timestamp_.getCreated() * 1000)).toISOString(),
      hash: Buffer.from(this.timestamp_.getHash()).toString('hex'),
      nonce: Buffer.from(this.timestamp_.getNonce()).toString('hex'),
      source: this.timestamp_.getSource(),
    };

    if (this.timestamp_.hasIdentity()) {
      json.identity = this.timestamp_.getIdentity().toObject();
    }

    if (this.timestamp_.hasLocation()) {
      json.location = this.timestamp_.getLocation().toObject();
    }

    this.timestamp_.getAttestationsList().forEach((attestation) => {
      const obj = attestation.toObject();

      obj.blockMerkleRoot = Buffer.from(attestation.getBlockMerkleRoot()).toString('hex');
      obj.calendarKey = Execution.deriveCalendarKey(
        this.getDigestHash(),
        attestation.getOperationsList(),
      ).toString('hex');
      obj.timestampMerkleRoot = Buffer.from(attestation.getTimestampMerkleRoot()).toString('hex');
      obj.transactionId = Buffer.from(attestation.getTransactionId()).toString('hex');

      // Convert enum values to readable labels
      obj.status = Timestamp.getAttestationStatusLabel(attestation.getStatus());

      delete obj.operationsList;
      obj.operations = attestation.getOperationsList().map((operation) => {
        const op = operation.toObject();
        op.type = Timestamp.getOperationTypeLabel(operation.getType());
        op.status = operation.getStatus()
          ? Timestamp.getAttestationStatusLabel(operation.getStatus()) : '';

        // Convert the binary data to hex for portability
        if (operation.getValue()) {
          op.value = Buffer.from(operation.getValue()).toString('hex');
        }

        return op;
      });

      // Convert the UNIX timestamp to readable and portable ISO format
      obj.submitted = (new Date(obj.submitted * 1000)).toISOString();

      json.attestations.push(obj);
    });

    return json;
  }

  /**
   * Nicer string representation of the data, not meant to be imported.
   *
   * @return {string}
   */
  toString() {
    return `SimpleStamp: ${JSON.stringify(this.toJSON())}`;
  }

  /**
   * Compute the URL for the calendar server and try to fetch updates to the digest hash.
   * Conveniece wrapper for the Calendar class.
   *
   * @return {boolean} Whether an update to the Timestamp was made.
   */
  async update() {
    return this.calendar_.update(this);
  }

  /**
   * Given the calendar key and binary data response, find the correct attestation,
   * attach the parsed operations, and execute them.
   *
   * Will throw an error if the attestation cannot be found, or if it is but is
   * already upgraded.
   *
   * @param {Buffer} calendarKey The key used to construct the URL to the calendar server.
   * @param {Buffer} binary The binary payload response from querying the calendar server.
   * @return {boolean} True if everything worked, throws error otherwise.
   */
  upgradeAttestation(calendarKey, binary) {
    let existing = this.getAttestationsByKey(calendarKey);

    if (existing.getStatus() !== AttestationStatus.ATTESTATION_STATUS_PENDING) {
      throw new Error('Attestation has already been upgraded with timestamp data.');
    }

    const operations = Parser.parseServerResponse(binary);
    existing.setOperationsList(existing.getOperationsList().concat(operations));
    existing = Execution.processOperations(this.getDigestHash(), existing);
    return true;
  }

  /**
   * Utility method for UNIX timestamp in seconds.
   *
   * @return {number}
   * @private
   */
  static getNow_() {
    return Math.floor(Date.now() / 1000);
  }
}

module.exports = Timestamp;
