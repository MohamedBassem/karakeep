# Karakeep

## What is Karakeep?

Karakeep is an open-source, self-hosted "Bookmark Everything" application. Users capture content from the web (links, text notes, images, PDFs) and Karakeep automatically processes it: fetching metadata, taking screenshots, archiving full pages, extracting text via OCR, and using AI to generate tags and summaries. The name comes from Arabic "karakeeb" - miscellaneous clutter worth keeping.

## Core Concepts

### Bookmarks

A bookmark is the fundamental unit in Karakeep. There are three types:

- **Links** - A URL. When saved, background workers crawl the page to fetch its title, description, favicon, screenshot, and optionally a full-page archive (via Monolith) and video download (via yt-dlp). The crawled content becomes searchable.
- **Text/Notes** - Plain text snippets: ideas, quotes, reminders. No crawling needed.
- **Media** - Uploaded images or PDFs. Karakeep runs OCR (Tesseract.js or LLM-based) to extract searchable text from them.

Every bookmark tracks a `source` indicating how it was created: `web`, `extension`, `mobile`, `cli`, `api`, `rss`, `import`, or `singlefile`.

### Bookmark States

- **Favourited** - Starred for quick access. A dedicated "Favourites" view shows only these.
- **Archived** - Hidden from the main feed but still fully searchable and accessible. Think of it as "done processing" or "read later, dealt with." Archiving is the primary inbox-zero mechanism.
- **Notes** - Free-text annotations attached to any bookmark for personal context (searchable).
- **Highlights** - Saved quotes, summaries, or TODOs extracted from reading. Visible in the bookmark detail view and searchable.

### Tags

Lightweight labels attached to bookmarks. Tags are flat (no hierarchy) and a bookmark can have any number of them.

Tags serve two purposes:
1. **AI-generated tags** - Applied automatically by the inference worker after crawling. These enable broad discovery across content you might not have manually categorized.
2. **User tags** - Applied manually for personal taxonomy (e.g., `to-read`, `project-x`, `recipes`).

Both kinds are equal once applied - they can be used in searches, smart lists, and rules.

### Lists

Lists are the main organizational structure. A bookmark can belong to multiple lists without duplication.

**Manual lists:**
- Hand-curated collections (projects, reading queues, topic groups).
- Support hierarchy: lists can have parent lists for nested organization.
- Privacy: can be private or public (read-only shareable link).
- Collaboration: invite users by email as viewers (browse only) or editors (can add bookmarks). Personal states like favourites/archive remain private even in shared lists.

**Smart lists:**
- Defined by a saved search query (e.g., `#ai -is:archived age:<7d`).
- Auto-updating: bookmarks matching the query appear automatically.
- Useful for dynamic views like "unread articles from this week" or "all YouTube links tagged #tutorial".

### RSS Feeds

Bidirectional RSS support:

- **Consuming feeds** - Add external RSS feed URLs. Karakeep checks them hourly and creates link bookmarks for new entries. Duplicate URLs are skipped. Feed categories can be imported as tags.
- **Publishing feeds** - Any list can be published as an RSS feed with a unique token URL, allowing others to subscribe to your curated collections.

### Rules (Automation)

An if-this-then-that engine that runs on bookmark events. Rules match bookmarks based on metadata (URL patterns, tags, content) and execute actions like:
- Auto-tagging (e.g., all youtube.com links get tagged `video`)
- Auto-archiving
- Adding to specific lists
- Auto-favouriting

### Webhooks

Subscribe to bookmark lifecycle events (created, updated, crawled) to trigger external systems. The payload includes bookmarkId, userId, URL, and operation type.

## How Processing Works

When a bookmark enters the system, background workers process it through a pipeline:

1. **Crawling worker** - For links: uses a headless Chrome browser to fetch the page, extract metadata (title, description, image), take a screenshot, and optionally create a full-page archive and download video.
2. **Inference worker** - Sends the content to an AI provider (OpenAI, Ollama, Gemini, etc.) to generate tags and an optional summary. Uses configurable models for text vs. image content.
3. **Search indexing worker** - Pushes content to Meilisearch for full-text search.
4. **Asset preprocessing worker** - For media bookmarks: runs OCR to extract text, generates thumbnails.

Each step is an independent background job. The `admin jobs stats` command shows queue depths. Individual bookmarks can be re-processed (recrawl, retag, resummarize, reindex) and bulk operations can target all bookmarks by status (success/failure/pending).

## Architecture

- **Web app** - Next.js frontend + tRPC API, backed by SQLite.
- **Workers** - Separate process consuming background jobs (crawling, inference, indexing, asset processing, webhooks, feeds, rule engine).
- **Meilisearch** - Optional but recommended search engine for full-text search.
- **Headless Chrome** - Used by the crawler for rendering pages and taking screenshots.
- **Storage** - Assets stored on local filesystem (`DATA_DIR/assets`) or S3-compatible object storage.

## CLI

The CLI (`@karakeep/cli`, command name `karakeep`) provides full control over a Karakeep server. It connects via tRPC using an API key for authentication.

**Configuration** (flags or env vars):
- `--api-key` / `KARAKEEP_API_KEY` - API key from the web UI Settings page
- `--server-addr` / `KARAKEEP_SERVER_ADDR` - Server base URL
- `--json` - Machine-readable JSON output

**Commands:** `whoami`, `bookmarks` (add/get/update/update-tags/list/search/delete), `lists` (list/get/add-bookmark/remove-bookmark/delete), `tags` (list/delete), `admin` (users/bookmarks/jobs management), `migrate` (server-to-server migration), `dump` (full account export to tar.gz), `wipe` (delete all data).

Run `karakeep --help` or `karakeep <command> --help` for full option details.

## Search Query Language

The search system supports structured qualifiers combined with full-text search:

| Qualifier | Example | Description |
|-----------|---------|-------------|
| `is:` | `is:fav`, `is:archived`, `is:tagged`, `is:inlist`, `is:link`, `is:text`, `is:media`, `is:broken` | Filter by state or type |
| `url:` | `url:example.com` | Match against bookmark URL |
| `title:` | `title:recipe` | Match against bookmark title |
| `#tag` or `tag:` | `#cooking`, `tag:cooking` | Filter by tag |
| `list:` | `list:Reading` | Filter by list membership |
| `after:`/`before:` | `after:2024-01-01` | Absolute date range (YYYY-MM-DD) |
| `age:` | `age:<1d`, `age:>2w` | Relative time (d=days, w=weeks, m=months, y=years) |
| `source:` | `source:cli`, `source:extension` | How the bookmark was created |
| `feed:` | `feed:HackerNews` | Which RSS feed it came from |

**Boolean logic:** `and`, `or`, parentheses for grouping, `-` or `!` prefix for negation. Spaces are implicit AND.

**Examples:**
- `is:fav #tech -is:archived` - Favourited tech bookmarks not yet archived
- `url:github.com after:2024-01-01` - GitHub links from 2024 onward
- `(#recipe or #cooking) is:link age:<30d` - Recipe links from the last month
- `source:extension -is:tagged` - Browser extension captures that AI hasn't tagged yet

## CLI Source Code

Located in `apps/cli/src/`:
- `index.ts` - Entry point, global options
- `commands/` - One file per command group (bookmarks.ts, lists.ts, tags.ts, whoami.ts, admin.ts, migrate.ts, dump.ts, wipe.ts)
- Built with Commander.js, connects to `{serverAddr}/api/trpc`
