# WebFix AI — Web Analysis & Optimisation Tool

WebFix AI is an AI-powered web analysis tool that audits any public webpage and delivers detailed insights across five key dimensions: SEO structure, messaging clarity, call-to-action usage, content depth, and UX & structure. It then generates prioritised, actionable recommendations to help improve the site.

## How It Works

1. Enter a URL in the interface
2. The webscraper (Puppeteer) visits the page and collects structural metrics
3. The analysis backend (Flask + LLM) evaluates the scraped data across five categories and scores each one out of 100
4. Results and recommendations are displayed in the UI and saved locally for future reference

## Architecture

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
