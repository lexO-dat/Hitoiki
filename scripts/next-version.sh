#!/usr/bin/env bash
# Next release version (see README → Versiones).
# MAJOR.MINOR come from package.json; PATCH is the next free number among the existing vMAJOR.MINOR.* tags.
# Prints shell assignments: APP_VERSION, APP_BUILD (Android versionCode) and PREV_TAG.
set -euo pipefail
base=$(node -p "require('./package.json').version.split('.').slice(0, 2).join('.')")
major=${base%%.*}
minor=${base#*.}
last=$(git tag -l "v$base.*" | sed "s/^v$base\.//" | grep -E '^[0-9]+$' | sort -n | tail -1 || true)
patch=$(( ${last:--1} + 1 ))
# versionCode must always grow: MAJOR·1 000 000 + MINOR·1 000 + PATCH (PATCH < 1000).
build=$(( major * 1000000 + minor * 1000 + patch ))
prev=$(git tag -l 'v*' --sort=-v:refname | head -1 || true)
echo "APP_VERSION=$base.$patch"
echo "APP_BUILD=$build"
echo "PREV_TAG=$prev"
