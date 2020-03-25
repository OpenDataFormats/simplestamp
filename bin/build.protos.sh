#!/bin/bash
source $(dirname ${0})/base.sh


MODELS_OUT="${SRC_JS_OPENTIMESTAMP}/models/"

info "Cleaning existing generated files"
find ${MODELS_OUT} -type f -name '*_pb.js' -exec rm {} +


info "Generating CommonJS compatible Protocol Buffer messages"
${CLOSURE_PROTOC} \
  --js_out=import_style=commonjs,binary:${MODELS_OUT} \
  --proto_path=${SRC_PROTOBUF_DIR} \
  $(find ${SRC_PROTOBUF_DIR} -iname '*.proto' -type f -print0 | xargs -0 echo)
