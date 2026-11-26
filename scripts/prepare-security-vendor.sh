#!/usr/bin/env bash
set -euo pipefail
# Run from the repository root with the verified Actions artifact.
test "$(git branch --show-current)" = "fix/security-hardening-v3.7.1"
archive="$(realpath "${1:?Provide the verified artifact ZIP}")"
printf '%s  %s\n' '5caef8ba7be7f17c0bead6f0a233d5d5dc6752331e6cc6f21ef685d8c6a9667f' "$archive" | sha256sum -c -
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
unzip -q "$archive" -d "$tmp"
(cd "$tmp/vendor" && sha256sum -c ../vendor.sha256)
for destination in vendor preview/vendor; do
  mkdir -p "$destination/pdfjs" "$destination/mammoth"
  for file in pdfjs/pdf.min.mjs pdfjs/pdf.worker.min.mjs pdfjs/LICENSE mammoth/mammoth.browser.min.js mammoth/LICENSE package-lock.json; do
    cp "$tmp/vendor/$file" "$destination/$file"
  done
  cp "$tmp/vendor.sha256" "$destination/SHA256SUMS"
  (cd "$destination" && sha256sum -c SHA256SUMS)
done
git status --short -- vendor preview/vendor
