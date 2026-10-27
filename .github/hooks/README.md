# AI interaction logging

This workspace hook requires Node.js and a trusted workspace. Start a new
Copilot agent chat after adding the hook. In VS Code, open `/hooks` to confirm
that `UserPromptSubmit` and `Stop` are loaded. Older Local sessions also require
the `chat.useHooks` setting to be enabled. Organization policy can disable hooks.

The hook appends UTF-8 JSON Lines to `.ai-logs/ai-interactions.log`:

- `prompt` records contain the submitted prompt.
- `output` records contain a complete conversation transcript snapshot when the
  agent finishes a turn, including assistant output and any tool content exposed
  by the runtime. Earlier messages can therefore appear in multiple snapshots.
- Each record includes a UTC timestamp and the session ID when available.

The runtime's transcript format is not a stable API, so the hook preserves it
verbatim in `content` rather than attempting to extract assistant messages.
It does not capture hidden model reasoning, other AI applications, or past chats.
Missing or unreadable transcripts produce a hook warning, not a fabricated output
record. Logging failures do not deliberately block or restart the agent.

Logs stay on this machine and are ignored by Git. They are **not redacted or
encrypted** and can contain credentials, customer data, source code, and tool
results. Restrict access and delete them when no longer needed. There is no
automatic retention limit. Set `COPILOT_INTERACTION_LOG_DIR` in the hook process
environment to change the destination, and protect that location separately.

To disable logging, remove the two event entries from
`log-ai-interactions.json` and start a new chat. Verify live activation by sending
a non-sensitive prompt in a new agent chat and checking for both record types.