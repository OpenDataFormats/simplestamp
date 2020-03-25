#!/bin/sh

#
# Base configuration variables for scripts
#

info() {
  echo "${OpenTimestamp} :: ${1}"
}


BIN_DIR="$(dirname ${0})"
ROOT_DIR="${BIN_DIR}/.."


#
# Source code root folders
#
SRC_JS_DIR="${ROOT_DIR}/src/javascript"
SRC_JS_OPENTIMESTAMP="${SRC_JS_DIR}/opentimestamp"
SRC_PROTOBUF_DIR="${ROOT_DIR}/src/protobuf"


#
# Closure Library
#
CLOSURE_PROTOC="${ROOT_DIR}/lib/closure/binaries/protoc"
