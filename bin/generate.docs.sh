#!/bin/bash
source $(dirname ${0})/base.sh


info "Generating JSDocs documentation for source code"

cd $SRC_JS_SIMPLESTAMP
npm run docs
