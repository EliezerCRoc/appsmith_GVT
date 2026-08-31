#!/usr/bin/env bash
#
# build-gvt-image.sh — build the Gravitar (white-label Appsmith CE) Docker image.
#
# The repo Dockerfile overlays app artifacts onto a prebuilt Appsmith base image.
# It copies the CLIENT explicitly, but the SERVER jar only reaches the image via
# `COPY deploy/docker/fs /` — which requires scripts/prepare_server_artifacts.sh
# to have staged it first. Skip that step and the image silently runs the STOCK
# CE server, so branding (and any other server change) never persists.
#
# This script runs the full chain in the right order. By default it rebuilds
# everything; pass flags to skip the parts you haven't touched.
#
# Usage:
#   ./build-gvt-image.sh                     # build server + client + rts, then image
#   ./build-gvt-image.sh --skip-client       # reuse existing app/client/build
#   ./build-gvt-image.sh --skip-server --skip-rts
#   ./build-gvt-image.sh --image-only        # only stage artifacts + docker build
#   ./build-gvt-image.sh --tag myrepo/gvt:v1 --base appsmith/appsmith-ce:latest
#
# Env overrides:
#   IMAGE_TAG   (default: appsmith_gvt_backend:latest)
#   BASE_IMAGE  (default: appsmith/appsmith-ce:latest)

set -o errexit
set -o nounset
set -o pipefail

cd "$(git rev-parse --show-toplevel)"

IMAGE_TAG="${IMAGE_TAG:-appsmith_gvt:latest}"
BASE_IMAGE="${BASE_IMAGE:-appsmith/appsmith-ce:latest}"

build_server=1
build_client=1
build_rts=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-server) build_server=0; shift ;;
    --skip-client) build_client=0; shift ;;
    --skip-rts)    build_rts=0; shift ;;
    --image-only)  build_server=0; build_client=0; build_rts=0; shift ;;
    --tag)         IMAGE_TAG="$2"; shift 2 ;;
    --base)        BASE_IMAGE="$2"; shift 2 ;;
    -h|--help)     sed -n '2,26p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

step() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }

# 1. Server (Java) -> app/server/dist/
if [[ $build_server == 1 ]]; then
  step "Building server (app/server/build.sh -DskipTests)"
  (cd app/server && ./build.sh -DskipTests)
fi

# 2. Client (React) -> app/client/build/
if [[ $build_client == 1 ]]; then
  step "Building client (yarn install && yarn build)"
  (cd app/client && yarn install --immutable && yarn build)
fi

# 3. RTS (Node) -> app/client/packages/rts/dist/
if [[ $build_rts == 1 ]]; then
  step "Building RTS (packages/rts/build.sh)"
  (cd app/client/packages/rts && ./build.sh)
fi

# 4. info.json — the Dockerfile hard-fails without it
step "Generating info.json"
scripts/generate_info_json.sh

# 5. Stage server jar + plugins into deploy/docker/fs/  <-- the easily-missed step
step "Staging server artifacts (scripts/prepare_server_artifacts.sh)"
scripts/prepare_server_artifacts.sh

staged_jar="deploy/docker/fs/opt/appsmith/server/mongo/server.jar"
if [[ ! -f "$staged_jar" ]]; then
  echo "ERROR: $staged_jar was not produced — did app/server/build.sh succeed?" >&2
  exit 1
fi
echo "Staged jar: $(ls -la "$staged_jar")"

# 6. Build the image
step "docker build -t $IMAGE_TAG --build-arg BASE=$BASE_IMAGE ."
docker build -t "$IMAGE_TAG" --build-arg "BASE=$BASE_IMAGE" .

step "Done: $IMAGE_TAG"
cat <<EOF

Next:
  docker compose up -d --force-recreate     # recreate the container (a plain restart keeps the old image)

Verify branding round-trips (grab SESSION cookie from DevTools):
  curl -sk -X PUT https://dev.appsmith.com/api/v1/tenants \\
    -H 'Content-Type: application/json' -H 'Cookie: SESSION=...' \\
    -d '{"brandName":"ROUNDTRIP_TEST"}' | jq '.data.organizationConfiguration.brandName'
EOF
