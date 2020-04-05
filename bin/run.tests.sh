#!/bin/bash
source $(dirname ${0})/base.sh

info "Running all tests"

cd $SRC_JS_OPENTIMESTAMP

info "Checking code lint"

npm run lint


info "Running JS tests"

npm run test


info "Generating code docs"

npm run docs
