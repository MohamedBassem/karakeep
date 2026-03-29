# Karakeep CLI Skill

## What is Karakeep?

Karakeep is an open-source, self-hosted "Bookmark Everything" application that uses AI to automatically tag and organize content. It supports saving links, text notes, images, and PDFs with full-text search, AI-powered tagging/summarization, and powerful organization features (lists, tags, highlights).

The name comes from Arabic "karakeeb" meaning miscellaneous clutter - a digital space for items you don't want to throw away.

## CLI Overview

The Karakeep CLI (`@karakeep/cli`) provides full command-line control over a Karakeep server. It connects via the tRPC API using Bearer token authentication.

## Installation

**NPM (recommended):**
```bash
npm install -g @karakeep/cli
```

**Docker:**
```bash
docker run --rm ghcr.io/karakeep-app/karakeep-cli:release --help
```

## Configuration

The CLI requires two settings, provided as flags or environment variables:

| Flag | Env Variable | Description |
|------|-------------|-------------|
| `--api-key <key>` | `KARAKEEP_API_KEY` | API key for authentication |
| `--server-addr <addr>` | `KARAKEEP_SERVER_ADDR` | Server base URL |

**Additional global flags:**
- `--json` - Output results as JSON
- `--version` - Display CLI version

**Obtaining an API key:** Generate one from the Karakeep web UI under Settings. Validate with:
```bash
karakeep --api-key <key> --server-addr <addr> whoami
```

## Commands Reference

### `whoami`
Returns info about the authenticated user (ID, name, email).
```bash
karakeep whoami
```

---

### `bookmarks`

**`bookmarks add`** - Create new bookmarks.
```bash
karakeep bookmarks add --link https://example.com
karakeep bookmarks add --note "My note text"
karakeep bookmarks add --link https://example.com --tag-name "reading" --tag-name "tech"
karakeep bookmarks add --link https://example.com --list-id <list-id> --title "Custom Title"
echo "Note from stdin" | karakeep bookmarks add --stdin
```
Options: `--link <url>` (repeatable), `--note <text>` (repeatable), `--stdin`, `--list-id <id>`, `--tag-name <tag>` (repeatable), `--title <title>`

**`bookmarks get <id>`** - Fetch a bookmark.
```bash
karakeep bookmarks get <id>
karakeep bookmarks get <id> --include-content
```

**`bookmarks update <id>`** - Update bookmark properties.
```bash
karakeep bookmarks update <id> --title "New Title"
karakeep bookmarks update <id> --archive
karakeep bookmarks update <id> --favourite
karakeep bookmarks update <id> --no-archive --no-favourite
```
Options: `--title`, `--note`, `--archive`/`--no-archive`, `--favourite`/`--no-favourite`

**`bookmarks update-tags <id>`** - Add or remove tags.
```bash
karakeep bookmarks update-tags <id> --add-tag "important" --remove-tag "old-tag"
```

**`bookmarks list`** - List all bookmarks (auto-paginates).
```bash
karakeep bookmarks list
karakeep bookmarks list --include-archived --include-content
karakeep bookmarks list --list-id <id>
```

**`bookmarks search <query>`** - Search bookmarks.
```bash
karakeep bookmarks search "my query"
karakeep bookmarks search "#tag-name" --all
karakeep bookmarks search "is:fav" --sort-order desc --limit 10
```
Options: `--limit <n>` (default 50), `--sort-order <relevance|asc|desc>`, `--include-content`, `--all`

**`bookmarks delete <id>`** - Delete a bookmark.

---

### `lists`

**`lists list`** - List all lists (shows hierarchy with parent relationships).

**`lists get`** - Get bookmarks in a list.
```bash
karakeep lists get --list <id>
karakeep lists get --list <id> --include-content
```

**`lists add-bookmark`** - Add a bookmark to a list.
```bash
karakeep lists add-bookmark --list <list-id> --bookmark <bookmark-id>
```

**`lists remove-bookmark`** - Remove a bookmark from a list.
```bash
karakeep lists remove-bookmark --list <list-id> --bookmark <bookmark-id>
```

