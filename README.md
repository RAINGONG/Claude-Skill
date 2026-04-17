# Claude Mem — Install Guide for Claude Code

## What is claude-mem?

**claude-mem** is a persistent memory plugin for Claude Code. It automatically captures what Claude does during your coding sessions, compresses it with AI, and injects relevant context back into future sessions — so Claude remembers your project decisions, patterns, and history.

Key features:
- Automatic capture of tool usage and AI-generated summaries
- Natural language search through project history
- All data stays on your local machine (SQLite)
- No separate API key needed — uses your existing Claude Code authentication

---

## Prerequisites

- **Node.js 18.0.0** or higher
- **Claude Code CLI** installed and authenticated (`claude` command available)

---

## Installation

### Recommended (Single Command)

```bash
npx claude-mem install
```

This registers the plugin hooks and starts the background worker service automatically.

### Alternative: Claude Code Plugin Marketplace

Inside Claude Code, run:

```
/plugin marketplace add thedotmack/claude-mem
/plugin install claude-mem
```

Then **restart Claude Code**.

> **Note:** Running `npm install -g claude-mem` alone is NOT sufficient — it installs the library only and does not register the hooks. Always use `npx claude-mem install` or the `/plugin` commands above.

---

## Verification

After restarting Claude Code, claude-mem hooks are active automatically. No additional configuration is required.

To confirm installation, check that the plugin appears in:

```
/plugin list
```

---

## Usage

Memory capture is fully automatic after installation. During each session, claude-mem records tool calls and observations and stores them locally.

You can search past memories directly from Claude Code:

- Ask Claude: "What did we decide about the database schema last session?"
- Use the MCP memory tools (if Claude Desktop is connected) to query past sessions

---

## Uninstall

```bash
npx claude-mem uninstall
```

---

## Resources

- GitHub: https://github.com/thedotmack/claude-mem
- Claude Code Docs: https://docs.anthropic.com/en/docs/claude-code
