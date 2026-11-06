#!/usr/bin/env python3
"""build_data.py  (Step 5; Step P2.2 added the horror2 scene table)  --  stdlib only

Purpose : <part>.json (word timings) + <part>.wav  ->  story_data.json (schema: 2dpython.md 6.2)
Usage   : python3 build_data.py --part horror1 [--sync keep|fit|offset:-0.2]
                                [--intro 60] [--outro 90] [--fps 30] [--tail 0.5]
Reads   : <part>.json, <part>.wav (same folder as this script)
Writes  : story_data.json  (all frames are relative to narration start; Story.jsx adds introFrames)
Adding a new part: add one entry to PARTS (scene table) -- nothing else changes.
Fails loudly (exit code 1, "ERROR: ...") on bad data.
"""
import argparse
import json
import math
import sys
import unicodedata
import wave
from pathlib import Path

HERE = Path(__file__).resolve().parent

# ---------------------------------------------------------------- palette (= theme.js COLORS)
BONE, AMBER, GHOST, TOXIC, VIOLET, BLOOD = "#f3ecdc", "#ffb020", "#4fe3ff", "#7cff4f", "#b46bff", "#ff2d3d"
GENERIC_COLORS = [BONE, VIOLET]  # normal words alternate inside a page; tune freely
ENTITY_COLORS = {"person": AMBER, "place": GHOST, "year": BLOOD, "age": TOXIC}
ENTITIES = {  # base form -> type (inflections matched by prefix, e.g. প্রভাসের, গ্রামেই)
    "প্রহ্লাদ": "person", "বিশ্বাস": "person", "প্রভাস": "person", "পঙ্কজ": "person", "প্রকাশ": "person",
    "নড়াইল": "place", "লোহাগাড়া": "place", "লাহুরিয়া": "place", "গ্রাম": "place",
    "উনিশশো": "year", "ছিয়াত্তর": "year", "সাল": "year",
    "পঁয়ত্রিশ": "age", "তিরিশের": "age",
}

# ---------------------------------------------------------------- scene tables (word ranges are inclusive)
PARTS = {
    "horror1": [
        {"id": "year", "component": "Scene01_Year", "title": "১৯৭৬", "range": (0, 4)},
        {"id": "village", "component": "Scene02_Village", "title": "লাহুরিয়া গ্রাম", "range": (5, 13)},
        {"id": "family", "component": "Scene03_Family", "title": "বিশ্বাস পরিবার", "range": (14, 26)},
        {"id": "ages", "component": "Scene04_Ages", "title": "বয়স", "range": (27, 33)},
    ],
    # Part 2 (Step P2.2): 47 words; scene plan = 2dpython.md 2.7 (titles are labels for the debug HUD only)
    "horror2": [
        {"id": "marriage", "component": "Part2_Scene01_Marriage", "title": "বিয়ে", "range": (0, 7)},
        {"id": "joint", "component": "Part2_Scene02_Joint", "title": "একান্নবর্তী পরিবার", "range": (8, 11)},
        {"id": "discord", "component": "Part2_Scene03_Discord", "title": "বনিবনা হয়নি", "range": (12, 26)},
        {"id": "leave", "component": "Part2_Scene04_Leave", "title": "বাড়ি ছেড়ে", "range": (27, 35)},
        {"id": "land", "component": "Part2_Scene05_Land", "title": "পতিত জমি", "range": (36, 46)},
    ],
}

HARD_BREAK = set("।?!॥")
SOFT_BREAK = set(",;")


class DataError(Exception):
    pass


def norm(s):
    return unicodedata.normalize("NFC", s)


def strip_punct(s):
    s = norm(s).strip()
    while s and unicodedata.category(s[0]).startswith("P"):
        s = s[1:]
    while s and unicodedata.category(s[-1]).startswith("P"):
        s = s[:-1]
    return s


def fr(sec, fps):
    """seconds -> frame, round-half-up (stable against float noise)."""
    return int(math.floor(sec * fps + 0.5 + 1e-6))


# ---------------------------------------------------------------- input + validation
def load_words(path):
    if not path.exists():
        raise DataError(f"missing file {path.name}")
    raw = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, dict):
        raw = raw.get("words")
    if not isinstance(raw, list) or not raw:
        raise DataError(f"{path.name}: expected a non-empty list of {{word,start,end}}")
    words = []
    for i, r in enumerate(raw):
        try:
            text, s, e = str(r["word"]).strip(), float(r["start"]), float(r["end"])
        except (KeyError, TypeError, ValueError):
            raise DataError(f"word #{i}: needs keys word/start/end (numbers)")
        words.append({"i": i, "text": norm(text), "start": s, "end": e})
    return words


