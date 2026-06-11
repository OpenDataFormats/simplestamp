#!/bin/sh

#
# Base configuration variables for scripts
#

info() {
  echo "${SimpleStamp} :: ${1}"
}


BIN_DIR="$(dirname ${0})"
ROOT_DIR="${BIN_DIR}/.."


#
# Source code root folders
#
SRC_TS_DIR="${ROOT_DIR}/src/typescript"
SRC_TS_SIMPLESTAMP="${SRC_TS_DIR}/simplestamp"
