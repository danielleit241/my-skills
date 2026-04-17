#!/usr/bin/env python3
"""
Hook: PostToolUse Write|Edit
Runs `dotnet build --no-restore -q` on the affected ResearchHub project layer
when a .cs file is written/edited. Injects build errors as additionalContext
so Claude sees them immediately without running a separate build command.
Silently exits (no output) when there are no errors.
"""
import sys
import json
import re
import subprocess
from pathlib import Path

# Map source folder → csproj path (relative to ROOT)
LAYER_MAP = {
    "ResearchHub.Api":           "src/ResearchHub.Api/ResearchHub.Api.csproj",
    "ResearchHub.Application":   "src/ResearchHub.Application/ResearchHub.Application.csproj",
    "ResearchHub.Infrastructure": "src/ResearchHub.Infrastructure/ResearchHub.Infrastructure.csproj",
    "ResearchHub.Domain":        "src/ResearchHub.Domain/ResearchHub.Domain.csproj",
    "ResearchHub.Common":        "src/ResearchHub.Common/ResearchHub.Common.csproj",
    "ResearchHub.Application.Tests": "tests/ResearchHub.Application.Tests/ResearchHub.Application.Tests.csproj",
    "ResearchHub.IntegrationTests":  "tests/ResearchHub.IntegrationTests/ResearchHub.IntegrationTests.csproj",
    "ResearchHub.Testing.Common":    "tests/ResearchHub.Testing.Common/ResearchHub.Testing.Common.csproj",
}



def resolve_root() -> Path:
    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / "ResearchHub.sln").exists():
            return parent

    return current.parents[2]


ROOT = resolve_root()


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    file_path = data.get("tool_input", {}).get("file_path", "")
    if not file_path.endswith(".cs"):
        sys.exit(0)

    normalized_file_path = file_path.replace("\\", "/")

    # Determine which project layer was edited
    proj_path = None
    layer_name = None
    for layer, csproj in LAYER_MAP.items():
        if layer in normalized_file_path:
            proj_path = ROOT / csproj
            layer_name = layer
            break

    if not proj_path:
        sys.exit(0)

    result = subprocess.run(
        ["dotnet", "build", str(proj_path), "--no-restore", "-q"],
        capture_output=True,
        text=True,
        cwd=str(ROOT),
    )

    combined = result.stdout + result.stderr
    # Only real C# compiler errors (CS####), not MSBuild informational messages
    errors = [line for line in combined.splitlines() if re.search(r": error CS\d+:", line)]

    if errors:
        msg = "\n".join(errors[:3])
        out = {
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": f"Build errors in {layer_name} after edit:\n{msg}",
            }
        }
        print(json.dumps(out))


if __name__ == "__main__":
    main()
