#!/bin/bash
source $(dirname ${0})/base.sh


MODELS_OUT="${SRC_TS_SIMPLESTAMP}/models/"

info "Cleaning existing generated files"
find ${MODELS_OUT} -type f -name '*.ts' -not -name '.gitkeep' -exec rm {} +


info "Generating TypeScript Protocol Buffer messages"
cd ${SRC_TS_SIMPLESTAMP}
npm run proto:gen
