#!/usr/bin/env python3
"""
Antigravity Lifecycle Hook: API & REST Guardrails
Enforces:
1. Standard REST input/output communication contracts between frontend and backend.
2. Generic ApiErrorDto wrapping for all errors (no raw unhandled exceptions or anonymous error objects).
3. Graceful frontend error handling via apiErrorInterceptor.
4. Continuous verification through unit and negative test validations.
"""

import sys
import json
import os
import re
import argparse
from pathlib import Path

def handle_pre_invocation(payload: dict) -> dict:
    """Inject guardrail guidelines before the model plans or acts."""
    reminder = (
        "[API & REST Guardrails Active]\n"
        "- REST Communication: Backend and frontend must strictly adhere to standard REST principles.\n"
        "- Generic Error DTO: Every error response must be wrapped in generic ApiErrorDto "
        "(error: string, code?: string, status?: int, details?: list[string]). Avoid anonymous error objects or raw exception strings.\n"
        "- Frontend Graceful Handling: Angular HTTP layer must normalize all errors via apiErrorInterceptor.\n"
        "- Negative & Unit Tests: Always verify error paths, status codes, and DTO contracts through unit tests and negative tests."
    )
    return {
        "injectSteps": [
            {
                "ephemeralMessage": reminder
            }
        ]
    }

def scan_file_for_anti_patterns(file_path: Path) -> list[str]:
    """Scan backend C# code for unformatted or raw anonymous error returns."""
    violations = []
    if not file_path.exists():
        return violations

    text = file_path.read_text(encoding="utf-8", errors="ignore")

    # Check for anonymous object returns in BadRequest/NotFound/Conflict: e.g. BadRequest(new { ... })
    anonymous_error_pattern = re.compile(r'(BadRequest|NotFound|Conflict)\s*\(\s*new\s*\{', re.MULTILINE)
    for match in anonymous_error_pattern.finditer(text):
        line_num = text.count('\n', 0, match.start()) + 1
        violations.append(
            f"{file_path.name}:{line_num} - Found anonymous object in {match.group(1)}(new {{...}}). Use ApiErrorDto instead."
        )

    # Check for raw string returns in StatusCode/ProblemDetails
    raw_string_error = re.compile(r'(BadRequest|NotFound|Conflict)\s*\(\s*"[^"]+"\s*\)', re.MULTILINE)
    for match in raw_string_error.finditer(text):
        line_num = text.count('\n', 0, match.start()) + 1
        violations.append(
            f"{file_path.name}:{line_num} - Found raw string in {match.group(1)}(\"...\"). Wrap error in ApiErrorDto."
        )

    return violations

def handle_post_tool_use(payload: dict) -> dict:
    """Inspect edited files after tool call to warn about REST and DTO violations."""
    tool_call = payload.get("toolCall", {})
    tool_name = tool_call.get("name", "")
    tool_args = tool_call.get("args", {})

    target_file = tool_args.get("TargetFile") or tool_args.get("target_file")
    if target_file and target_file.endswith(".cs") and "Controllers" in target_file:
        file_path = Path(target_file)
        violations = scan_file_for_anti_patterns(file_path)
        if violations:
            sys.stderr.write("\n[API Guardrails Warning] Potential error DTO violations detected:\n")
            for v in violations:
                sys.stderr.write(f"  - {v}\n")
            sys.stderr.flush()

    return {}

def handle_stop(payload: dict) -> dict:
    """Validate that repository adheres to error DTO guardrails before stopping."""
    workspace_paths = payload.get("workspacePaths", [])
    if workspace_paths and Path(workspace_paths[0]).exists():
        root = Path(workspace_paths[0])
    else:
        cwd = Path.cwd()
        root = cwd.parent if cwd.name in (".agents", "hooks") else cwd

    controllers_dir = root / "backend" / "src" / "InvoiceApp.Api" / "Controllers"
    all_violations = []

    if controllers_dir.exists():
        for cs_file in controllers_dir.glob("*.cs"):
            violations = scan_file_for_anti_patterns(cs_file)
            all_violations.extend(violations)

    if all_violations:
        reason_msg = (
            "API Guardrails check failed before stop:\n"
            + "\n".join(f"  * {v}" for v in all_violations[:5])
            + "\nEnsure all backend errors are wrapped in ApiErrorDto and verified with negative tests."
        )
        return {
            "decision": "continue",
            "reason": reason_msg
        }

    return {"decision": ""}

def main():
    parser = argparse.ArgumentParser(description="Antigravity API & REST Guardrails Hook")
    parser.add_argument("--event", choices=["PreInvocation", "PostToolUse", "Stop"], default="PreInvocation")
    args = parser.parse_args()

    try:
        raw_input = sys.stdin.read()
        payload = json.loads(raw_input) if raw_input.strip() else {}
    except Exception as e:
        sys.stderr.write(f"[api-guardrails-hook] Error parsing stdin JSON: {e}\n")
        payload = {}

    if args.event == "PreInvocation":
        response = handle_pre_invocation(payload)
    elif args.event == "PostToolUse":
        response = handle_post_tool_use(payload)
    elif args.event == "Stop":
        response = handle_stop(payload)
    else:
        response = {}

    json.dump(response, sys.stdout)
    sys.stdout.write("\n")
    sys.stdout.flush()

if __name__ == "__main__":
    main()
