/**
 * @fileoverview Parser for converting binary data from the calendar server
 * into the protocol buffer format.
 *
 * @author davidarvan
 * @license Unlicense https://unlicense.org
 */
import { AttestationStatus } from '../models/simplestamp/v1/status';
import { Operation, OperationType } from '../models/simplestamp/v1/operation';

const ATTESTATION_TAG_SIZE = 8;

const ATTESTATION_TAGS: Record<string, AttestationStatus> = {
  '06869a0d73d71b45': AttestationStatus.ATTESTATION_STATUS_LITECOIN,
  '0588960d73d71901': AttestationStatus.ATTESTATION_STATUS_BITCOIN,
  '83dfe30d2ef90c8e': AttestationStatus.ATTESTATION_STATUS_PENDING,
};

export class Parser {
  /**
   * Extract the sequence of operations from binary data returned by a calendar server.
   */
  static parseServerResponse(binary: Buffer): Operation[] {
    const operations: Operation[] = [];
    let remainder = binary;
    let status: AttestationStatus;
    let value: Buffer | undefined;

    while (remainder.length) {
      const type = remainder[0] as OperationType;
      remainder = remainder.slice(1);

      const operation = Operation.create({ type });

      switch (type) {
        case OperationType.OPERATION_TYPE_SHA1:
        case OperationType.OPERATION_TYPE_RIPEMD160:
        case OperationType.OPERATION_TYPE_SHA256:
          break;

        case OperationType.OPERATION_TYPE_APPEND:
        case OperationType.OPERATION_TYPE_PREPEND:
          [value, remainder] = Parser.extractVariableBytes(remainder);
          break;

        // OpenTimestamps binary format uses 0x00 as the attestation wire byte.
        // The proto Operation type field is left at its default (0 = not serialized).
        case 0: {
          status = Parser.extractAttestationStatus(remainder);
          operation.status = status;
          remainder = remainder.slice(ATTESTATION_TAG_SIZE);

          let payload: Buffer;
          [payload, remainder] = Parser.extractVariableBytes(remainder);

          switch (status) {
            case AttestationStatus.ATTESTATION_STATUS_PENDING:
              operation.calendarUrl = Buffer.from(
                Parser.extractVariableBytes(payload)[0],
              ).toString('ascii');
              break;
            case AttestationStatus.ATTESTATION_STATUS_BITCOIN:
            case AttestationStatus.ATTESTATION_STATUS_LITECOIN:
              operation.blockHeight = Parser.extractVariableInteger(payload)[0];
              break;
            default:
              break;
          }
          break;
        }

        default:
          throw new Error(`Operation with type ${type} not supported.`);
      }

      if (value !== undefined) {
        operation.value = Uint8Array.from(value);
        value = undefined;
      }

      operations.push(operation);
    }

    return operations;
  }

  /** Figure out the correct status flag from the binary tag. */
  static extractAttestationStatus(binary: Buffer): AttestationStatus {
    const tag = binary.slice(0, ATTESTATION_TAG_SIZE).toString('hex');
    return ATTESTATION_TAGS[tag] ?? AttestationStatus.ATTESTATION_STATUS_UNKNOWN;
  }

  /**
   * Reads the initial bytes as a variable length int that indicates how many more
   * bytes to read. Returns [extracted, remainder].
   */
  static extractVariableBytes(binary: Buffer): [Buffer, Buffer] {
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
   * Reads bytes as an unsigned variable length integer.
   * Returns [value, remainder].
   */
  static extractVariableInteger(binary: Buffer): [number, Buffer] {
    let byte: number;
    let varint = 0;
    let position = 0;

    do {
      byte = binary[position];
      // eslint-disable-next-line no-bitwise
      varint |= (byte & 0b01111111) << (position * 7);
      position += 1;
      // eslint-disable-next-line no-bitwise
    } while (byte & 0b10000000);

    return [varint, binary.slice(position)];
  }

  /** Reverse the bytes in a buffer. */
  static reverse(input: Buffer): Buffer {
    const result = Buffer.alloc(input.length);
    for (let index = 0; index < input.length; index += 1) {
      result[index] = input[input.length - index - 1];
    }
    return result;
  }
}
