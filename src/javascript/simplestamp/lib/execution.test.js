/* eslint-env jest */
const fs = require('fs');
const path = require('path');

const { Attestation } = require('../models/simplestamp/v1/attestation_pb');
const { AttestationStatus } = require('../models/simplestamp/v1/status_pb');
const Execution = require('./execution');
const Parser = require('./parser');

const hash = Buffer.from('093febd0f49a812931239b920acabbab20c3511a49d44e79effba8d44ec2b102', 'hex');

const binDigest = fs.readFileSync(
  path.join(__dirname, '../../../tests/data/digest-01-request.bin'),
);
const binTimestamp = fs.readFileSync(
  path.join(__dirname, '../../../tests/data/digest-01-response.bin'),
);
const operations1 = Parser.parseServerResponse(binDigest);
const operations2 = Parser.parseServerResponse(binTimestamp);

const binDigestBob = fs.readFileSync(
  path.join(__dirname, '../../../tests/data/digest-02-request.bin'),
);
const operationsBob = Parser.parseServerResponse(binDigestBob);


describe('Execution: Execting operations on a valid digest request', () => {
  test('.processOperations of valid data extracts correct values', () => {
    const attestation = new Attestation();
    attestation.setOperationsList(operations1);
    const processed = Execution.processOperations(hash, attestation);

    expect(processed.getCalendarUrl()).toBe('https://bob.btc.calendar.opentimestamps.org');
    expect(processed.getStatus()).toBe(AttestationStatus.ATTESTATION_STATUS_PENDING);
    expect(processed.getBlockHeight()).toBe(0);
    expect(processed.getBlockMerkleRoot()).toBe('');
    expect(processed.getTransactionId()).toBe('');
    expect(processed.getTimestampMerkleRoot()).toBe('');

    expect(Buffer.from(processed.serializeBinary()).toString('hex'))
      .toBe('0a2b68747470733a2f2f626f622e6274632e63616c656e6461722e6f70656e74696d657374616d70732e6f72671a1508f0011210e62a7a71a637aca51700b5547dc1a56d1a0208081a0908f10112045e6d10ee1a0d08f001120821de054589a79bd41a2f1802222b68747470733a2f2f626f622e6274632e63616c656e6461722e6f70656e74696d657374616d70732e6f72672002');
  });


  test('.deriveCalendarKey of valid data produces correct value', () => {
    expect(Execution.deriveCalendarKey(hash, operations1).toString('hex'))
      .toBe('5e6d10ee8c8db23b3cf21796e1fcb74499d8d756653ab6134d4fcf92c6f0bb61f0a37f3d21de054589a79bd4');
  });


  test('.deriveCalendarKey of more valid data produces correct value', () => {
    expect(Execution.deriveCalendarKey(hash, operationsBob).toString('hex'))
      .toBe('5e67f3c2426f90c5f58d718639f1b5f90c7890ec42e6ee6ae224ad479a7a4af9a80090c36c72333bc750ad77');
  });


  test('.deriveCalendarKey without an attestation operation', () => {
    const operations = operations1.slice(0, operations1.length - 2);
    expect(Execution.deriveCalendarKey(hash, operations).toString('hex'))
      .toBe('5e6d10ee8c8db23b3cf21796e1fcb74499d8d756653ab6134d4fcf92c6f0bb61f0a37f3d');
  });
});


