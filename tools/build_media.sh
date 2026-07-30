#!/usr/bin/env bash
# Converts data/ originals into web derivatives under site/media/.
# Re-runnable: existing outputs are overwritten. Requires ffmpeg + sips (preinstalled on macOS).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$ROOT/data"
OUT="$ROOT/site/media"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$OUT/photos" "$OUT/video" "$OUT/letters" "$OUT/audio"

# Rebuilding should remove only the pipeline's managed numbered outputs first
rm -f "$OUT/photos/"[0-9][0-9][0-9][0-9].webp
rm -f "$OUT/letters/"[0-9][0-9][0-9][0-9].webp
rm -f "$OUT/video/"[0-9][0-9][0-9][0-9].mp4
rm -f "$OUT/video/"[0-9][0-9][0-9][0-9].jpg
rm -f "$OUT/audio/theme.m4a"

MANIFEST="$ROOT/tools/measured.json"
touch "$WORK/entries.jsonl"

emit() { # kind out src width height captured duration
  jq -n -c \
    --arg kind "$1" \
    --arg out "$2" \
    --arg src "$3" \
    --argjson width "$4" \
    --argjson height "$5" \
    --arg captured "$6" \
    --argjson duration "${7:-0}" \
    '{kind: $kind, out: $out, src: $src, width: $width, height: $height, captured: $captured, duration: $duration}' \
    >> "$WORK/entries.jsonl"
}

dims() {
  ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$1" \
    | awk -F'x' '{print $1 "x" $2}'
}

captured_photo() { sips -g creation "$1" 2>/dev/null | awk -F': ' '/creation/{print $2}'; }

# --- photos and letters -------------------------------------------------------
convert_image() { # infile outdir index longedge quality kind
  local infile="$1" outdir="$2" index="$3" longedge="$4" quality="$5" kind="$6"
  local base; base="$(basename "$infile")"
  local staged="$WORK/${index}.jpg"
  local out; out="$(printf '%s/%04d.webp' "$outdir" "$index")"

  # sips applies EXIF rotation while transcoding HEIC/JPEG to a working JPEG.
  sips -s format jpeg -s formatOptions 95 --resampleHeightWidthMax "$longedge" \
       "$infile" --out "$staged" >/dev/null

  ffmpeg -nostdin -loglevel error -y -i "$staged" -map_metadata -1 -quality "$quality" "$out"

  local wh; wh="$(dims "$out")"
  emit "$kind" "${out#"$ROOT/site/"}" "$base" "${wh%x*}" "${wh#*x}" "$(captured_photo "$infile")" "0"
  echo "  $base -> ${out#"$ROOT/site/"} ($wh)"
}

echo "photos:"
i=0
while IFS= read -r f; do
  i=$((i+1))
  convert_image "$f" "$OUT/photos" "$i" 1600 82 photo
done < <(find "$DATA" -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.heic' -o -iname '*.heif' \) | sort)

echo "letters:"
i=0
while IFS= read -r f; do
  i=$((i+1))
  convert_image "$f" "$OUT/letters" "$i" 3000 90 letter
done < <(find "$DATA/letters" -maxdepth 1 -type f -iname '*.jpg' | sort)

# --- video --------------------------------------------------------------------
echo "video:"
i=0
while IFS= read -r f; do
  i=$((i+1))
  base="$(basename "$f")"
  out="$(printf '%s/%04d.mp4' "$OUT/video" "$i")"
  poster="$(printf '%s/%04d.jpg' "$OUT/video" "$i")"

  # -an strips audio: smaller files, and nothing can ever fight the soundtrack.
  ffmpeg -nostdin -loglevel error -y -i "$f" \
    -vf "scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))',format=yuv420p" \
    -c:v libx264 -preset slow -crf 28 -an -map_metadata -1 -movflags +faststart "$out"

  ffmpeg -nostdin -loglevel error -y -ss 0.1 -i "$out" -map_metadata -1 -frames:v 1 -q:v 4 "$poster"

  wh="$(dims "$out")"
  dur="$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$out")"
  cap="$(ffprobe -v quiet -show_entries format_tags=creation_time -of csv=p=0 "$f")"
  emit video "${out#"$ROOT/site/"}" "$base" "${wh%x*}" "${wh#*x}" "$cap" "${dur:-0}"
  echo "  $base -> ${out#"$ROOT/site/"} ($wh, ${dur}s)"
done < <(find "$DATA" -maxdepth 1 -type f \( -iname '*.mov' -o -iname '*.mp4' \) | sort)

# --- audio --------------------------------------------------------------------
echo "audio:"
shopt -s nullglob
songs=("$DATA"/*.mp3)
if [ ${#songs[@]} -ne 1 ]; then
  echo "Error: Expected exactly one .mp3 file in $DATA, found ${#songs[@]}" >&2
  exit 1
fi
song="${songs[0]}"
shopt -u nullglob

ffmpeg -nostdin -loglevel error -y -i "$song" -map_metadata -1 -c:a aac -b:a 128k -movflags +faststart "$OUT/audio/theme.m4a"
adur="$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$OUT/audio/theme.m4a")"
emit audio "media/audio/theme.m4a" "$(basename "$song")" 0 0 "" "${adur:-0}"
echo "  $(basename "$song") -> media/audio/theme.m4a (${adur}s)"

jq -s '.' "$WORK/entries.jsonl" > "$WORK/measured.json"
mv "$WORK/measured.json" "$MANIFEST"

echo ""
echo "wrote $MANIFEST"
du -sh "$OUT"
