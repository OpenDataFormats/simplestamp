#!/bin/bash
source $(dirname ${0})/base.sh

info "Running all tests"


info "Checking code lint"

cd $SRC_JS_OPENTIMESTAMP
npm run lint


info "Running JS tests"

npm run test


info "Generating code docs"

npm run docs
