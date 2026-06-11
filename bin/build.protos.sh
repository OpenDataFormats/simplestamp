#!/bin/bash
source $(dirname ${0})/base.sh


MODELS_OUT="${SRC_JS_SIMPLESTAMP}/models/"

info "Cleaning existing generated files"
find ${MODELS_OUT} -type f -name '*_pb.js' -exec rm {} +


info "Generating CommonJS compatible Protocol Buffer messages"
cd ${SRC_JS_SIMPLESTAMP}
npm run proto:gen
