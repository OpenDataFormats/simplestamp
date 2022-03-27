/* eslint-env jest */
const fs = require('fs');
const path = require('path');

const Timestamp = require('./timestamp');

const binRequest = fs.readFileSync(
  path.join(__dirname, '../../../tests/data/digest-01-request.bin'),
);
const binResponse = fs.readFileSync(
  path.join(__dirname, '../../../tests/data/digest-01-response.bin'),
);
const binTimestamp0 = fs.readFileSync(path.join(__dirname, '../../../tests/data/timestamp00.bin'));
const binTimestamp1 = fs.readFileSync(path.join(__dirname, '../../../tests/data/timestamp01.bin'));
const binTimestamp2 = fs.readFileSync(path.join(__dirname, '../../../tests/data/timestamp02.bin'));

const calendarKey = Buffer.from('5e7505e786c61440e52ff8a9d903531ed45b433b055754e656b712b3aba7bae20e1aca765e87ee6d676f0a9d', 'hex');
const hash = '9e1c0ceaac7cab5b6245d2d6182fa33a85be438bc80b2951c141422336fe265a';
const nonce = 'bc5dec093f222720a748b76c85554819';

describe('Timestamp: Static methods produce deterministic results', () => {
  test('.getNow_ produces valid UNIX timestamps', () => {
    expect(Timestamp.getNow_()).toBeGreaterThan(1583944783);

    // not 10 years in the future
    expect(Timestamp.getNow_()).toBeLessThan(1899477670);
  });

  test('.getOperationTypeLabel produces correct labels', () => {
    expect(Timestamp.getOperationTypeLabel(8)).toBe('SHA256');

    expect(Timestamp.getOperationTypeLabel(8675309)).toBe('ATTESTATION');
  });

  test('.getAttestationStatusLabel produces correct labels', () => {
    expect(Timestamp.getAttestationStatusLabel(2)).toBe('PENDING');

    expect(Timestamp.getAttestationStatusLabel(3)).toBe('BITCOIN');

    expect(Timestamp.getAttestationStatusLabel(12345)).toBe('INVALID');
  });

  test('constructor produces an empty Timestamp', () => {
    const t = new Timestamp(Buffer.from(hash, 'hex'));
    t.setNonce(Buffer.from(nonce, 'hex'));

    expect(t.getDigestHash().toString('hex'))
      .toBe('0fc1e585713206a42054616b59ca8dea396f912dea758920b591a48bdae9300b');
  });

  test('constructor with no hash throws an Error', () => {
    expect(() => {
      // eslint-disable-next-line no-unused-vars
      const t = new Timestamp();
    }).toThrow();
  });

  test('constructor with the same hash produces different digests from random nonces', () => {
    const t1 = new Timestamp(Buffer.from(hash, 'hex'));
    const t2 = new Timestamp(Buffer.from(hash, 'hex'));

    expect(t1.getDigestHash().equals(t2.getDigestHash()))
      .toBe(false);
  });
});

