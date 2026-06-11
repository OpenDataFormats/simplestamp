#!/bin/bash
source $(dirname ${0})/base.sh

info "Running all tests"

cd $SRC_TS_SIMPLESTAMP

info "Checking code lint"

npm run lint


info "Checking TypeScript types"

npx tsc --noEmit


info "Running TypeScript tests"

npm run test
