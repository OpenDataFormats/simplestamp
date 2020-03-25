/* eslint-env jest */
/**
 * @fileoverview Testing the Calendar class
 * @author davidarvan
 */
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

const requestMockReq = jest.fn(() => (new Promise(resolve => (resolve(binRequest)))));
const requestMockRes = jest.fn(() => (new Promise(resolve => (resolve(binResponse)))));

const requestMockBadData = jest.fn(() => (new Promise(resolve => (resolve(Buffer.alloc(100, 9))))));


describe('Calendar: Stamping a Timestamp without attestations', () => {
  test('.stamp handles binary data from the remote server correctly', async () => {
    const t = Timestamp.fromBinary(binTimestamp0);

    t.calendar_.request_ = requestMockReq;
    await t.stamp();

    expect(requestMockReq).toHaveBeenCalled();
  });


  test('.stamp handles invalid binary data from the remote server correctly', async () => {
    const t = Timestamp.fromBinary(binTimestamp0);

    t.calendar_.request_ = requestMockBadData;
    await t.stamp();

    expect(requestMockBadData).toHaveBeenCalled();
  });
});


describe('Calendar: Updating a Timestamp', () => {
  test('.update handles binary data from the remote server correctly', async () => {
    const t = Timestamp.fromBinary(binTimestamp1);

    t.calendar_.request_ = requestMockRes;
    const updated = await t.update();

    expect(requestMockRes).toHaveBeenCalled();
    expect(updated).toBe(true);
  });


  test('.update handles bad binary data from the remote server correctly', async () => {
    const t = Timestamp.fromBinary(binTimestamp1);

    t.calendar_.request_ = requestMockBadData;
    const updated = await t.update();

    expect(requestMockBadData).toHaveBeenCalled();
    expect(updated).toBe(false);
  });


  test('.update returns false when there are no pending attestations', async () => {
    const t = Timestamp.fromBinary(binTimestamp2);

    t.calendar_.request_ = requestMockRes;
    const updated = await t.update();

    expect(updated).toBe(false);
  });
});
