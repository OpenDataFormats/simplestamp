// source: opentimestamp/v1/attestation.proto
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var opentimestamp_v1_operation_pb = require('../../opentimestamp/v1/operation_pb.js');
goog.object.extend(proto, opentimestamp_v1_operation_pb);
var opentimestamp_v1_status_pb = require('../../opentimestamp/v1/status_pb.js');
goog.object.extend(proto, opentimestamp_v1_status_pb);
goog.exportSymbol('proto.opentimestamp.v1.Attestation', null, global);
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.opentimestamp.v1.Attestation = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.opentimestamp.v1.Attestation.repeatedFields_, null);
};
goog.inherits(proto.opentimestamp.v1.Attestation, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.opentimestamp.v1.Attestation.displayName = 'proto.opentimestamp.v1.Attestation';
}

/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.opentimestamp.v1.Attestation.repeatedFields_ = [3];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.opentimestamp.v1.Attestation.prototype.toObject = function(opt_includeInstance) {
  return proto.opentimestamp.v1.Attestation.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.opentimestamp.v1.Attestation} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.opentimestamp.v1.Attestation.toObject = function(includeInstance, msg) {
  var f, obj = {
    calendarUrl: jspb.Message.getFieldWithDefault(msg, 1, ""),
    submitted: jspb.Message.getFieldWithDefault(msg, 2, 0),
    operationsList: jspb.Message.toObjectList(msg.getOperationsList(),
    opentimestamp_v1_operation_pb.Operation.toObject, includeInstance),
    status: jspb.Message.getFieldWithDefault(msg, 4, 0),
    blockHeight: jspb.Message.getFieldWithDefault(msg, 5, 0),
    blockMerkleRoot: msg.getBlockMerkleRoot_asB64(),
    timestampMerkleRoot: msg.getTimestampMerkleRoot_asB64(),
    transactionId: msg.getTransactionId_asB64()
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.opentimestamp.v1.Attestation}
 */
proto.opentimestamp.v1.Attestation.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.opentimestamp.v1.Attestation;
  return proto.opentimestamp.v1.Attestation.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.opentimestamp.v1.Attestation} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.opentimestamp.v1.Attestation}
 */
proto.opentimestamp.v1.Attestation.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setCalendarUrl(value);
      break;
    case 2:
      var value = /** @type {number} */ (reader.readUint32());
      msg.setSubmitted(value);
      break;
    case 3:
      var value = new opentimestamp_v1_operation_pb.Operation;
      reader.readMessage(value,opentimestamp_v1_operation_pb.Operation.deserializeBinaryFromReader);
      msg.addOperations(value);
      break;
    case 4:
      var value = /** @type {!proto.opentimestamp.v1.AttestationStatus} */ (reader.readEnum());
      msg.setStatus(value);
      break;
    case 5:
      var value = /** @type {number} */ (reader.readUint32());
      msg.setBlockHeight(value);
      break;
    case 6:
      var value = /** @type {!Uint8Array} */ (reader.readBytes());
      msg.setBlockMerkleRoot(value);
      break;
    case 7:
      var value = /** @type {!Uint8Array} */ (reader.readBytes());
      msg.setTimestampMerkleRoot(value);
      break;
    case 8:
      var value = /** @type {!Uint8Array} */ (reader.readBytes());
      msg.setTransactionId(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.opentimestamp.v1.Attestation.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.opentimestamp.v1.Attestation.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.opentimestamp.v1.Attestation} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.opentimestamp.v1.Attestation.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getCalendarUrl();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getSubmitted();
  if (f !== 0) {
    writer.writeUint32(
      2,
      f
    );
  }
  f = message.getOperationsList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      3,
      f,
      opentimestamp_v1_operation_pb.Operation.serializeBinaryToWriter
    );
  }
  f = message.getStatus();
  if (f !== 0.0) {
    writer.writeEnum(
      4,
      f
    );
  }
  f = message.getBlockHeight();
  if (f !== 0) {
    writer.writeUint32(
      5,
      f
    );
  }
  f = message.getBlockMerkleRoot_asU8();
  if (f.length > 0) {
    writer.writeBytes(
      6,
      f
    );
  }
  f = message.getTimestampMerkleRoot_asU8();
  if (f.length > 0) {
    writer.writeBytes(
      7,
      f
    );
  }
  f = message.getTransactionId_asU8();
  if (f.length > 0) {
    writer.writeBytes(
      8,
      f
    );
  }
};


/**
 * optional string calendar_url = 1;
 * @return {string}
 */
proto.opentimestamp.v1.Attestation.prototype.getCalendarUrl = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.opentimestamp.v1.Attestation.prototype.setCalendarUrl = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional uint32 submitted = 2;
 * @return {number}
 */
proto.opentimestamp.v1.Attestation.prototype.getSubmitted = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 2, 0));
};


/** @param {number} value */
proto.opentimestamp.v1.Attestation.prototype.setSubmitted = function(value) {
  jspb.Message.setProto3IntField(this, 2, value);
};


/**
 * repeated Operation operations = 3;
 * @return {!Array<!proto.opentimestamp.v1.Operation>}
 */
proto.opentimestamp.v1.Attestation.prototype.getOperationsList = function() {
  return /** @type{!Array<!proto.opentimestamp.v1.Operation>} */ (
    jspb.Message.getRepeatedWrapperField(this, opentimestamp_v1_operation_pb.Operation, 3));
};


/** @param {!Array<!proto.opentimestamp.v1.Operation>} value */
proto.opentimestamp.v1.Attestation.prototype.setOperationsList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 3, value);
};