def validate(words, audio_sec, warns):
    prev = None
    for w in words:
        i = w["i"]
        if not w["text"]:
            raise DataError(f"word #{i}: empty text")
        if w["start"] < 0 or w["end"] <= w["start"]:
            raise DataError(f"word #{i} '{w['text']}': bad times start={w['start']} end={w['end']}")
        if prev is not None:
            if w["start"] < prev["start"]:
                raise DataError(f"word #{i} '{w['text']}': non-monotonic start {w['start']} < {prev['start']}")
            if w["start"] < prev["end"] - 0.05:
                raise DataError(f"word #{i} '{w['text']}': overlaps previous word by {prev['end'] - w['start']:.2f}s")
            if w["start"] < prev["end"] - 0.001:
                warns.append(f"word #{i}: tiny overlap with previous word (<=50 ms)")
        prev = w
    if words[-1]["end"] > audio_sec + 0.05:
        warns.append(f"last word ends {words[-1]['end']:.2f}s but audio is {audio_sec:.2f}s (see SYNC_MODE)")


def wav_seconds(path):
    if not path.exists():
        raise DataError(f"missing file {path.name}")
    with wave.open(str(path), "rb") as w:
        return w.getnframes() / float(w.getframerate())


# ---------------------------------------------------------------- sync modes (2dpython.md 2.2)
def apply_sync(words, mode, audio_sec, warns):
    if mode == "keep":
        return
    if mode == "fit":
        k = audio_sec / words[-1]["end"]
        for w in words:
            w["start"], w["end"] = w["start"] * k, w["end"] * k
        warns.append(f"sync=fit: all times scaled by {k:.4f}")
    elif mode.startswith("offset:"):
        try:
            off = float(mode.split(":", 1)[1])
        except ValueError:
            raise DataError(f"bad --sync '{mode}' (use offset:-0.2)")
        for w in words:
            w["start"], w["end"] = max(0.0, w["start"] + off), max(0.02, w["end"] + off)
        warns.append(f"sync=offset: all times shifted by {off:+.2f}s (negative starts clamped to 0)")
    else:
        raise DataError(f"unknown --sync '{mode}' (keep | fit | offset:<sec>)")


# ---------------------------------------------------------------- caption pages
def split_long(seg, mx):
    """Split a too-long segment: prefer an inner comma, else balanced sizes (no 1-word widows)."""
    n = len(seg)
    if n <= mx:
        return [seg]
    cuts = [j + 1 for j in range(1, n - 2) if seg[j]["text"][-1] in SOFT_BREAK]
    if cuts:
        c = min(cuts, key=lambda c: max(c, n - c))
        return split_long(seg[:c], mx) + split_long(seg[c:], mx)
    k = math.ceil(n / mx)
    base, extra = divmod(n, k)
    out, pos = [], 0
    for p in range(k):
        size = base + (1 if p < extra else 0)
        out.append(seg[pos:pos + size])
        pos += size
    return out


def build_pages(words, mx):
    segs, cur = [], []
    for w in words:
        cur.append(w)
        last = w["text"][-1]
        if last in HARD_BREAK or (last in SOFT_BREAK and len(cur) >= 3):
            segs.append(cur)
            cur = []
    if cur:
        segs.append(cur)
    pages = []
    for seg in segs:
        pages.extend(split_long(seg, mx))
    return pages


def entity_of(text):
    t = strip_punct(text)
    best = None
    for base, typ in ENTITIES.items():
        if t.startswith(norm(base)) and (best is None or len(base) > len(best[0])):
            best = (base, typ)
    return best[1] if best else None


# ---------------------------------------------------------------- main build
def build(args):
    warns = []
    words = load_words(HERE / f"{args.part}.json")
    audio_sec = wav_seconds(HERE / f"{args.part}.wav")
    validate(words, audio_sec, warns)
    apply_sync(words, args.sync, audio_sec, warns)
    fps = args.fps

    speech_end = words[-1]["end"]
    narration = max(audio_sec, speech_end) + args.tail
    n_frames = int(math.ceil(narration * fps - 1e-6))
    for w in words:
        w["startFrame"] = fr(w["start"], fps)
        w["endFrame"] = min(n_frames, max(w["startFrame"] + 1, fr(w["end"], fps)))

    # pages
    groups = build_pages(words, args.max_words)
    pages = []
    for pid, g in enumerate(groups):
        pages.append({"id": pid, "wordIdx": [w["i"] for w in g], "startFrame": g[0]["startFrame"], "endFrame": 0})
    for pid, p in enumerate(pages):
        if pid + 1 < len(pages):
            p["endFrame"] = pages[pid + 1]["startFrame"]
        else:
            p["endFrame"] = min(n_frames, words[-1]["endFrame"] + fr(0.5, fps))
        if p["endFrame"] <= p["startFrame"]:
            raise DataError(f"page {pid}: zero length")

    # colours + emphasis
    for g in groups:
        for pos, w in enumerate(g):
            typ = entity_of(w["text"])
            w["entity"] = typ
            w["emphasis"] = typ is not None
            w["color"] = ENTITY_COLORS[typ] if typ else GENERIC_COLORS[pos % len(GENERIC_COLORS)]

    # scenes (contiguous, cover every word, extend to next scene start)
    table = PARTS.get(args.part)
    if not table:
        raise DataError(f"no scene table for part '{args.part}' -- add it to PARTS in build_data.py")
    expect = 0
    for sc in table:
        a, b = sc["range"]
        if a != expect or b < a or b >= len(words):
            raise DataError(f"scene '{sc['id']}': wordRange {sc['range']} must start at {expect} and stay < {len(words)}")
        expect = b + 1
    if expect != len(words):
        raise DataError(f"scene table covers words 0..{expect - 1} but the part has {len(words)} words")
    scenes = []
    for k, sc in enumerate(table):
        a, b = sc["range"]
        start = 0 if k == 0 else words[a]["startFrame"]
        scenes.append({"id": sc["id"], "component": sc["component"], "title": sc["title"],
                       "wordRange": [a, b], "startFrame": start, "endFrame": 0})
    for k, sc in enumerate(scenes):
        sc["endFrame"] = scenes[k + 1]["startFrame"] if k + 1 < len(scenes) else n_frames
        if sc["endFrame"] <= sc["startFrame"]:
            raise DataError(f"scene '{sc['id']}': zero length")

    data = {
        "part": args.part, "fps": fps, "syncMode": args.sync,
        "audio": {"file": f"{args.part}.wav", "durationSec": round(audio_sec, 3)},
        "introFrames": args.intro, "outroFrames": args.outro,
        "narrationFrames": n_frames, "totalFrames": args.intro + n_frames + args.outro,
        "maxWords": args.max_words, "maxWordsHorizontal": args.max_words_h,
        "words": [{"i": w["i"], "text": w["text"], "start": round(w["start"], 3), "end": round(w["end"], 3),
                   "startFrame": w["startFrame"], "endFrame": w["endFrame"], "color": w["color"],
                   "entity": w["entity"], "emphasis": w["emphasis"]} for w in words],
        "pages": pages, "scenes": scenes,
    }
    return data, warns


