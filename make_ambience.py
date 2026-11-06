#!/usr/bin/env python3
"""make_ambience.py (Step 16) - synthesizes ambience.wav (dark horror bed) with Python only. No downloads, no copyright.

Purpose : writes <HERE>/ambience.wav = 44.1 kHz, mono, 16-bit PCM, length = story length + 3 s (default `--seconds auto`).
          File time 0 = video frame 0 (it starts together with the intro), so Story.jsx can mount it as <Audio src=ambience/>
          from the very first frame and only has to set volume (~0.25) and fades (plan 7.3).
Needs   : story_data.json (made by build_data.py; read for fps / intro / narration / scene starts). stdlib only; numpy is
          OPTIONAL (faster, ~1 s instead of ~10 s). Both backends build the same arrangement (same events at the same times);
          only the random noise samples differ between the two backends. Same backend + same seed = byte-identical file.
CLI     : python3 make_ambience.py --part horror1 [--seconds auto|<N>] [--data story_data.json] [--out ambience.wav]
                                   [--seed a] [--level -20] [--backend auto|numpy|python] [--no-riser] [--no-hits]
Layers  : 1 DRONE   two detuned sines 55 + 58 Hz (3 Hz beating) + faint 110.7 Hz, slow amplitude LFO (0.08 Hz)
          2 WIND    band-limited noise (~120-900 Hz, one-pole LP 900 minus LP 120) with a moving gain (two slow sines + seeded gusts)
          3 HEART   60 bpm "lub-dub" thuds (chirp 72->38 Hz) from intro end + 1 s; from 55 % of the narration to its end the tempo
                    accelerates to 100 bpm and the thuds get louder
          4 CREAKS  2-8 rare FM bursts (about one per 6 s) at seeded times, away from scene hits and the intro
          5 RISER   (only if introFrames > 0) 0 .. intro end: rising sine + noise swell, ending in a low BOOM at the narration start
          6 HITS    soft low thud at every scene start except the first (--no-hits disables)
Level   : final mix normalised to RMS = --level dBFS (default -20) over the whole file, then limited so the peak never exceeds
          -3 dBFS (gain is reduced if needed; the report says so). Tiny 20 ms fades at both ends avoid clicks.
Prints  : a report (backend, duration, event times, RMS/peak dBFS). Exit code 1 + clear message on bad input.
"""
import argparse
import json
import math
import random
import sys
import wave
import zlib
from pathlib import Path

try:  # optional accelerator
    import numpy as np
except Exception:  # pragma: no cover
    np = None

HERE = Path(__file__).resolve().parent
TAU = 2 * math.pi
SR = 44100
CTRL = 100  # control-rate (Hz) of the slow envelopes
GAIN = {"drone": 0.50, "wind": 0.30, "heart": 0.50, "creak": 0.22, "riser": 0.40, "boom": 1.00, "hit": 0.60}