**`lists delete <id>`** - Delete a list.

---

### `tags`

**`tags list`** - List all tags with bookmark counts (sorted by count descending).

**`tags delete <id>`** - Delete a tag.

---

### `admin`

Admin commands for server management.

**User management:**
```bash
karakeep admin users list
```

**Bookmark debugging and re-processing:**
```bash
karakeep admin bookmarks debug <id>
karakeep admin bookmarks recrawl <id>
karakeep admin bookmarks reindex <id>
karakeep admin bookmarks retag <id>
karakeep admin bookmarks resummarize <id>
```

**Bulk job operations:**
```bash
karakeep admin jobs stats
karakeep admin jobs recrawl-links --status <success|failure|pending|all> [--run-inference]
karakeep admin jobs reindex-all
karakeep admin jobs retag-all --status <success|failure|pending|all>
karakeep admin jobs resummarize-all --status <success|failure|pending|all>
karakeep admin jobs reprocess-assets
```

---

### `migrate`

Migrate data between Karakeep servers.
```bash
karakeep migrate --dest-server <url> --dest-api-key <key>
karakeep migrate --dest-server <url> --dest-api-key <key> -y --exclude-assets
```
Exclusion flags: `--exclude-assets`, `--exclude-lists`, `--exclude-ai-prompts`, `--exclude-rules`, `--exclude-feeds`, `--exclude-webhooks`, `--exclude-bookmarks`, `--exclude-tags`, `--exclude-user-settings`
Other options: `-y` (skip confirmation), `--batch-size <n>` (max 500, default 50)

---

### `dump`

Export all account data to a tar.gz archive.
```bash
karakeep dump
karakeep dump --output backup.tar.gz --exclude-assets
```
Exclusion flags: `--exclude-assets`, `--exclude-bookmarks`, `--exclude-lists`, `--exclude-tags`, `--exclude-ai-prompts`, `--exclude-rules`, `--exclude-feeds`, `--exclude-webhooks`, `--exclude-user-settings`, `--exclude-link-content`
Other options: `--output <file>`, `--batch-size <n>`

Archive structure: `manifest.json`, `users/settings.json`, `lists/`, `tags/`, `rules/`, `feeds/`, `prompts/`, `webhooks/`, `bookmarks/index.jsonl`, `assets/`

---

### `wipe`

Permanently delete all user data from the server.
```bash
karakeep wipe
karakeep wipe -y --exclude-bookmarks --exclude-lists
```
Same exclusion flags as `migrate`. Deletion order: rules, feeds, webhooks, prompts, bookmarks, lists (deepest first), unused tags.

## Search Query Language

When using `bookmarks search`, these qualifiers are supported:

| Qualifier | Example | Description |
|-----------|---------|-------------|
| `is:` | `is:fav`, `is:archived`, `is:tagged`, `is:link`, `is:text`, `is:media` | Filter by status/type |
| `url:` | `url:example.com` | Match URL |
| `title:` | `title:recipe` | Match title |
| `#tag` or `tag:` | `#cooking`, `tag:cooking` | Filter by tag |
| `list:` | `list:Reading` | Filter by list name |
| `after:`/`before:` | `after:2024-01-01` | Date range |
| `age:` | `age:<1d`, `age:>2w` | Relative time |
| `source:` | `source:cli`, `source:web` | Content source |
| `feed:` | `feed:HackerNews` | RSS feed source |

Boolean operators: `and`, `or`, parentheses, negation with `-` or `!`

Example: `is:fav #tech -is:archived after:2024-01-01`

## CLI Source Code

The CLI source code lives in `apps/cli/src/`. Key files:
- `apps/cli/src/index.ts` - Entry point and global options
- `apps/cli/src/commands/` - Command implementations (bookmarks.ts, lists.ts, tags.ts, whoami.ts, admin.ts, migrate.ts, dump.ts, wipe.ts)
- Built with Commander.js, connects to `{serverAddr}/api/trpc`
