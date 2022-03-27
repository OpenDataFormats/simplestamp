/* eslint-env jest */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const Parser = require('./parser');

describe('Parser: Parsing the response to a digest server request', () => {
  test('.parseServerResponse of valid alice digest binary data', () => {
    const binDigest = fs.readFileSync(
      path.join(__dirname, '../../../tests/data/digest-01-request.bin'),
    );
    const operations = Parser.parseServerResponse(binDigest);

    expect(operations.length).toBe(5);

    expect(Buffer.from(operations[2].getValue()).toString('hex'))
      .toBe('5e6d10ee');

    expect(Buffer.from(operations[3].getValue()).toString('hex'))
      .toBe('21de054589a79bd4');

    expect(operations[4].getCalendarUrl())
      .toBe('https://bob.btc.calendar.opentimestamps.org');
  });

  test('.parseServerResponse of valid bob digest binary data', () => {
    const binDigest = fs.readFileSync(
      path.join(__dirname, '../../../tests/data/digest-02-request.bin'),
    );
    const operations = Parser.parseServerResponse(binDigest);

    expect(operations.length).toBe(5);

    expect(Buffer.from(operations[2].getValue()).toString('hex'))
      .toBe('5e67f3c2');

    expect(operations[4].getCalendarUrl())
      .toBe('https://bob.btc.calendar.opentimestamps.org');
  });

  test('.parseServerResponse of sha1 and ripemd160', () => {
    const binDigest = fs.readFileSync(
      path.join(__dirname, '../../../tests/data/digest-01-request.bin'),
    );

    expect(() => {
      const hexRequest = binDigest.toString('hex').replace('08', '02');
      Parser.parseServerResponse(Buffer.from(hexRequest, 'hex'));
    }).not.toThrow();

    expect(() => {
      const hexRequest = binDigest.toString('hex').replace('08', '03');
      Parser.parseServerResponse(Buffer.from(hexRequest, 'hex'));
    }).not.toThrow();
  });

  test('.parseServerResponse with an invalid operation type to be set unknown', () => {
    const binDigest = fs.readFileSync(
      path.join(__dirname, '../../../tests/data/digest-01-request.bin'),
    );
    const hexRequest = binDigest.toString('hex').replace('83dfe30d2ef90c8e', 'this is invalid!');

    const operations = Parser.parseServerResponse(Buffer.from(hexRequest, 'hex'));
    expect(operations[4].getStatus()).toBe(1);
  });

  test('.parseServerResponse with less data than expected', () => {
    const binDigest = fs.readFileSync(
      path.join(__dirname, '../../../tests/data/digest-01-request.bin'),
    );

    expect(() => {
      Parser.parseServerResponse(binDigest.slice(0, binDigest.length - 4));
    }).toThrow();
  });

  test('.parseServerResponse with random data throws an error', () => {
    const random = crypto.randomBytes(161);

    expect(() => {
      Parser.parseServerResponse(random);
    }).toThrow();
  });

  test('.reverse a buffer properly for txids', () => {
    const hash = Buffer.from('093febd0f49a812931239b920acabbab20c3511a49d44e79effba8d44ec2b102', 'hex');

    expect(Parser.reverse(hash).toString('hex'))
      .toBe('02b1c24ed4a8fbef794ed4491a51c320abbbca0a929b233129819af4d0eb3f09');
  });
});

describe('Parser: Parsing the response to a timestamp server request', () => {
  test('.parseServerResponse of valid alice timestamp binary data', () => {
    const binTimestamp = fs.readFileSync(
      path.join(__dirname, '../../../tests/data/digest-01-response.bin'),
    );
    const operations = Parser.parseServerResponse(binTimestamp);

    expect(operations.length).toBe(66);

    expect(Buffer.from(operations[25].getValue()).toString('hex'))
      .toBe('010000000145238927573033099b6c10c16a37657fdd891f2057e6a9e5c248c774c9b76c5d0000000000fdffffff02fe5b0500000000001600142a8d531f9f574785bd735fb3b8bddd5789a78e090000000000000000226a20');

    expect(Buffer.from(operations[26].getValue()).toString('hex'))
      .toBe('177a0900');
  });

  test('.parseServerResponse of valid bob timestamp binary data', () => {
    const binTimestamp = fs.readFileSync(
      path.join(__dirname, '../../../tests/data/digest-02-response.bin'),
    );
    const operations = Parser.parseServerResponse(binTimestamp);

    expect(operations.length).toBe(66);

    expect(operations[65].getBlockHeight()).toBe(621138);
  });

  test('.parseServerResponse with an invalid operation type', () => {
    const binDigest = fs.readFileSync(
      path.join(__dirname, '../../../tests/data/digest-01-response.bin'),
    );
    const hexRequest = binDigest.toString('hex').replace('0588960d73d71901', 'this is invalid!');

    expect(() => {
      Parser.parseServerResponse(Buffer.from(hexRequest));
    }).toThrow();
  });
});
