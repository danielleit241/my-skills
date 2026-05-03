#!/usr/bin/env python3
"""
Benchmark coding levels 0-5 vs. no-level baseline using the Claude Code CLI.
No API key required — uses existing Claude Code OAuth session.

Usage:
    python benchmarks/coding_level_benchmark.py
    python benchmarks/coding_level_benchmark.py --prompt "How does JWT work?"
    python benchmarks/coding_level_benchmark.py --levels 0 3 5
    python benchmarks/coding_level_benchmark.py --model claude-haiku-4-5-20251001
    python benchmarks/coding_level_benchmark.py --no-baseline
    python benchmarks/coding_level_benchmark.py --show-responses
    python benchmarks/coding_level_benchmark.py --save benchmarks/report.md
"""
import argparse
import json
import os
import subprocess
import sys
import textwrap
import time
from pathlib import Path

LEVELS_DIR = Path(__file__).parent.parent / ".claude" / "coding-levels"
LEVEL_FILES = {
    0: "0-eli5.md",
    1: "1-junior.md",
    2: "2-midlevel.md",
    3: "3-senior.md",
    4: "4-techlead.md",
    5: "5-godmode.md",
}
LEVEL_NAMES = {
    -1: "Baseline (no level)",
    0: "ELI5",
    1: "Junior",
    2: "Mid-level",
    3: "Senior",
    4: "Tech Lead",
    5: "God Mode",
}
LEVEL_DESCRIPTIONS = {
    -1: "No coding level — raw Claude Code defaults",
    0: "No assumed knowledge, analogies, step-by-step",
    1: "Explains WHY, mentor tone, encourages learning",
    2: "Design patterns, brief trade-off notes",
    3: "Trade-offs and architecture first, terse",
    4: "Risk analysis, business impact, ops implications",
    5: "Zero hand-holding, code-first, max terse",
}

DEFAULT_PROMPT = "Explain how database indexing works and when to use composite indexes."
DEFAULT_MODEL = "claude-sonnet-4-6"


def _lvl_label(level: int) -> str:
    return "BASE" if level == -1 else f"L{level}"


def _output_delta(r: dict, baseline: dict | None) -> str:
    if baseline is None or r["level"] == -1:
        return ""
    d = r["output_tokens"] - baseline["output_tokens"]
    return f"{d:+d}"


def load_system_prompt(level: int) -> str | None:
    if level == -1:
        return None
    path = LEVELS_DIR / LEVEL_FILES[level]
    try:
        return path.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        raise FileNotFoundError(f"Level file not found: {path}") from None


def run_level(level: int, prompt: str, model: str) -> dict:
    system_prompt = load_system_prompt(level)
    system_words = len(system_prompt.split()) if system_prompt else 0

    cmd = [
        "claude", "-p", prompt,
        "--output-format", "json",
        "--model", model,
        "--no-session-persistence",
    ]
    if system_prompt:
        cmd += ["--append-system-prompt", system_prompt]

    env = {**os.environ, "BENCHMARK_MODE": "1"}
    start = time.perf_counter()
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", env=env)
    elapsed = round(time.perf_counter() - start, 2)

    # CLI writes JSON to stderr when there are warnings; stdout is the JSON result
    raw = result.stdout.strip() or result.stderr.strip()
    data = json.loads(raw)

    if data.get("is_error") and not data.get("result"):
        raise RuntimeError(data.get("result", "CLI error"))

    text = data.get("result", "")
    usage = data.get("usage", {})
    input_tokens = usage.get("input_tokens", 0)
    output_tokens = usage.get("output_tokens", 0)
    cache_read = usage.get("cache_read_input_tokens", 0)
    cache_create = usage.get("cache_creation_input_tokens", 0)
    total_cost = data.get("total_cost_usd", 0.0)

    sentence_count = sum(1 for s in text.replace("\n", " ").split(".") if s.strip())
    has_code = "```" in text
    has_bullets = any(line.lstrip().startswith(("-", "*", "•")) for line in text.splitlines())

    return {
        "level": level,
        "name": LEVEL_NAMES[level],
        "description": LEVEL_DESCRIPTIONS[level],
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "cache_read": cache_read,
        "cache_create": cache_create,
        "system_words": system_words,
        "response_chars": len(text),
        "response_words": len(text.split()),
        "response_sentences": sentence_count,
        "has_code": has_code,
        "has_bullets": has_bullets,
        "elapsed_s": elapsed,
        "total_cost_usd": total_cost,
        "response_text": text,
        "system_prompt": system_prompt or "",
    }


def verbosity_bar(words: int, max_words: int, width: int = 20) -> str:
    filled = round(words / max_words * width) if max_words else 0
    return "█" * filled + "░" * (width - filled)


def print_token_table(results: list[dict], baseline: dict | None) -> None:
    print(f"\n{'Lvl':<4} {'Name':<18} {'Sys wds':>8} {'In tok':>8} {'Out tok':>8} {'Δ base':<8} {'Cache↑':>8} {'Cost':>10} {'Time':>7}")
    print("─" * 86)
    for r in results:
        raw_delta = _output_delta(r, baseline)
        delta = f"({raw_delta})" if raw_delta else ""
        print(
            f"{_lvl_label(r['level']):<4} {r['name']:<18} {r['system_words']:>8} {r['input_tokens']:>8} "
            f"{r['output_tokens']:>8} {delta:<8} {r['cache_read']:>8} ${r['total_cost_usd']:>8.5f} {r['elapsed_s']:>6.1f}s"
        )


