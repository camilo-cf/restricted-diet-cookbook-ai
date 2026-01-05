# Model Context Protocol (MCP) Integration

> **Note**: This project utilizes a **Simulated MCP-Style Workflow**.

## Architecture
While this project does not host a standalone MCP server process, it was built by an Agent (Antigravity) operating under the core principles of MCP:
1.  **Host**: The Application Monorepo.
2.  **Client**: The AI Agent.
3.  **Tools**: The Agent used discrete, server-like tools to interact with the environment.

## Simulated Tools
The following interactions mimic standard MCP tools:

| Domain | Simulated Tool | Function |
|---|---|---|
| **Filesystem** | `read_file`, `write_file` | Reading `task.md`, editing source code. |
| **Shell** | `run_command` | Executing `docker compose`, `pnpm install`, `git`. |
| **Browser** | `browser_action` | Running Playwright E2E tests to "see" the app. |
| **Search** | `grep_search` | Finding symbols and references in the codebase. |

## Configuration
If we were to formalize this repo as an MCP Server, the configuration would look like this:

### `mcp/config.json`
```json
{
  "mcpServers": {
    "cookbok-ai": {
      "command": "uvicorn",
      "args": ["app.main:app", "--port", "8000"],
      "env": {
        "DATABASE_URL": "postgresql://user:pass@localhost:5432/db"
      }
    }
  }
}
```

## Usage
In a real MCP setup, an LLM would connect to this server and call:
- `get_recipe(ingredients=["egg"])`
- `list_restrictions()`

For this project, the **Agent acted as the bridge**, manually invoking these logical steps via the CLI and code edits.
