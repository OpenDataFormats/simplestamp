/* eslint no-bitwise: 0 */
/**
 * @fileoverview Parser for converting binary data from the calendar server
 * into the protocol buffer format.
 *
 * @author davidarvan
 * @license Unlicense https://unlicense.org
 */
const { AttestationStatus } = require('../models/simplestamp/v1/status_pb');
const { Operation, OperationType } = require('../models/simplestamp/v1/operation_pb');

const ATTESTATION_TAG_SIZE = 8;
const ATTESTATION_TAGS = {
  '06869a0d73d71b45': AttestationStatus.ATTESTATION_STATUS_LITECOIN,
  '0588960d73d71901': AttestationStatus.ATTESTATION_STATUS_BITCOIN,
  '83dfe30d2ef90c8e': AttestationStatus.ATTESTATION_STATUS_PENDING,
};

class Parser {
  /**
   * Extract the sequence of operations from binary data returned by a calendar server.
   *
   * @param {Buffer} binary The data to operate on.
   * @return {Array.<proto.simplestamp.v1.Operation>}
   */
  static parseServerResponse(binary) {
    const operations = [];
    let remainder = binary;
    let payload;
    let status;
    let value;

    while (remainder.length) {
      const type = remainder[0];
      remainder = remainder.slice(1);

      if (!Object.values(OperationType).includes(type)) {
        throw new Error(`Operation with type ${type} not supported.`);
      }

      const operation = new Operation();
      operation.setType(type);

      switch (type) {
        case OperationType.OPERATION_TYPE_SHA1:
        case OperationType.OPERATION_TYPE_RIPEMD160:
        case OperationType.OPERATION_TYPE_SHA256:
          break;
        case OperationType.OPERATION_TYPE_APPEND:
        case OperationType.OPERATION_TYPE_PREPEND:
          [value, remainder] = Parser.extractVariableBytes(remainder);
          break;
        case OperationType.OPERATION_TYPE_ATTESTATION:
          status = Parser.extractAttestationStatus(remainder);
          operation.setStatus(status);
          remainder = remainder.slice(ATTESTATION_TAG_SIZE);
          [payload, remainder] = Parser.extractVariableBytes(remainder);

          switch (status) {
            case AttestationStatus.ATTESTATION_STATUS_PENDING:
              operation.setCalendarUrl(
                Buffer.from(Parser.extractVariableBytes(payload)[0]).toString('ascii'),
              );
              break;
            case AttestationStatus.ATTESTATION_STATUS_BITCOIN:
            case AttestationStatus.ATTESTATION_STATUS_LITECOIN:
              operation.setBlockHeight(
                Parser.extractVariableInteger(payload)[0],
              );
              break;
          }
          break;
      }

      if (value) {
        operation.setValue(Uint8Array.from(value));
        value = undefined;
      }

      operations.push(operation);
    }

    return operations;
  }

  /**
   * Figure out the correct status flag from the binary tag.
   */
  static extractAttestationStatus(binary) {
    const tag = binary.slice(0, ATTESTATION_TAG_SIZE).toString('hex');
    return ATTESTATION_TAGS[tag] || AttestationStatus.ATTESTATION_STATUS_UNKNOWN;
  }

  /**
   * Reads the initial bytes as a variable length int that indicates how many more
   * bytes to read. Returns an array of the extracted part and the remainder bytes.
   *
   * @param  {Buffer} binary The bytes to read from
   * @return {Array.<Buffer,Buffer>}
   */
  static extractVariableBytes(binary) {
    const [size, remainder] = Parser.extractVariableInteger(binary);

    if (size > remainder.length) {
      throw new Error(
        `Varint expects ${size} bytes of data, only have ${remainder.length}.`,
      );
    }

    return [
      remainder.slice(0, size),
      remainder.slice(size),
    ];
  }

  /**
   * Reads in bytes as an unsigned variable length integer, where
   * the first bit indicates there are more bytes that make up the
   * value. Returns an array of the value and the remainder bytes.
   *
   * @param  {Buffer} binary The bytes to read from
   * @return {Array.<Number,Buffer>}
   */
  static extractVariableInteger(binary) {
    let byte;
    let varint = 0;
    let position = 0;

    do {
      byte = binary[position];
      varint |= (byte & 0b01111111) << (position * 7);
      position += 1;
    } while (byte & 0b10000000);

    return [
      varint,
      binary.slice(position),
    ];
  }

  /**
   * Reverse the bytes in a buffer.
   *
   * @param {Buffer} input
   * @return {Buffer}
   */
  static reverse(input) {
    const result = Buffer.alloc(input.length);
    for (let index = 0; index < input.length; index += 1) {
      result[index] = input[input.length - index - 1];
    }
    return result;
  }
}

module.exports = Parser;
