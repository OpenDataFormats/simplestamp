/**
 * @fileoverview Iterates over a list of operations and performs them on a source input.
 *
 * @author davidarvan
 * @license Unlicense https://unlicense.org
 */
import * as crypto from 'crypto';

import { Attestation } from '../models/simplestamp/v1/attestation';
import { Operation, OperationType } from '../models/simplestamp/v1/operation';
import { Parser } from './parser';

export class Execution {
  /**
   * Given a source hash and list of operations, iterate over them to derive
   * the calendar server key. Stops at the first attestation operation.
   */
  static deriveCalendarKey(hash: Buffer, operations: Operation[]): Buffer {
    let index = 0;
    let result = hash;
    let type = operations[index].type;

    while (type !== OperationType.OPERATION_TYPE_ATTESTATION) {
      const operation = operations[index];
      const value = Buffer.from(operation.value);

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

        default:
          break;
      }

      type = operations[index + 1]
        ? (operations[index + 1].type)
        : OperationType.OPERATION_TYPE_ATTESTATION;
      index += 1;
    }

    return result;
  }

  /**
   * Takes an initial input and an Attestation, runs all its operations, and
   * returns the mutated Attestation.
   */
  static processOperations(initial: Buffer, attestation: Attestation): Attestation {
    let result = initial;
    const att = { ...attestation };

    att.operations.forEach((op) => {
      const type = op.type;
      const value = Buffer.from(op.value);

      switch (type) {
        // Handle both OPERATION_TYPE_UNKNOWN (0, the proto default / OT wire byte) and
        // OPERATION_TYPE_ATTESTATION (1) so that ops deserialized from stored protos work too.
        case OperationType.OPERATION_TYPE_UNKNOWN:
        case OperationType.OPERATION_TYPE_ATTESTATION:
          att.status = op.status;
          att.calendarUrl = op.calendarUrl || att.calendarUrl;
          att.blockHeight = op.blockHeight || att.blockHeight;
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
          // If we're about to append only 4 bytes, we've built a transaction,
          // and the reversed double hash will be the transaction ID.
          if (value.length === 4) {
            const txId = Parser.reverse(Execution.sha256(Execution.sha256(result)));
            att.transactionId = Uint8Array.from(txId);
          }
          break;

        case OperationType.OPERATION_TYPE_PREPEND:
          // If concatenating with large data, we have the merkle root of the hashes
          if (value.length > 64) {
            att.timestampMerkleRoot = Uint8Array.from(result);
          }
          result = Buffer.concat([value, result]);
          break;

        default:
          throw new Error(`Unsupported operation type: ${type}`);
      }
    });

    // If a block height was set, we have the block merkle root data
    if (att.blockHeight) {
      att.blockMerkleRoot = Uint8Array.from(Parser.reverse(result));
    }

    return att;
  }

  /** SHA256 hash the input binary. */
  static sha256(input: Buffer): Buffer {
    return crypto.createHash('sha256').update(Buffer.from(input)).digest();
  }
}