/**
 * @param {!proto.opentimestamp.v1.Operation=} opt_value
 * @param {number=} opt_index
 * @return {!proto.opentimestamp.v1.Operation}
 */
proto.opentimestamp.v1.Attestation.prototype.addOperations = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 3, opt_value, proto.opentimestamp.v1.Operation, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 */
proto.opentimestamp.v1.Attestation.prototype.clearOperationsList = function() {
  this.setOperationsList([]);
};


/**
 * optional AttestationStatus status = 4;
 * @return {!proto.opentimestamp.v1.AttestationStatus}
 */
proto.opentimestamp.v1.Attestation.prototype.getStatus = function() {
  return /** @type {!proto.opentimestamp.v1.AttestationStatus} */ (jspb.Message.getFieldWithDefault(this, 4, 0));
};


/** @param {!proto.opentimestamp.v1.AttestationStatus} value */
proto.opentimestamp.v1.Attestation.prototype.setStatus = function(value) {
  jspb.Message.setProto3EnumField(this, 4, value);
};


/**
 * optional uint32 block_height = 5;
 * @return {number}
 */
proto.opentimestamp.v1.Attestation.prototype.getBlockHeight = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 5, 0));
};


/** @param {number} value */
proto.opentimestamp.v1.Attestation.prototype.setBlockHeight = function(value) {
  jspb.Message.setProto3IntField(this, 5, value);
};


/**
 * optional bytes block_merkle_root = 6;
 * @return {!(string|Uint8Array)}
 */
proto.opentimestamp.v1.Attestation.prototype.getBlockMerkleRoot = function() {
  return /** @type {!(string|Uint8Array)} */ (jspb.Message.getFieldWithDefault(this, 6, ""));
};


/**
 * optional bytes block_merkle_root = 6;
 * This is a type-conversion wrapper around `getBlockMerkleRoot()`
 * @return {string}
 */
proto.opentimestamp.v1.Attestation.prototype.getBlockMerkleRoot_asB64 = function() {
  return /** @type {string} */ (jspb.Message.bytesAsB64(
      this.getBlockMerkleRoot()));
};


/**
 * optional bytes block_merkle_root = 6;
 * Note that Uint8Array is not supported on all browsers.
 * @see http://caniuse.com/Uint8Array
 * This is a type-conversion wrapper around `getBlockMerkleRoot()`
 * @return {!Uint8Array}
 */
proto.opentimestamp.v1.Attestation.prototype.getBlockMerkleRoot_asU8 = function() {
  return /** @type {!Uint8Array} */ (jspb.Message.bytesAsU8(
      this.getBlockMerkleRoot()));
};


/** @param {!(string|Uint8Array)} value */
proto.opentimestamp.v1.Attestation.prototype.setBlockMerkleRoot = function(value) {
  jspb.Message.setProto3BytesField(this, 6, value);
};


/**
 * optional bytes timestamp_merkle_root = 7;
 * @return {!(string|Uint8Array)}
 */
proto.opentimestamp.v1.Attestation.prototype.getTimestampMerkleRoot = function() {
  return /** @type {!(string|Uint8Array)} */ (jspb.Message.getFieldWithDefault(this, 7, ""));
};


/**
 * optional bytes timestamp_merkle_root = 7;
 * This is a type-conversion wrapper around `getTimestampMerkleRoot()`
 * @return {string}
 */
proto.opentimestamp.v1.Attestation.prototype.getTimestampMerkleRoot_asB64 = function() {
  return /** @type {string} */ (jspb.Message.bytesAsB64(
      this.getTimestampMerkleRoot()));
};


/**
 * optional bytes timestamp_merkle_root = 7;
 * Note that Uint8Array is not supported on all browsers.
 * @see http://caniuse.com/Uint8Array
 * This is a type-conversion wrapper around `getTimestampMerkleRoot()`
 * @return {!Uint8Array}
 */
proto.opentimestamp.v1.Attestation.prototype.getTimestampMerkleRoot_asU8 = function() {
  return /** @type {!Uint8Array} */ (jspb.Message.bytesAsU8(
      this.getTimestampMerkleRoot()));
};


/** @param {!(string|Uint8Array)} value */
proto.opentimestamp.v1.Attestation.prototype.setTimestampMerkleRoot = function(value) {
  jspb.Message.setProto3BytesField(this, 7, value);
};


/**
 * optional bytes transaction_id = 8;
 * @return {!(string|Uint8Array)}
 */
proto.opentimestamp.v1.Attestation.prototype.getTransactionId = function() {
  return /** @type {!(string|Uint8Array)} */ (jspb.Message.getFieldWithDefault(this, 8, ""));
};


/**
 * optional bytes transaction_id = 8;
 * This is a type-conversion wrapper around `getTransactionId()`
 * @return {string}
 */
proto.opentimestamp.v1.Attestation.prototype.getTransactionId_asB64 = function() {
  return /** @type {string} */ (jspb.Message.bytesAsB64(
      this.getTransactionId()));
};


/**
 * optional bytes transaction_id = 8;
 * Note that Uint8Array is not supported on all browsers.
 * @see http://caniuse.com/Uint8Array
 * This is a type-conversion wrapper around `getTransactionId()`
 * @return {!Uint8Array}
 */
proto.opentimestamp.v1.Attestation.prototype.getTransactionId_asU8 = function() {
  return /** @type {!Uint8Array} */ (jspb.Message.bytesAsU8(
      this.getTransactionId()));
};


/** @param {!(string|Uint8Array)} value */
proto.opentimestamp.v1.Attestation.prototype.setTransactionId = function(value) {
  jspb.Message.setProto3BytesField(this, 8, value);
};


goog.object.extend(exports, proto.opentimestamp.v1);
