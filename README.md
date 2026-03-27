# WebFix AI — Web Analysis & Optimisation Tool

WebFix AI is an AI-powered web analysis tool that audits any public webpage and delivers detailed insights across five key dimensions: SEO structure, messaging clarity, call-to-action usage, content depth, and UX & structure. It then generates prioritised, actionable recommendations to help improve the site.

## How It Works

1. Enter a URL in the interface
2. The webscraper (Puppeteer) visits the page and collects structural metrics
3. The analysis backend (Flask + LLM) evaluates the scraped data across five categories and scores each one out of 100
4. Results and recommendations are displayed in the UI and saved locally for future reference

## Architecture Overview

The system is split into three independent services that communicate over HTTP:

- **React frontend** — handles user input, renders scored results, and manages audit history via a local JSON store.
- **Node.js / Puppeteer scraper** — visits the target URL in a headless browser and extracts structural metrics (headings, links, meta tags, CTA elements, word count, etc.). Running this as a separate service keeps browser automation isolated from the Python process and makes it easy to scale or swap independently.
- **Python / Flask analysis backend** — receives the scraped data and calls an LLM twice: once to generate per-category insights and scores, and once to produce prioritised recommendations. Separating these two LLM calls allows different models (and different prompts) to be used for each task.

```
webapp/
├── public/              # Static assets
├── src/                 # React frontend
├── analysis/            # Python Flask backend (LLM analysis engine)
│   ├── insight_generator.py
│   ├── llm_client.py
│   └── recommendations.py
├── webscraper/          # Node.js scraper (Puppeteer + Express)
│   ├── server.js
│   └── scraper.js
├── saved_analyses/      # Persisted audit results (auto-created)
├── requirements.txt     # Python dependencies
├── setup.bat            # One-time setup script
└── start.bat            # Launch all services
```

| Service      | Technology         | Port  |
|--------------|--------------------|-------|
| Frontend     | React              | 3000  |
| Analysis API | Python / Flask     | 5000  |
| Scraper API  | Node.js / Express  | 3001  |

## AI Design Decisions

**Two-model pipeline** — Insight generation and recommendation generation are handled by separate LLM calls (and can use separate models). Insights need broad analytical reasoning; recommendations need concise, ranked output. Splitting the calls makes each prompt simpler and lets you tune models independently for cost vs. quality.

**Data-grounded prompting** — Rather than passing raw HTML to the LLM, the scraper first reduces the page to a structured JSON of metrics (heading counts, CTA text, word count, meta description length, etc.). The analysis prompt instructs the model to cite these measured values in every finding. This reduces hallucination and makes outputs auditable.

**OpenAI-compatible API abstraction** — `llm_client.py` targets any OpenAI-compatible endpoint, so the tool works with OpenAI, Anthropic (via proxy), Google, or local models without code changes — just swap the `.env` values.

**Scoring rubric in the system prompt** — Each of the five categories has an explicit 0–100 scoring rubric baked into the prompt. Without a rubric, LLM scores drift and are not comparable across runs.

## Trade-offs

| Decision | Upside | Downside |
|---|---|---|
| Two sequential LLM calls | Cleaner prompts, tunable per task | Higher latency and cost vs. a single call |
| Scrape → structured JSON → LLM (not raw HTML) | Reduces token usage and hallucination | Some page context (visual layout, images) is lost |
| File-based audit history (`saved_analyses/`) | Zero infrastructure, works offline | Not suitable for multi-user or cloud deployment |
| Three separate local services | Each service is independently restartable and replaceable | More setup friction; requires three terminal processes |
| Headless Puppeteer for scraping | Handles JS-rendered pages | Slower than a simple HTTP fetch; blocked by some anti-bot measures |

## What I Would Improve With More Time

- **Authentication & multi-tenancy** — add user accounts so audit history is per-user and the tool can be deployed as a shared SaaS.
- **Queue-based analysis** — replace the synchronous request/response flow with a job queue (e.g. Redis + Celery) so the frontend can poll for results and long-running analyses don't time out.
- **Diff / trend view** — store multiple audits per domain and surface score changes over time so users can track improvement.
- **Richer scraping** — capture Lighthouse performance scores, Core Web Vitals, and accessibility violations alongside the current structural metrics.
- **Streaming LLM responses** — stream tokens to the UI so users see insights appear progressively rather than waiting for the full response.
- **Automated tests** — add unit tests for the scoring logic and prompt templates, and integration tests that run against a local mock page to prevent regressions.

## Prerequisites

- [Python 3.9+](https://www.python.org/downloads/)
- [Node.js 18+](https://nodejs.org/)
- An OpenAI-compatible API key and endpoint

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/chanukaWijeratna/WebFix-AI-web-analysing-software.git
cd WebFix-AI-web-analysing-software
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
API_URL=          # Your OpenAI-compatible API endpoint
API_KEY=          # Your API key
INSIGHT_MODEL=    # Model to use for page analysis | RECOMENDED : "google/gemini-3.1-flash-lite-preview"
RECOMMENDATIONS_MODEL=  # Model to use for recommendations | RECOMENDED : "anthropic/claude-haiku-4-5"
```

### 3. Run setup

Double-click `setup.bat` or run it from the terminal:

```bash
setup.bat
```

This will:
- Create a Python virtual environment (`venv/`)
- Install Python packages from `requirements.txt`
- Install Node packages for the frontend and webscraper

## Running the App

Double-click `start.bat` or run it from the terminal:

```bash
start.bat
```

This opens three terminal windows — one for each service. Once all three are running, open your browser at [http://localhost:3000](http://localhost:3000).

## Features

- **5-category scoring** — SEO, messaging, CTAs, content depth, UX & structure, each scored 0–100
- **Data-grounded insights** — every finding cites specific measured values from the page
- **Prioritised recommendations** — 3–5 actionable fixes ranked by impact
- **Audit history** — past analyses are saved and can be reviewed or deleted from the UI
- **Prompt logs** — raw LLM prompts and outputs are visible for transparency
