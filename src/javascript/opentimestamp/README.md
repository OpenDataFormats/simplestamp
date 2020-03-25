**_Note: Not ready for production use, still in beta and requires further testing._**

[![Build Status](https://travis-ci.com/OpenDataFormats/opentimestamp.svg?branch=master)](https://travis-ci.com/OpenDataFormats/opentimestamp)

# OpenTimestamp

ECMAScript/JS 6 Node library for creating compact, portable [Open Timestamps](https://en.wikipedia.org/wiki/OpenTimestamps) attestations.

* [OpenTimestamps](#opentimestamps)
* [Motivation](#motivation)
* [Implementation](#implementation)
* [Agnostic](#agnostic)
* [Data Model](#data-model)
  + [`opentimestamp.v1.Timestamp`](#-opentimestampv1timestamp-)
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

OpenTimestamp is agnostic to the storage of the Timestamp itself. Once generated, it can be stored in a file, database, etc by calling `Timestamp.toBinary()` and saving the `Buffer` data. The data can then be reloaded with `Timestamp.fromBinary(Buffer)`.

OpenTimestamp also does not dictate that the Timestamp be of a file, or what method the hash was generated from.

## Data Model

A `Timestamp` has the following fields, as defined in the protobuf.

### `opentimestamp.v1.Timestamp`

Defined in [timestamp.proto](src/protobuf/opentimestamp/v1/timestamp.proto)

```
message OpenTimestamp {
  // The binary hash of the data this timestamp is for.
  // Most likely the SHA256 of a file.
  bytes hash = 1;

  // The random data that is appended to the hash on creation.  This results in
  // stamping the same file multiple times and getting a unique stamp. The value
  // submitted to the server is then: SHA256(CONCAT(hash, nonce))
  bytes nonce = 2;

  // The attestations made
  repeated opentimestamp.v1.Attestation attestations = 3;

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
  opentimestamp.v1.Identity identity = 6;

  // Where the timestamp was created and it's trajectory if moving
  opentimestamp.v1.Location location = 7;

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

### Computing the hash

The hash that is sent to the calendar servers to be included is the combination of the following:

1. Hash of the source data
2. Nonce, random data to make timestamps of the same data unique
3. (_optional_) Source, the filename, URL, etc to the data
4. (_optional_) Identity, the company name, division, email address, etc of the person creating the timestamp

## Using

### Creating a new Timestamp

```javascript
const OpenTimestamp = require('opentimestamp');

// Compute the hash of the data

const timestamp = new OpenTimestamp(hash);
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
timestamp.stamp();
```

### Updating a Timestamp

After some time has passed, the calendar server will submit a transaction to the blockchain. The additional data for the attestation can be downloaded, parsed, and added to the Timestamp by running:

```javascript
timestamp.update();
```


## Testing

Run tests from the source root. This will also generate the JSDocs and lint the code.

```shell
./bin/run.tests.sh
```