describe('Timestamp: Binary serialization and deserialization work', () => {
  test('.fromBinary produces a valid Timestamp', () => {
    expect(() => {
      Timestamp.fromBinary(binTimestamp1);
    }).not.toThrow();

    const t = Timestamp.fromBinary(binTimestamp1);

    expect(Buffer.from(t.timestamp_.getHash()).toString('hex'))
      .toBe('54df0ea7227fdd5f1b3b7d88448fe23596de4270196d5d55fc32c595ad5e8bdd');

    expect(Buffer.from(t.timestamp_.getNonce()).toString('hex'))
      .toBe(nonce);

    expect(t.getDigestHash().toString('hex'))
      .toBe('0794e8540b0bacbec234c90a381dd0826d5cff3e27c07a1509daf03a710e165e');

    expect(t.hasPending())
      .toBe(true);

    const importedAgain = t.importDigestResponse(binRequest);
    expect(importedAgain)
      .toBe(false);

    expect(() => {
      t.getAttestationsByKey(calendarKey);
    }).not.toThrow();

    expect(() => {
      t.getAttestationsByKey(Buffer.from('I am not a valid calendar key'));
    }).toThrow();

    const json = t.toJSON();
    expect(json.hash).toBe('54df0ea7227fdd5f1b3b7d88448fe23596de4270196d5d55fc32c595ad5e8bdd');

    expect(() => {
      Timestamp.fromBinary(Buffer.alloc(128, 9));
    }).toThrow();
  });

  test('.toBinary serializes correctly', () => {
    expect(() => {
      const t = Timestamp.fromBinary(binTimestamp1);
      const b = t.toBinary();

      expect(binTimestamp1.equals(b));
    }).not.toThrow();
  });

  test('.toString serializes correctly', () => {
    const t = new Timestamp(Buffer.alloc(32));
    expect(t.toString()).toMatch(/^SimpleStamp: {/);
  });
});

describe('Timestamp: Setting rich details are included in the digest hash', () => {
  test('source value produces a valid digest', () => {
    const t = Timestamp.fromBinary(binTimestamp1);
    t.setSource('This should change the digest hash');
    expect(t.getDigestHash().toString('hex'))
      .toBe('252f7c88e82afdf3c368a783fcb36d7990fc00f4e8b190ca4a44ac47968aae20');
  });

  test('Adding identity information produces a valid digest', () => {
    const t = Timestamp.fromBinary(binTimestamp0);

    t.setIdentity(
      'US',
      'NY',
      'New York',
      'Rays Pizza',
      'Engineering',
      undefined,
      'rayspizza@example.com',
      'Famous Rays',
    );
    expect(t.getDigestHash().toString('hex'))
      .toBe('4bc307193a5180f740e73cf0cd593bd8a3b0f61b20419ef180664556c8fd1c37');

    const json = t.toJSON();
    expect(json.identity.section).toBe('Engineering');
  });

  test('Adding identity after stamping throws an error', () => {
    expect(() => {
      const t = Timestamp.fromBinary(binTimestamp1);
      t.setIdentity(
        'This should throw',
      );
    }).toThrow();
  });
});

describe('Timestamp: Adding attestation binary data', () => {
  const upgradeKey = Buffer.from('5e7505e786c61440e52ff8a9d903531ed45b433b055754e656b712b3aba7bae20e1aca765e87ee6d676f0a9d', 'hex');

  test('Adding digest data works', () => {
    const t = new Timestamp(Buffer.from(hash, 'hex'));
    t.setNonce(Buffer.from(nonce, 'hex'));

    const imported = t.importDigestResponse(binRequest);
    expect(imported).toBe(true);
  });

  test('Upgrading works', () => {
    expect(() => {
      const t = Timestamp.fromBinary(binTimestamp1);
      t.upgradeAttestation(
        upgradeKey,
        binResponse,
      );
    }).not.toThrow();
  });

  test('Upgrading again throws', () => {
    expect(() => {
      const t = Timestamp.fromBinary(binTimestamp2);
      t.upgradeAttestation(upgradeKey, binResponse);
      t.upgradeAttestation(upgradeKey, binResponse);
    }).toThrow();
  });
});

describe('Timestamp: Empty, unstamped, state changes with pending attestation', () => {
  test('State moves from false to true', () => {
    const t = Timestamp.fromBinary(binTimestamp0);

    expect(t.hasPending()).toBe(false);
    expect(t.isStamped()).toBe(false);

    expect(t.importDigestResponse(binRequest)).toBe(true);

    expect(t.hasPending()).toBe(true);
    expect(t.isStamped()).toBe(true);
  });
});

describe('Timestamp: Location data is set correctly', () => {
  test('Wrapper method sets underlying values.', () => {
    const t = new Timestamp(Buffer.alloc(32, 7));
    t.setLocation(
      180 - Math.random() * 180,
      180 - Math.random() * 180,
      Math.random() * 10000,
      Math.random(),
      Math.random() * 360,
      Math.random() * 100,
    );
    const l = t.timestamp_.getLocation();

    expect(typeof l.getLatitude()).toBe('number');
    expect(typeof l.getLongitude()).toBe('number');
    expect(typeof l.getAltitude()).toBe('number');
    expect(typeof l.getAccuracyMeters()).toBe('number');
    expect(typeof l.getDirection()).toBe('number');
    expect(typeof l.getVelocity()).toBe('number');
  });

  test('Setting location after stamping throws an error', () => {
    expect(() => {
      const t = Timestamp.fromBinary(binTimestamp1);
      t.setLocation(
        3.14159,
      );
    }).toThrow();
  });

  test('Setting location information produces a valid digest', () => {
    const t = Timestamp.fromBinary(binTimestamp0);
    t.setLocation(
      3.14159,
      3.14159,
    );
    expect(t.getDigestHash().toString('hex'))
      .toBe('32635c36c77540d5c0a233e821af91f9322014bf6ce1497921edb18982e81f09');

    const json = t.toJSON();
    expect(json.location.latitude).toBe(3.14159);
    expect(json.location.altitude).toBe(0);
  });
});