describe('Execution: Execting operations on a valid timestamp request', () => {
  test('.processOperations of valid data extracts correct values', () => {
    const attestation = new Attestation();
    attestation.setOperationsList(operations1.concat(operations2));
    const processed = Execution.processOperations(hash, attestation);

    expect(processed.getCalendarUrl()).toBe('https://bob.btc.calendar.opentimestamps.org');
    expect(processed.getStatus()).toBe(AttestationStatus.ATTESTATION_STATUS_BITCOIN);
    expect(processed.getBlockHeight()).toBe(621080);
    expect(Buffer.from(processed.getBlockMerkleRoot()).toString('hex'))
      .toBe('b2b93b85a0af4e8b58971ac9447c6906a2ed0105f8af60a58c74dacc9076a9d5');
    expect(Buffer.from(processed.getTransactionId()).toString('hex'))
      .toBe('226f1fd3b351c249324530bdf71df7954444c6bbd636c51ea2b1234b1447083e');
    expect(Buffer.from(processed.getTimestampMerkleRoot()).toString('hex'))
      .toBe('b2e8f8289604511a089390302bc2ffc409e959a833bd043974d3688d3ff785b9');

    expect(Buffer.from(processed.serializeBinary()).toString('hex'))
      .toBe('0a2b68747470733a2f2f626f622e6274632e63616c656e6461722e6f70656e74696d657374616d70732e6f72671a1508f0011210e62a7a71a637aca51700b5547dc1a56d1a0208081a0908f10112045e6d10ee1a0d08f001120821de054589a79bd41a2f1802222b68747470733a2f2f626f622e6274632e63616c656e6461722e6f70656e74696d657374616d70732e6f72671a0208081a2508f00112206c6abc875cbbcc70f56dde8a5faf714277c6ca45286627c21749737fd86252e41a0208081a2508f1011220743a0eabc7c0f3758ed9ddb96c4e8fb65548f0d291dcf8891f30b23e504a63dc1a0208081a2508f1011220e80e0f8df6e352d6bae3990e96391e7f66ac8672d8b3c031d0a3d4a4f20a8e4d1a0208081a2508f00112207c0d438eb5b0acccb47d5e24d4d9fb0f8d13ee05ffe21b89e21a662d68365b931a0208081a2508f0011220b4c975e9e91f8924517afbf58df5c94292cb81b711b1fde9a2f80909564292d81a0208081a2508f0011220a4cd6f978ceba3e623e226e5df29ad06e8dc5d299a82802acd1d69809ddbf3b11a0208081a2508f0011220ba039a1006e6d143737e5d1f74fa86f8d3a5f0478c5c8dcfa00ddb60b661f80b1a0208081a2508f001122043f3b3f625e7631e8d31017c5807db1ad40dcc4428283f8b45d8c3bdee764e881a0208081a2508f0011220a871ff17d012c02e2bca32bc5193267e58ed0b40b852b4571a1d8b554d3240951a0208081a2508f1011220097536d4f4788b415bcd489649b1fece70be3952f1648f3c0e5be2709f8657011a0208081a2508f0011220570cb265a8fa7a14206ded8e8ca3243cd7a2c530d07b8107b24e35ee2186515d1a0208081a2508f10112207a731a00b4644bc3b60f2ed42bee2f35b2ad0772bff0c3c879262fd911b6a09d1a0208081a5e08f1011259010000000145238927573033099b6c10c16a37657fdd891f2057e6a9e5c248c774c9b76c5d0000000000fdffffff02fe5b0500000000001600142a8d531f9f574785bd735fb3b8bddd5789a78e090000000000000000226a201a0908f0011204177a09001a0208081a0208081a2508f1011220ae8995f7764a68873ca1df99ad3ff0a70e03aa761ca19b622284c94d9cff533c1a0208081a0208081a2508f101122000f6395b86e7561ef0c4d49c8bb129a80ad37375cfa3fcd8f34e1a1311042f381a0208081a0208081a2508f00112209e10059deec069512618be4f664ef514ee8879e4380893083f09bd270572857c1a0208081a0208081a2508f101122014c608822f64052e9ee67b7d11d68d13371cb3cdbb184831a777ec961281149f1a0208081a0208081a2508f10112201eb82f5cabbda5c312ea0a8d18b2a5e58cd599507f4794558b844baabdf15e8e1a0208081a0208081a2508f10112209fdab4e3b2463639084fdf1f341637c36ad19adc0665e78076b31f71ee765c2a1a0208081a0208081a2508f1011220488e478bf5baa90a866770b784659f54b8e8c78b50fc547eab7db61ef02fc0511a0208081a0208081a2508f1011220a855152d534a87a09f75aa8d18c0d6b10edfe9e3b2d21d44738ddd519ab236ac1a0208081a0208081a2508f001122002f93b4cab2ad40260d550294d043cfe1c3c807a2216f71579f7119c0e2bec071a0208081a0208081a2508f0011220f9be105ba07a35cbc1de2f3c8bc84be94e35a23d5320fffbaedbb7e22eb2684b1a0208081a0208081a2508f101122041c13a2bb29c628c0becadd3a8b28a794a79b8f6179c2f2742f537436457c6271a0208081a0208081a2508f001122072b074fd59c32b45476ea3374a6255e50ab1f48417a77d1f92727d4793501a2a1a0208081a0208081a0618032898f42520032898f4253220b2b93b85a0af4e8b58971ac9447c6906a2ed0105f8af60a58c74dacc9076a9d53a20b2e8f8289604511a089390302bc2ffc409e959a833bd043974d3688d3ff785b94220226f1fd3b351c249324530bdf71df7954444c6bbd636c51ea2b1234b1447083e');
  });


  test('.processOperations of sha1 and ripemd160', () => {
    expect(() => {
      const hexRequest = binDigest.toString('hex').replace('08', '02');
      const operations = Parser.parseServerResponse(Buffer.from(hexRequest, 'hex'));
      Execution.deriveCalendarKey(hash, operations);
    }).not.toThrow();

    expect(() => {
      const hexRequest = binDigest.toString('hex').replace('08', '03');
      const operations = Parser.parseServerResponse(Buffer.from(hexRequest, 'hex'));
      Execution.deriveCalendarKey(hash, operations);
    }).not.toThrow();

    expect(() => {
      const hexRequest = binDigest.toString('hex').replace('08', '02');
      const operations = Parser.parseServerResponse(Buffer.from(hexRequest, 'hex'));
      const attestation = new Attestation();
      attestation.setOperationsList(operations);
      Execution.processOperations(hash, attestation);
    }).not.toThrow();

    expect(() => {
      const hexRequest = binDigest.toString('hex').replace('08', '03');
      const operations = Parser.parseServerResponse(Buffer.from(hexRequest, 'hex'));
      const attestation = new Attestation();
      attestation.setOperationsList(operations);
      Execution.processOperations(hash, attestation);
    }).not.toThrow();
  });


  test('.processOperations with an invalid operation type throws', () => {
    expect(() => {
      const attestation = new Attestation();
      const operations = Parser.parseServerResponse(binDigest);
      operations[0].setType(123);
      attestation.setOperationsList(operations);
      Execution.processOperations(hash, attestation);
    }).toThrow();
  });
});
