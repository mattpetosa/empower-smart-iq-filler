#!/usr/bin/env bash
# www/ → /var/www/iq.mhpwebserver.com. Static site, no service to restart.
# Runs the tests first; refuses to deploy a tree that fails them.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEBROOT=/var/www/iq.mhpwebserver.com
cd "$REPO"
npm test
[[ -f www/index.html && -f www/js/app.js ]] || { echo "REFUSING: www/ does not look like the site" >&2; exit 1; }
# `|| true`: on a clean tree the test is false, and under set -e that would end the script.
STAMP=$(git rev-parse --short HEAD)$([[ -n "$(git status --porcelain)" ]] && echo -dirty || true)
TMP=$(mktemp -d)
cp -a www/. "$TMP/"
# mktemp -d is mode 700 and rsync -a copies that onto the webroot: open it up for nginx.
chmod -R u=rwX,go=rX "$TMP"
sed -i "s#href=\"style.css\"#href=\"style.css?v=$STAMP\"#; s#src=\"js/app.js\"#src=\"js/app.js?v=$STAMP\"#" "$TMP/index.html"
sudo mkdir -p "$WEBROOT"
sudo rsync -a --delete "$TMP/" "$WEBROOT/"
sudo chown -R root:root "$WEBROOT"
rm -rf "$TMP"
echo "deployed $STAMP to $WEBROOT"
