/**
 * @fileoverview Iterates over a list of operations and performs them on a
 * source input.
 *
 * @author davidarvan
 * @license Unlicense https://unlicense.org
 */
const crypto = require('crypto');

const { OperationType } = require('../models/simplestamp/v1/operation_pb');
const Parser = require('./parser');

class Execution {
  /**
   * Given a source hash and list of operations, iterate over the operations to derive
   * the key to the calendar server to query for the status. Stops processing when
   * it finds the first OPERATION_TYPE_ATTESTATION.
   *
   * @param {Buffer} hash
   * @param {Array.<proto.simplestamp.v1.Operation>} operations
   * @return {Buffer}
   */
  static deriveCalendarKey(hash, operations) {
    let index = 0;
    let result = hash;
    let type = operations[index].getType();

    while (type !== OperationType.OPERATION_TYPE_ATTESTATION) {
      const operation = operations[index];
      const value = Buffer.from(operation.getValue());

      switch (type) {
        case OperationType.OPERATION_TYPE_SHA1:
          result = crypto.createHash('sha1').update(result).digest();
          break;

        case OperationType.OPERATION_TYPE_RIPEMD160:
          result = crypto.createHash('ripemd160').update(result).digest();
          break;

        case OperationType.OPERATION_TYPE_SHA256:
          result = Execution.sha256(result);
          break;

        case OperationType.OPERATION_TYPE_APPEND:
          result = Buffer.concat([result, value]);
          break;

        case OperationType.OPERATION_TYPE_PREPEND:
          result = Buffer.concat([value, result]);
          break;
      }

      type = operations[index + 1]
        ? operations[index + 1].getType() : OperationType.OPERATION_TYPE_ATTESTATION;
      index += 1;
    }

    return result;
  }

  /**
   * Takes an initial input and list of Operations and preforms, returning the result.
   *
   * @param {Buffer} initial
   * @param {proto.simplestamp.v1.Attestation} attestation
   * @return {Buffer}
   */
  static processOperations(initial, attestation) {
    let result = initial;

    attestation.getOperationsList().forEach((op) => {
      const type = op.getType();
      const value = Buffer.from(op.getValue());

      switch (type) {
        case OperationType.OPERATION_TYPE_ATTESTATION:
          attestation.setStatus(op.getStatus());

          // Override these properties only if they are set
          attestation.setCalendarUrl(op.getCalendarUrl() || attestation.getCalendarUrl());
          attestation.setBlockHeight(op.getBlockHeight() || attestation.getBlockHeight());
          break;

        case OperationType.OPERATION_TYPE_SHA1:
          result = crypto.createHash('sha1').update(result).digest();
          break;

        case OperationType.OPERATION_TYPE_RIPEMD160:
          result = crypto.createHash('ripemd160').update(result).digest();
          break;

        case OperationType.OPERATION_TYPE_SHA256:
          result = Execution.sha256(result);
          break;

        case OperationType.OPERATION_TYPE_APPEND:
          result = Buffer.concat([result, value]);

          // If we're about to append only 4 bytes, we've built a transaction, and
          // the reversed double hash will be the transaction ID.
          if (value.length === 4) {
            const txId = Parser.reverse(Execution.sha256(Execution.sha256(result)));
            attestation.setTransactionId(Uint8Array.from(txId));
          }
          break;

        case OperationType.OPERATION_TYPE_PREPEND:
          // If we're about to concatenate with a large amount of data, we have
          // the merkle root of the hashes submitted in the transaction on chain
          if (value.length > 64) {
            attestation.setTimestampMerkleRoot(Uint8Array.from(result));
          }

          result = Buffer.concat([value, result]);
          break;

        default:
          throw new Error(`Cannot handle an operation of type ${type}`);
      }
    });

    // If a block height was set, we have the merkle root data for the transation
    // to block as well, and the reversed result is our on chain block merkle root
    if (attestation.getBlockHeight()) {
      attestation.setBlockMerkleRoot(Uint8Array.from(Parser.reverse(result)));
    }

    return attestation;
  }

  /**
   * SHA256 hash the input binary
   *
   * @param {Buffer} input The data to hash
   * @return {Buffer}
   */
  static sha256(input) {
    return crypto.createHash('sha256').update(Buffer.from(input)).digest();
  }
}

module.exports = Execution;
