#!/bin/sh

set -eu

if [ -n "${CI_PRIMARY_REPOSITORY_PATH:-}" ]; then
  REPOSITORY_ROOT="$CI_PRIMARY_REPOSITORY_PATH"
else
  SCRIPT_DIRECTORY=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
  REPOSITORY_ROOT=$(CDPATH= cd -- "$SCRIPT_DIRECTORY/../../.." && pwd)
fi

APP_ROOT="$REPOSITORY_ROOT/pull"

cd "$APP_ROOT"
npm ci

cd "$APP_ROOT/ios"
pod install
