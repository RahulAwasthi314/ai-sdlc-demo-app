#!/usr/bin/env python3
"""
Antigravity Lifecycle Hook: AI Interaction Logger
Logs User input and LLM output to .ai-logs/ upon turn completion (Stop event).
"""

import sys
import json
import os
import re
from pathlib import Path
from datetime import datetime, timezone

def clean_user_message(raw_text: str) -> str:
    """Extract clean user request text, stripping internal metadata tags."""
    if not raw_text:
        return ""
    match = re.search(r'<USER_REQUEST>\s*(.*?)\s*</USER_REQUEST>', raw_text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return raw_text.strip()

def get_transcript_file(transcript_path_str: str) -> Path | None:
    """Find transcript_full.jsonl or fallback to transcript.jsonl."""
    if not transcript_path_str:
        return None
    
    path = Path(transcript_path_str)
    if not path.exists():
        return None
        
    full_path = path.parent / "transcript_full.jsonl"
    if full_path.exists():
        return full_path
    return path

def main():
    try:
        raw_input = sys.stdin.read()
        payload = json.loads(raw_input) if raw_input.strip() else {}
    except Exception as e:
        sys.stderr.write(f"[interaction-logger] Error reading stdin: {e}\n")
        json.dump({"decision": ""}, sys.stdout)
        sys.stdout.flush()
        return

    conversation_id = payload.get("conversationId", "unknown_session")
    transcript_path_str = payload.get("transcriptPath", "")
    workspace_paths = payload.get("workspacePaths", [])

    # Determine project root and log directory
    if workspace_paths and len(workspace_paths) > 0 and Path(workspace_paths[0]).exists():
        project_root = Path(workspace_paths[0])
    else:
        cwd = Path.cwd()
        project_root = cwd.parent if cwd.name in (".agents", "hooks") else cwd

    env_log_dir = os.environ.get("AI_LOG_DIR") or os.environ.get("COPILOT_INTERACTION_LOG_DIR")
    if env_log_dir:
        log_dir = Path(env_log_dir)
    else:
        log_dir = project_root / ".ai-logs"

    log_dir.mkdir(parents=True, exist_ok=True)
    readable_log_file = log_dir / "ai-interactions.log"
    jsonl_log_file = log_dir / "ai-interactions.jsonl"
    state_file = log_dir / ".log_checkpoint.json"

    # Load existing checkpoint
    checkpoints = {}
    if state_file.exists():
        try:
            with open(state_file, "r", encoding="utf-8") as sf:
                checkpoints = json.load(sf)
        except Exception:
            checkpoints = {}

    last_logged_step = checkpoints.get(conversation_id, -1)
    max_step_seen = last_logged_step

    transcript_file = get_transcript_file(transcript_path_str)
    if transcript_file and transcript_file.exists():
        new_entries = []
        try:
            with open(transcript_file, "r", encoding="utf-8", errors="replace") as tf:
                for line in tf:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        step_data = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    step_idx = step_data.get("step_index", -1)
                    if step_idx <= last_logged_step:
                        continue

                    step_type = step_data.get("type")
                    content = step_data.get("content")
                    created_at = step_data.get("created_at", datetime.now(timezone.utc).isoformat())

                    if step_type == "USER_INPUT" and content:
                        clean_msg = clean_user_message(content)
                        if clean_msg:
                            new_entries.append({
                                "role": "USER",
                                "timestamp": created_at,
                                "step_index": step_idx,
                                "content": clean_msg
                            })

                    elif step_type == "PLANNER_RESPONSE" and content:
                        new_entries.append({
                            "role": "ASSISTANT",
                            "timestamp": created_at,
                            "step_index": step_idx,
                            "content": content.strip()
                        })

                    if step_idx > max_step_seen:
                        max_step_seen = step_idx

            if new_entries:
                # 1. Append to human-readable log
                with open(readable_log_file, "a", encoding="utf-8") as lf:
                    for entry in new_entries:
                        divider = "=" * 80
                        header = f"[{entry['timestamp']}] [{entry['role']}] (Step {entry['step_index']}, Session: {conversation_id})"
                        lf.write(f"\n{divider}\n{header}\n{'-' * 80}\n{entry['content']}\n")

                # 2. Append to JSON Lines log
                with open(jsonl_log_file, "a", encoding="utf-8") as jf:
                    for entry in new_entries:
                        record = {
                            "timestamp": entry["timestamp"],
                            "sessionId": conversation_id,
                            "stepIndex": entry["step_index"],
                            "role": entry["role"],
                            "content": entry["content"]
                        }
                        jf.write(json.dumps(record, ensure_ascii=False) + "\n")

                # 3. Update checkpoint
                checkpoints[conversation_id] = max_step_seen
                with open(state_file, "w", encoding="utf-8") as sf:
                    json.dump(checkpoints, sf, indent=2)

        except Exception as e:
            sys.stderr.write(f"[interaction-logger] Error processing transcript: {e}\n")

    # Output valid Stop response to Antigravity runtime
    json.dump({"decision": ""}, sys.stdout)
    sys.stdout.flush()

if __name__ == "__main__":
    main()