def dump(data):
    keys, lines = list(data), ["{"]
    for n, k in enumerate(keys):
        v = data[k]
        if isinstance(v, list):
            body = ",\n".join("    " + json.dumps(x, ensure_ascii=False) for x in v)
            s = f'  "{k}": [\n{body}\n  ]'
        else:
            s = f'  "{k}": {json.dumps(v, ensure_ascii=False)}'
        lines.append(s + ("," if n < len(keys) - 1 else ""))
    lines.append("}")
    return "\n".join(lines) + "\n"


def report(d, warns, out):
    f = d["fps"]
    print(f"== build_data: part={d['part']} sync={d['syncMode']} fps={f} ==")
    print(f"audio {d['audio']['durationSec']:.3f}s | words {len(d['words'])} | speech "
          f"{d['words'][0]['start']:.2f}-{d['words'][-1]['end']:.2f}s")
    print(f"frames: intro {d['introFrames']} + narration {d['narrationFrames']} + outro {d['outroFrames']} "
          f"= total {d['totalFrames']} ({d['totalFrames'] / f:.2f}s)")
    print("\nSCENES (frames relative to narration start)")
    print(f"{'id':<9}{'component':<18}{'words':<8}{'frames':<12}{'seconds':<14}title")
    for s in d["scenes"]:
        a, b = s["wordRange"]
        print(f"{s['id']:<9}{s['component']:<18}{a}-{b:<6}{s['startFrame']}-{s['endFrame']:<8}"
              f"{s['startFrame'] / f:.2f}-{s['endFrame'] / f:.2f}   {s['title']}")
    print("\nPAGES")
    for p in d["pages"]:
        txt = " ".join(d["words"][i]["text"] for i in p["wordIdx"])
        print(f"  #{p['id']:<2} {p['startFrame']:>4}-{p['endFrame']:<4} {txt}")
    ents = [f"{w['text']}[{w['entity']}]" for w in d["words"] if w["entity"]]
    print(f"\nENTITIES ({len(ents)}): " + "  ".join(ents))
    for w in warns:
        print("WARNING:", w)
    print(f"\nwrote {out}")


def main():
    ap = argparse.ArgumentParser(description="Build story_data.json from <part>.json + <part>.wav")
    ap.add_argument("--part", default="horror1")
    ap.add_argument("--sync", default="keep", help="keep | fit | offset:<sec>")
    ap.add_argument("--intro", type=int, default=60, help="intro frames (0 = no intro)")
    ap.add_argument("--outro", type=int, default=90, help="outro frames (0 = no outro)")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--tail", type=float, default=0.5, help="seconds kept after audio/last word")
    ap.add_argument("--max-words", type=int, default=4, dest="max_words")
    ap.add_argument("--max-words-h", type=int, default=6, dest="max_words_h")
    ap.add_argument("--out", default="story_data.json")
    args = ap.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    try:
        if min(args.intro, args.outro) < 0 or args.fps < 1 or args.max_words < 1:
            raise DataError("--intro/--outro must be >= 0, --fps and --max-words >= 1")
        data, warns = build(args)
        out = Path(args.out) if Path(args.out).is_absolute() else HERE / args.out
        out.write_text(dump(data), encoding="utf-8")
        json.loads(out.read_text(encoding="utf-8"))  # self-check: valid JSON
        report(data, warns, out.name)
    except (DataError, json.JSONDecodeError, wave.Error) as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
