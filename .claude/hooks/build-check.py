#!/usr/bin/env python3
"""
Hook: PostToolUse Write|Edit — Generic .NET build checker

Runs `dotnet build --no-restore -q` on the .csproj that contains the
edited .cs file. Injects compiler errors as additionalContext so Claude
sees them immediately without running a separate build command.
Silently exits (no output) when there are no errors or the file is not C#.
"""

import sys
import json
import re
import subprocess
from pathlib import Path


def find_csproj(file_path: Path) -> tuple[Path | None, str | None]:
    """Walk up from the edited file to find the nearest containing .csproj."""
    for parent in file_path.parents:
        csproj_files = list(parent.glob("*.csproj"))
        if csproj_files:
            return csproj_files[0], parent.name
    return None, None


def find_solution_root(file_path: Path) -> Path | None:
    """Walk up to find the directory containing a .sln file."""
    for parent in file_path.parents:
        if list(parent.glob("*.sln")):
            return parent
    return None


def main() -> None:
    try:
        data = json.load(sys.stdin)
    except Exception:
        return

    raw_path = data.get("tool_input", {}).get("file_path", "")
    if not raw_path or not raw_path.endswith(".cs"):
        return

    file_path = Path(raw_path.replace("\\", "/"))
    csproj, layer_name = find_csproj(file_path)
    if not csproj:
        return

    solution_root = find_solution_root(file_path) or csproj.parent

    result = subprocess.run(
        ["dotnet", "build", str(csproj), "--no-restore", "-q"],
        capture_output=True,
        text=True,
        cwd=str(solution_root),
    )

    combined = result.stdout + result.stderr
    errors = [
        line for line in combined.splitlines()
        if re.search(r": error CS\d+:", line)
    ]

    if errors:
        msg = "\n".join(errors[:3])
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": f"Build errors in {layer_name} after edit:\n{msg}",
            }
        }))


if __name__ == "__main__":
    main()
