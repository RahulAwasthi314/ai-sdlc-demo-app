#!/usr/bin/env python3
"""
Antigravity Lifecycle Hook: Stryker Post-Commit Gate
Fires after every git commit to run dotnet Stryker mutation testing against changed domain logic.
Validates against the constitutional 80% mutation score threshold.
"""

import sys
import json
import os
import re
import subprocess
import argparse
from pathlib import Path

def get_repo_root() -> Path:
    """Find repository root from current script location."""
    current = Path(__file__).resolve().parent
    while current != current.parent:
        if (current / ".git").exists():
            return current
        current = current.parent
    return Path.cwd()

def handle_pre_invocation(payload: dict) -> dict:
    """Inject mutation gate reminder before model actions."""
    reminder = (
        "[Stryker Mutation Post-Commit Gate Active]\n"
        "- Quality Gate: Every git commit triggers dotnet Stryker mutation testing against changed files.\n"
        "- Minimum Score: 80.00% mutation score required by project constitution.\n"
        "- Actionable Mutants: Any surviving mutants in modified files must be killed with unit tests."
    )
    return {
        "injectSteps": [
            {
                "ephemeralMessage": reminder
            }
        ]
    }

def handle_post_tool_use(payload: dict) -> dict:
    """Detect git commit tool executions and trigger Stryker mutation testing."""
    # Check if tool had errors
    if payload.get("error"):
        return {}

    tool_call = payload.get("toolCall", {})
    tool_name = tool_call.get("name", "")
    tool_args = tool_call.get("args", {})

    # Only inspect run_command
    if tool_name != "run_command":
        return {}

    cmd_line = tool_args.get("CommandLine", "")
    if not cmd_line:
        return {}

    # Check for git commit execution
    is_git_commit = bool(re.search(r'\bgit\s+commit\b', cmd_line, re.IGNORECASE))
    if not is_git_commit:
        return {}

    repo_root = get_repo_root()
    gate_script = repo_root / ".agents" / "skills" / "stryker-mutation" / "scripts" / "run-stryker-gate.ps1"

    if not gate_script.exists():
        sys.stderr.write(f"[StrykerHook] Gate script not found at {gate_script}\n")
        return {}

    sys.stderr.write("\n======================================================\n")
    sys.stderr.write("[StrykerHook] Git commit detected! Executing mutation gate...\n")
    sys.stderr.write("======================================================\n")

    # Run Stryker gate script with -Since HEAD~1 (differential against previous commit)
    ps_cmd = [
        "powershell.exe",
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", str(gate_script),
        "-Since", "HEAD~1"
    ]

    try:
        process = subprocess.Popen(
            ps_cmd,
            cwd=str(repo_root),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace"
        )

        for line in process.stdout:
            sys.stderr.write(line)

        process.wait()

        if process.returncode == 0:
            sys.stderr.write("\n[StrykerHook] Gate PASSED: Commit satisfies 80% mutation score.\n")
        else:
            sys.stderr.write("\n[StrykerHook] Gate FAILED: Score below 80%. Additional unit tests required.\n")

    except Exception as ex:
        sys.stderr.write(f"[StrykerHook] Failed to execute Stryker gate: {ex}\n")

    # PostToolUse contract expects empty JSON object
    return {}

def main():
    parser = argparse.ArgumentParser(description="Stryker Post-Commit Gate Hook")
    parser.add_argument("--event", choices=["PreInvocation", "PostToolUse"], default="PostToolUse")
    parser.add_argument("--test-run", action="store_true", help="Simulate git commit hook execution")
    args = parser.parse_args()

    if args.test_run:
        fake_payload = {
            "toolCall": {
                "name": "run_command",
                "args": {
                    "CommandLine": "git commit -m 'test commit'"
                }
            }
        }
        res = handle_post_tool_use(fake_payload)
        print(json.dumps(res))
        return

    # Read stdin JSON payload from Antigravity lifecycle
    raw_input = sys.stdin.read().strip()
    payload = json.loads(raw_input) if raw_input else {}

    if args.event == "PreInvocation":
        output = handle_pre_invocation(payload)
    elif args.event == "PostToolUse":
        output = handle_post_tool_use(payload)
    else:
        output = {}

    print(json.dumps(output))

if __name__ == "__main__":
    main()