def smooth(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def dbfs(x):
    return 20 * math.log10(x) if x > 0 else -999.0


class Fail(Exception):
    pass


# ---------------------------------------------------------------- plan (what happens when, in seconds of FILE time)
def make_plan(a):
    data_path = Path(a.data)
    if not data_path.is_absolute():
        data_path = HERE / data_path
    d = None
    if data_path.exists():
        d = json.loads(data_path.read_text(encoding="utf-8"))
        if d.get("part") != a.part:
            raise Fail(f'{data_path.name} is for part "{d.get("part")}", not "{a.part}". Run: python3 build_data.py --part {a.part}')
    elif a.seconds == "auto":
        raise Fail(f"{data_path.name} not found. Run build_data.py first, or pass --seconds <N>.")
    if d:
        fps = d["fps"]
        intro = d["introFrames"] / fps
        nar_end = (d["introFrames"] + d["narrationFrames"]) / fps
        hits = [(d["introFrames"] + s["startFrame"]) / fps for s in d["scenes"][1:]]
        total = d["totalFrames"] / fps + 3.0
    else:  # no data: plain bed, narration assumed to end 3 s before the file does
        intro, hits, total = 0.0, [], None
    seconds = total if a.seconds == "auto" else float(a.seconds)
    if not (1.0 <= seconds <= 3600):
        raise Fail(f"--seconds must be 'auto' or a number between 1 and 3600 (got {a.seconds})")
    if not d:
        nar_end = max(1.0, seconds - 3.0)
    return {"seconds": seconds, "intro": intro, "nar_end": min(nar_end, seconds), "hits": [h for h in hits if h < seconds - 0.5]}


# ---------------------------------------------------------------- one-shot waveforms (pure Python lists, cached/reused)
def peak_norm(w):
    m = max((abs(v) for v in w), default=0.0) or 1.0
    return [v / m for v in w]


def thud(f0=72.0, f1=38.0, tau=0.035, dur=0.38, decay=0.075):
    out = []
    for i in range(int(dur * SR)):
        t = i / SR
        ph = TAU * (f1 * t + (f0 - f1) * tau * (1 - math.exp(-t / tau)))
        env = (1 - math.exp(-t / 0.004)) * math.exp(-t / decay)
        out.append(env * (math.sin(ph) + 0.25 * math.sin(2 * ph)))
    return peak_norm(out)


def boom(rnd):
    w = thud(95.0, 26.0, 0.12, 1.4, 0.35)
    for i in range(int(0.15 * SR)):  # short noise crack on the attack
        w[i] += 0.35 * rnd.uniform(-1, 1) * math.exp(-i / SR / 0.03)
    return peak_norm(w)


def creak(rnd):
    dur = rnd.uniform(0.4, 0.9)
    f0, f1 = rnd.uniform(140, 260), rnd.uniform(140, 260) * rnd.uniform(0.6, 1.5)
    fm, idx = rnd.uniform(17, 31), rnd.uniform(2.5, 5.5)
    out, ph = [], 0.0
    for i in range(int(dur * SR)):
        x = i / SR / dur
        ph += TAU * (f0 + (f1 - f0) * x) / SR
        env = math.sin(math.pi * x) ** 0.7 * (1 - 0.5 * x)
        m = math.sin(TAU * fm * i / SR)
        out.append(env * (math.sin(ph + idx * (1 - x) * m) + 0.3 * math.sin(3 * ph + idx * m)))
    return peak_norm(out)


def riser(dur, rnd):
    out, ph, y = [], 0.0, 0.0
    for i in range(int(dur * SR)):
        x = i / SR / dur
        ph += TAU * (60 + 380 * x * x) / SR
        a = 1 - math.exp(-TAU * (200 + 2800 * x) / SR)  # one-pole LP with a rising cutoff
        y += a * (rnd.uniform(-1, 1) - y)
        out.append(x * x * (0.7 * math.sin(ph) + 1.8 * y))
    return peak_norm(out)


# ---------------------------------------------------------------- slow envelopes (control rate, plain lists)
def ctrl(fn, seconds):
    return [fn(k / CTRL) for k in range(int(seconds * CTRL) + 3)]


def env_at(c, i):
    x = i * CTRL / SR
    k = int(x)
    return c[k] + (c[k + 1] - c[k]) * (x - k)


def wind_gain_fn(rnd, seconds):
    p1, p2 = rnd.uniform(0, TAU), rnd.uniform(0, TAU)
    gusts = [(rnd.uniform(1, max(1.5, seconds - 1)), rnd.uniform(0.6, 1.8), rnd.uniform(0.3, 0.7)) for _ in range(max(2, int(seconds / 7)))]

    def g(t):
        base = 0.25 + 0.75 * (0.5 + 0.5 * math.sin(TAU * 0.06 * t + p1)) * (0.6 + 0.4 * math.sin(TAU * 0.11 * t + p2))
        return base + sum(a * math.exp(-0.5 * ((t - c) / w) ** 2) for c, w, a in gusts)

    return g


# ---------------------------------------------------------------- continuous layers: numpy and pure-Python versions
def drone_wind(n, seconds, rnd, seed_int, use_np):
    lfo = ctrl(lambda t: 0.75 + 0.25 * math.sin(TAU * 0.08 * t), seconds)
    wgain = ctrl(wind_gain_fn(rnd, seconds), seconds)
    if use_np:
        t = np.arange(n) / SR
        e = np.interp(t, np.arange(len(lfo)) / CTRL, lfo)
        drone = e * (np.sin(TAU * 55 * t) + np.sin(TAU * 58 * t) + 0.18 * np.sin(TAU * 110.7 * t))
        X = np.fft.rfft(np.random.default_rng(seed_int).standard_normal(n))
        f = np.fft.rfftfreq(n, 1 / SR)
        X *= np.abs(1 / (1 + 1j * f / 900) - 1 / (1 + 1j * f / 120))  # exact response of "LP900 - LP120"
        w = np.fft.irfft(X, n)
        w /= math.sqrt(float(np.mean(w * w))) or 1.0
        wind = w * np.interp(t, np.arange(len(wgain)) / CTRL, wgain)
        return drone, wind
    drone, w = [0.0] * n, [0.0] * n
    a_hi, a_lo = 1 - math.exp(-TAU * 900 / SR), 1 - math.exp(-TAU * 120 / SR)
    y1 = y2 = 0.0
    for i in range(n):
        t = i / SR
        drone[i] = env_at(lfo, i) * (math.sin(TAU * 55 * t) + math.sin(TAU * 58 * t) + 0.18 * math.sin(TAU * 110.7 * t))
        x = rnd.uniform(-1, 1)
        y1 += a_hi * (x - y1)
        y2 += a_lo * (x - y2)
        w[i] = y1 - y2
    rms = math.sqrt(sum(v * v for v in w) / n) or 1.0
    return drone, [w[i] / rms * env_at(wgain, i) for i in range(n)]


def put(buf, start_s, wave_, gain, use_np):
    i0 = int(round(start_s * SR))
    i1 = min(len(buf), i0 + len(wave_))
    if i0 < 0 or i0 >= i1:
        return
    if use_np:
        buf[i0:i1] += np.asarray(wave_[: i1 - i0]) * gain
    else:
        for k in range(i1 - i0):
            buf[i0 + k] += wave_[k] * gain


def beat_schedule(plan):
    """[(time, amp)] lub-dub pairs; 60 bpm, accelerating to 100 bpm over the last 45 % of the narration."""
    t0 = plan["intro"] + 1.0
    a0 = plan["intro"] + 0.55 * max(0.1, plan["nar_end"] - plan["intro"])
    a1 = max(a0 + 0.1, plan["nar_end"])
    t, out = t0, []
    while t < plan["seconds"] - 1.0:
        x = smooth((t - a0) / (a1 - a0))
        period = 60.0 / (60 + 40 * x)
        amp = 0.55 + 0.45 * x
        out += [(t, amp), (t + min(0.28, 0.32 * period), amp * 0.7)]
        t += period
    return out


def creak_times(plan, rnd):
    n = min(8, max(2, round(plan["seconds"] / 6)))
    lo, hi = plan["intro"] + 2.0, plan["seconds"] - 4.5
    avoid = [plan["intro"]] + plan["hits"]
    out, tries = [], 0
    while len(out) < n and tries < 400 and hi > lo:
        tries += 1
        t = rnd.uniform(lo, hi)
        if all(abs(t - o) >= 4.0 for o in out) and all(abs(t - h) >= 1.5 for h in avoid):
            out.append(t)
    return sorted(out)


# ---------------------------------------------------------------- main
def synthesize(a):
    plan = make_plan(a)
    use_np = np is not None and a.backend in ("auto", "numpy")
    if a.backend == "numpy" and np is None:
        raise Fail("--backend numpy requested but numpy is not installed")
    seconds = plan["seconds"]
    n = int(round(seconds * SR))
    rnd = random.Random(f"{a.part}-{a.seed}")  # every layout parameter comes from here (identical in both backends)
    seed_int = zlib.crc32(f"{a.part}-{a.seed}".encode())

    drone, wind = drone_wind(n, seconds, random.Random(f"{a.part}-{a.seed}-wind"), seed_int, use_np)
    buf = (drone * GAIN["drone"] + wind * GAIN["wind"]) if use_np else [drone[i] * GAIN["drone"] + wind[i] * GAIN["wind"] for i in range(n)]
    del drone, wind
    events = {"heart": 0, "creak": [], "hits": [], "riser": None}

    lub = thud()
    for t, amp in beat_schedule(plan):
        put(buf, t, lub, GAIN["heart"] * amp, use_np)
        events["heart"] += 1
    for t in creak_times(plan, rnd):
        put(buf, t, creak(rnd), GAIN["creak"], use_np)
        events["creak"].append(round(t, 2))
    if plan["intro"] >= 0.5 and not a.no_riser:
        put(buf, 0.0, riser(plan["intro"], random.Random(f"{a.part}-{a.seed}-riser")), GAIN["riser"], use_np)
        put(buf, plan["intro"], boom(random.Random(f"{a.part}-{a.seed}-boom")), GAIN["boom"], use_np)
        events["riser"] = round(plan["intro"], 2)
    if not a.no_hits:
        soft = thud(80.0, 30.0, 0.08, 0.7, 0.18)
        for t in plan["hits"]:
            put(buf, t, soft, GAIN["hit"], use_np)
            events["hits"].append(round(t, 2))

    # level: RMS target, then peak limit -3 dBFS, 20 ms edge fades
    rms = math.sqrt(float(np.mean(buf * buf)) if use_np else sum(v * v for v in buf) / n) or 1e-9
    peak = float(np.max(np.abs(buf))) if use_np else max(abs(v) for v in buf)
    g = 10 ** (a.level / 20) / rms
    limited = peak * g > 10 ** (-3 / 20)
    if limited:
        g = 10 ** (-3 / 20) / peak
    ef = int(0.02 * SR)
    if use_np:
        buf = buf * g
        buf[:ef] *= np.linspace(0, 1, ef)
        buf[-ef:] *= np.linspace(1, 0, ef)
        pcm = np.clip(np.round(buf * 32767), -32768, 32767).astype("<i2").tobytes()
        out_rms, out_peak = float(np.sqrt(np.mean(buf * buf))), float(np.max(np.abs(buf)))
    else:
        for i in range(ef):
            buf[i] *= i / ef
            buf[n - 1 - i] *= i / ef
        buf = [v * g for v in buf]
        import array
        arr = array.array("h", (max(-32768, min(32767, int(round(v * 32767)))) for v in buf))
        if sys.byteorder == "big":
            arr.byteswap()
        pcm = arr.tobytes()
        out_rms, out_peak = math.sqrt(sum(v * v for v in buf) / n), max(abs(v) for v in buf)

    out = Path(a.out)
    out = out if out.is_absolute() else HERE / out
    with wave.open(str(out), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm)
    print(f"[make_ambience] {out.name}: {seconds:.2f} s, {SR} Hz mono 16-bit, backend={'numpy' if use_np else 'python'}, part={a.part}")
    print(f"  heartbeat thuds: {events['heart']} (60 -> 100 bpm)   creaks at: {events['creak']}   scene hits at: {events['hits']}   riser/boom: {events['riser']}")
    print(f"  level: RMS {dbfs(out_rms):.1f} dBFS (target {a.level}), peak {dbfs(out_peak):.1f} dBFS" + ("  [peak-limited at -3 dBFS]" if limited else ""))
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description="Synthesize ambience.wav (drone + wind + heartbeat + creaks + riser)")
    ap.add_argument("--part", default="horror1")
    ap.add_argument("--seconds", default="auto", help="auto (= story length + 3 s) or a number of seconds")
    ap.add_argument("--data", default="story_data.json")
    ap.add_argument("--out", default="ambience.wav")
    ap.add_argument("--seed", default="a", help="any string; change it for a different noise/creak arrangement")
    ap.add_argument("--level", type=float, default=-20.0, help="target RMS in dBFS (default -20)")
    ap.add_argument("--backend", choices=["auto", "numpy", "python"], default="auto")
    ap.add_argument("--no-riser", action="store_true")
    ap.add_argument("--no-hits", action="store_true")
    a = ap.parse_args(argv)
    try:
        synthesize(a)
    except (Fail, OSError, ValueError, KeyError, json.JSONDecodeError) as e:
        print(f"[make_ambience] ERROR: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
