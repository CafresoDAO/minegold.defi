#!/usr/bin/env bash
# Generate the Banking.Brave seal icon set.
#
# The source PNG is 1024² with the blue disc occupying a 662² box at
# (178,187) — measured by sampling the disc fill, not eyeballed. Every icon
# crops to that box so the mark FILLS the frame; the raw PNG would leave the
# seal floating in white space and unreadable at 16px.
set -euo pipefail

SRC="$1"; OUT="$2"
mkdir -p "$OUT" /tmp/icons-work
cd /tmp/icons-work
B64=$(base64 -i "$SRC" | tr -d '\n')

# $1 name  $2 background (hex or "none")  $3 content scale (1 = full bleed)
svg () {
  local name=$1 bg=$2 scale=$3
  local inner pad
  inner=$(python3 -c "print(662*$scale)")
  pad=$(python3 -c "print((662-662*$scale)/2)")
  {
    printf "<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' width='662' height='662' viewBox='0 0 662 662'>"
    [ "$bg" != "none" ] && printf "<rect width='662' height='662' fill='%s'/>" "$bg"
    printf "<defs><clipPath id='disc'><circle cx='331' cy='331' r='331'/></clipPath></defs>"
    printf "<g transform='translate(%s,%s) scale(%s)'>" "$pad" "$pad" "$scale"
    # Clip ALWAYS, and from INSIDE the scaled group so the circle scales with
    # it. The source PNG carries an opaque white background; unclipped it
    # paints over the plate (and reads as a white tile on dark chrome).
    printf "<g clip-path='url(#disc)'>"
    #      translate(-178,-187) aligns the measured disc box to the viewBox.
    printf "<image x='-178' y='-187' width='1024' height='1024' xlink:href='data:image/png;base64,%s'/>" "$B64"
    printf "</g></g>"
    printf "</svg>"
  } > "$name.svg"
}

rast () { # $1 svg-name  $2 size  $3 outfile
  qlmanage -t -s "$2" "$1.svg" -o . >/dev/null 2>&1
  # qlmanage pads to a square canvas; force exact dimensions.
  sips -z "$2" "$2" "$1.svg.png" --out "$OUT/$3" >/dev/null 2>&1
  printf "  %-28s %sx%s  %s bytes\n" "$3" "$2" "$2" "$(wc -c < "$OUT/$3" | tr -d ' ')"
}

# EVERY icon is plated with the brand blue rather than left transparent:
# qlmanage rasterises SVG onto an opaque WHITE canvas, so a "transparent"
# corner ships as a white one — which reads as a white box on dark chrome.
# A blue plate is on-brand, needs no alpha, and at 16px the disc edge simply
# merges into it leaving the white lion legible. On-page marks get their
# circle from CSS (rounded-full + overflow-hidden), not from the file.
svg plate     '#02458c' 1
svg maskable  '#02458c' 0.72   # launcher masks crop to ~80%; 72% keeps the
                               # lion and both words inside the safe circle.

echo "seal icons ->"
rast plate 16  favicon-16.png
rast plate 32  favicon-32.png
rast plate 48  favicon-48.png
rast plate 192 icon-192.png
rast plate 512 icon-512.png
rast plate 180 apple-touch-icon.png
rast maskable 512 icon-maskable-512.png