def print_verbosity_table(results: list[dict]) -> None:
    max_words = max(r["response_words"] for r in results)
    print(f"\n{'Lvl':<4} {'Name':<18} {'Words':>6} {'Verbosity':<24} {'Code':>5} {'Bullets':>8}")
    print("─" * 70)
    for r in results:
        bar = verbosity_bar(r["response_words"], max_words)
        print(
            f"{_lvl_label(r['level']):<4} {r['name']:<18} {r['response_words']:>6} {bar:<24} "
            f"{'✓' if r['has_code'] else '✗':>5} {'✓' if r['has_bullets'] else '✗':>8}"
        )


def print_responses(results: list[dict], wrap: int = 100) -> None:
    for r in results:
        print(f"\n{'=' * 80}")
        print(f"Level {_lvl_label(r['level'])} — {r['name']}")
        print(f"  {r['description']}")
        print(f"  {r['output_tokens']} output tokens · {r['response_words']} words · ${r['total_cost_usd']:.5f}")
        print("─" * 80)
        for line in r["response_text"].splitlines():
            print(line if len(line) <= wrap else textwrap.fill(line, width=wrap))


def save_markdown_report(results: list[dict], baseline: dict | None, prompt: str, model: str, output_path: str) -> None:
    lines = [
        "# Coding Level Benchmark Report",
        f"\n**Model:** `{model}`",
        f"**Prompt:** {prompt}",
        "",
        "## Token & Cost Summary",
        "",
        "| Lvl | Name | Sys words | Input tok | Output tok | Δ vs baseline | Cache↑ | Cost |",
        "|-----|------|-----------|-----------|------------|---------------|--------|------|",
    ]
    for r in results:
        lines.append(
            f"| {_lvl_label(r['level'])} | {r['name']} | {r['system_words']} | {r['input_tokens']} | "
            f"{r['output_tokens']} | {_output_delta(r, baseline)} | {r['cache_read']} | ${r['total_cost_usd']:.5f} |"
        )

    lines += [
        "",
        "## Verbosity Summary",
        "",
        "| Lvl | Name | Words | Sentences | Code | Bullets |",
        "|-----|------|-------|-----------|------|---------|",
    ]
    for r in results:
        lines.append(
            f"| {_lvl_label(r['level'])} | {r['name']} | {r['response_words']} | {r['response_sentences']} | "
            f"{'✓' if r['has_code'] else '✗'} | {'✓' if r['has_bullets'] else '✗'} |"
        )

    lines += ["", "## Full Responses", ""]
    for r in results:
        lvl_full = "Baseline" if r["level"] == -1 else f"Level {r['level']}"
        lines += [
            f"### {lvl_full} — {r['name']}",
            f"> *{r['description']}*",
            f"> {r['output_tokens']} output tokens · {r['response_words']} words · ${r['total_cost_usd']:.5f}",
            "",
            r["response_text"],
            "",
        ]

    Path(output_path).write_text("\n".join(lines), encoding="utf-8")
    print(f"\nReport saved → {output_path}")


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(description="Benchmark coding levels 0-5 via Claude Code CLI (no API key needed)")
    parser.add_argument("--prompt", default=DEFAULT_PROMPT, help="Test prompt")
    parser.add_argument("--levels", nargs="+", type=int, default=list(range(6)), help="Levels to test (default: 0-5)")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Claude model ID")
    parser.add_argument("--no-baseline", action="store_true", help="Skip baseline run")
    parser.add_argument("--show-responses", action="store_true", help="Print full responses")
    parser.add_argument("--save", metavar="FILE", help="Save markdown report to file")
    parser.add_argument("--delay", type=float, default=2.0, help="Seconds between calls")
    args = parser.parse_args()

    run_queue = ([-1] if not args.no_baseline else []) + sorted(set(args.levels))

    print(f"Model  : {args.model}")
    print(f"Prompt : {args.prompt[:100]}{'...' if len(args.prompt) > 100 else ''}")
    print(f"Runs   : {[_lvl_label(l) for l in run_queue]}")

    results: list[dict] = []
    for i, level in enumerate(run_queue):
        label = "baseline" if level == -1 else f"level {level} ({LEVEL_NAMES[level]})"
        print(f"\n[{i+1}/{len(run_queue)}] Running {label}...", end=" ", flush=True)
        try:
            r = run_level(level, args.prompt, args.model)
            results.append(r)
            print(f"in={r['input_tokens']} out={r['output_tokens']} words={r['response_words']} ({r['elapsed_s']}s)")
        except Exception as e:
            print(f"FAILED: {e}")
        if i < len(run_queue) - 1:
            time.sleep(args.delay)

    if not results:
        raise SystemExit("No results collected — all runs failed.")

    baseline = next((r for r in results if r["level"] == -1), None)

    print("\n" + "=" * 86)
    print("TOKEN & COST TABLE")
    print_token_table(results, baseline)

    print("\n" + "=" * 86)
    print("VERBOSITY TABLE")
    print_verbosity_table(results)

    if args.show_responses:
        print("\n" + "=" * 86)
        print("FULL RESPONSES")
        print_responses(results)

    if args.save:
        save_markdown_report(results, baseline, args.prompt, args.model, args.save)


if __name__ == "__main__":
    main()
