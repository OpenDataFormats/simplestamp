**_Note: Not ready for production use, still in beta and requires further testing._**

[![Build Status](https://travis-ci.com/OpenDataFormats/simplestamp.svg?branch=master)](https://travis-ci.com/OpenDataFormats/simplestamp)

[![Coverage Status](https://coveralls.io/repos/github/OpenDataFormats/simplestamp/badge.svg?branch=master)](https://coveralls.io/github/OpenDataFormats/simplestamp?branch=master)


# SimpleStamp

ECMAScript/JS 6 Node library for creating compact, portable [Open Timestamps](https://en.wikipedia.org/wiki/OpenTimestamps) attestations.

* [OpenTimestamps](#opentimestamps)
* [Motivation](#motivation)
* [Implementation](#implementation)
* [Agnostic](#agnostic)
* [Data Model](#data-model)
  + [`simplestamp.v1.Timestamp`](#-simplestampv1timestamp-)
  + [`simplestamp.v1.Attestation`](#-simplestampv1attestation-)
  + [`simplestamp.v1.Identity`](#-simplestampv1identity-)
  + [`simplestamp.v1.Location`](#-simplestampv1location-)
  + [Computing the hash](#computing-the-hash)
* [Using](#using)
  + [Creating a new Timestamp](#creating-a-new-timestamp)
  + [Updating a Timestamp](#updating-a-timestamp)
* [Testing](#testing)

## OpenTimestamps

Peter Todd has an excellent and thorough description of the benefits and implementation in his blog post [OpenTimestamps: Scalable, Trust-Minimized, Distributed Timestamping with Bitcoin](https://petertodd.org/2016/opentimestamps-announcement). Along with the [OpenTimestamps website](https://opentimestamps.org/) provide the best background information.

## Motivation

Blockchain technology offers a multitude of benefits, the most appealing being the **immutable proof at a point in time**. The primary use being cryptocurrency ownership, the second being the state machine offered by smart contracts.

Most companies and projects find immutable proof to be the most appealing aspect, and aren't as interested in the currency or contract components.

## Implementation

This implementation is client only, using a highly extensible and portable data model. The underlying data is stored in a series of [Protocol Buffers](https://developers.google.com/protocol-buffers), which allow for the structure and binary format to be extended easily.

Protocol Buffers are also language agnostic, with the ability to auto generate code to read, write, and manipulate the data models in most of the top tier programming languages; **Javascript, Java, Python, Objective-C, C++, Dart, Go, Ruby, and C#**. This means the timestamp binary data will be able to be handled as widely as possible.

## Agnostic

SimpleStamp is agnostic to the storage of the Timestamp itself. Once generated, it can be stored in a file, database, etc by calling `Timestamp.toBinary()` and saving the `Buffer` data. The data can then be reloaded with `Timestamp.fromBinary(Buffer)`.

SimpleStamp also does not dictate that the Timestamp be of a file, or what method the hash was generated from.

## Data Model

A `Timestamp` has the following fields, as defined in the protobuf.

### `simplestamp.v1.Timestamp`

Defined in [timestamp.proto](src/protobuf/simplestamp/v1/timestamp.proto)

```
message SimpleStamp {
  // The binary hash of the data this timestamp is for.
  // Most likely the SHA256 of a file.
  bytes hash = 1;

  // The random data that is appended to the hash on creation.  This results in
  // stamping the same file multiple times and getting a unique stamp. The value
  // submitted to the server is then: SHA256(CONCAT(hash, nonce))
  bytes nonce = 2;

  // The attestations made
  repeated simplestamp.v1.Attestation attestations = 3;

  // The UNIX timestamp of when this was originally created
  uint32 created = 4;

  // OPTIONALS - The following fields are optional
  //
  // If these fields are set, they will be included when computing the digest hash, ie
  // digestHash = SHA256(CONCAT(hash, nonce, source, identity))

  // URL, file name, or general description for where the data
  // used to generate the hash came from.
  string source = 5;

  // Identity of the organization and/or person stamping
  simplestamp.v1.Identity identity = 6;

  // Where the timestamp was created and it's trajectory if moving
  simplestamp.v1.Location location = 7;

  // Assorted free form details for the creator to describe the purpose or intent
  string description = 8;

  // Cryptographic signature of the hash sent to digest. This lets the person making
  // the Timestamp use a private key to sign, so others can validate with their
  // public key.
  bytes signature = 9;

  // Unique identifier for the key used to sign. Open ended, to help identity which key was
  // used. Should not contain anything from the key itself.
  string key_id = 10;
}
```

The structure of the components of a Timestamp are in the following protobuf definitions:

### `simplestamp.v1.Attestation`

Defined in [attestation.proto](src/protobuf/simplestamp/v1/attestation.proto)

An Attestation is created for each calendar server the hash is sent to. It will contain the details of the server, including the operations the server reported to be performed on the hash to derive the proof.

### `simplestamp.v1.Identity`

Defined in [indentity.proto](src/protobuf/simplestamp/v1/identity.proto)

(optional) Identity of the person who created and submitted the Timestamp. The fields mimic those in an SSL certificate; country code, state/province, city, organization, section/division, common name, email address, and full name.

This can be set during creation by calling `.setIdentity()`.

```javascript
timestamp.setIdentity(
  'US',               // Country Code
  'NY',               // State/Province
  'New York',         // City
  'My Company',       // Organization
  'Engineering',      // Section/Division
  'Corp Eng',         // Common Name
  'eng@example.com',  // Email Address
  'John Smith',       // Full Name
);
```

Identity information needs to be set before `.stamp()` is called as the idenity information is used to compute the digest hash sent to the calendar servers.

### `simplestamp.v1.Location`

Defined in [location.proto](src/protobuf/simplestamp/v1/location.proto)

(optional) The location of where the Timestamp was created, in latitude and longitude, with additional fields for altitude and trajectory.

This can be set during creation by calling `.setLocation()`.

```javascript
timestamp.setLocation(
  40.73111,   // Latitude
  -73.99689,  // Longitude
  120,        // Altitude, meters
  10,         // Accuracy, meters
  217.39,     // Direction, degrees
  42,         // Velocity
);
```

### Computing the hash

The hash that is sent to the calendar servers to be included is the combination of the following:

1. Hash of the source data
2. Nonce, random data to make timestamps of the same data unique
3. (_optional_) Source, the filename, URL, etc to the data
4. (_optional_) Identity, the company name, division, email address, etc of the person creating the timestamp
5. (_optional_) Location, the GPS and trajectory of the Timestamp.

Those values are concatenated in binary, in that order, and then run through SHA256 twice, to generate the hash sent to the calendar servers.

## Using

### Creating a new Timestamp

```javascript
const SimpleStamp = require('simplestamp');

// Compute the hash of the data

const timestamp = new SimpleStamp(hash);

// The following fields are optional
timestamp.setSource('Filename, URL, etc');
timestamp.setIdentity(
  'US',
  'NY',
  'New York',
  undefined,
  undefined,
  undefined,
  'me@example.com',
  'John Smith',
);
timestamp.setLocation(
  40.73111,
  -73.99689,
);

// Sends the digested hash to the calendar server for attestation
timestamp.stamp();
```

### Updating a Timestamp

After some time has passed, the calendar server will submit a transaction to the blockchain. The additional data for the attestation will be downloaded, parsed, and added to the Timestamp by running:

```javascript
timestamp.update();
```

### Saving a Timestamp

Serialize the internal Timestamp protocol buffer to portable binary and save the data to a storage layer of choice; filesystem, database, etc.

```javascript
const /** @type {Buffer} */ data = timestamp.toBinary();
fs.writeFileSync('./myfile.timestamp', data);
```

### Loading a Timestamp

Loading the binary representation into the wrapped `SimpleStamp` class is done by the static `.fromBinary` class method.

```javascript
const SimpleStamp = require('simplestamp');

const data = fs.readFileSync('./myfile.timestamp');
const timestamp = SimpleStamp.fromBinary(data);
```

## Testing

Run tests from the source root. This will also generate the JSDocs and lint the code.

```shell
./bin/run.tests.sh
```
