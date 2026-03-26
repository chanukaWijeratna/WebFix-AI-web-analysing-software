import json
import os
import shutil
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from llm_client import call_llm
from recommendations import generate_recommendations

SAVES_DIR = Path(__file__).resolve().parent.parent / 'saved_analyses'


def save_analysis(scrape_data, insights, recommendations):
    timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    folder = SAVES_DIR / timestamp
    folder.mkdir(parents=True, exist_ok=True)

    (folder / 'scrape_data.json').write_text(
        json.dumps(scrape_data, indent=2), encoding='utf-8'
    )
    (folder / 'insights.json').write_text(
        json.dumps(insights, indent=2), encoding='utf-8'
    )
    (folder / 'recommendations.json').write_text(
        json.dumps(recommendations, indent=2), encoding='utf-8'
    )

app = Flask(__name__)
CORS(app)

SYSTEM_PROMPT = 'You are a web analysis expert. Always respond with valid JSON only. No markdown, no explanation, no extra text.'

INSIGHT_FORMAT = """Respond with ONLY a valid JSON object (no markdown, no extra text) in this exact format:
{
  "score": <0-100 integer>,
  "summary": "<2-3 sentence assessment that directly references specific metric values from the data above, e.g. word counts, tag names, counts, percentages>",
  "issues": [
    {"issue": "<description that quotes the actual metric value causing the problem, e.g. '0 H1 tags found' or 'load time of 4800ms'>", "severity": "high|medium|low", "suggestion": "<actionable fix>"}
  ],
  "strengths": ["<strength that references the actual metric value, e.g. 'Meta description present and 142 characters long'>"]
}

IMPORTANT: Every summary sentence, issue, and strength MUST cite specific numbers or values from the data. Never write vague statements — always include the actual measured value."""


def analyze_seo_structure(data, logs):
    fields = {
        'url': data.get('url'),
        'metaTitle': data.get('metaTitle'),
        'metaDescription': data.get('metaDescription'),
        'titleTag': data.get('titleTag'),
        'canonicalUrl': data.get('canonicalUrl'),
        'metaRobots': data.get('metaRobots'),
        'ogTags': data.get('ogTags'),
        'twitterTags': data.get('twitterTags'),
        'jsonLd': data.get('jsonLd'),
        'hreflang': data.get('hreflang'),
        'htmlLang': data.get('htmlLang'),
        'h1Tags': data.get('h1Tags'),
        'headingHierarchy': data.get('headingHierarchy', [])[:15] if isinstance(data.get('headingHierarchy'), list) else data.get('headingHierarchy'),
        'urlStructure': data.get('urlStructure'),
        'faviconPresent': data.get('faviconPresent'),
        'statusCode': data.get('statusCode'),
    }
    prompt = f"""Analyze this webpage's SEO structure using the exact data below.

Evaluate: meta tags completeness, heading hierarchy, Open Graph/Twitter cards, structured data (JSON-LD), canonical URL, URL structure, and overall SEO health.

Data:
{json.dumps(fields, indent=2)}

An empty string ("") means the element was not found on the page — flag it as a problem if important.
Quote specific values from the data above in every finding (e.g. actual tag content, presence/absence of fields, status code value). Treat any empty string ("") as meaning the element does not exist on the page.

{INSIGHT_FORMAT}"""
    return call_llm(prompt, SYSTEM_PROMPT, 'analyze_seo_structure', logs, 'INSIGHT_MODEL')


def analyze_messaging_clarity(data, logs):
    fields = {
        'metaTitle': data.get('metaTitle'),
        'metaDescription': data.get('metaDescription'),
        'h1Tags': data.get('h1Tags'),
        'headingHierarchy': data.get('headingHierarchy', [])[:15] if isinstance(data.get('headingHierarchy'), list) else data.get('headingHierarchy'),
        'keywordUsage': data.get('keywordUsage'),
        'totalWordCount': data.get('totalWordCount'),
        'contentLength': data.get('contentLength'),
        'ogTags': data.get('ogTags'),
    }
    prompt = f"""Analyze this webpage's messaging clarity using the exact data below.

Evaluate: whether headings clearly communicate purpose, if meta title/description are compelling, keyword consistency, and overall messaging coherence.

Data:
{json.dumps(fields, indent=2)}

An empty string ("") means the element was not found on the page.
Quote specific values from the data above in every finding (e.g. actual heading text, word count, top keywords, meta description content). Treat any empty string ("") as meaning the element does not exist on the page.

{INSIGHT_FORMAT}"""
    return call_llm(prompt, SYSTEM_PROMPT, 'analyze_messaging_clarity', logs, 'INSIGHT_MODEL')


def analyze_cta_usage(data, logs):
    fields = {
        'ctaCount': data.get('ctaCount'),
        'internalLinks': data.get('links', {}).get('internal'),
        'externalLinks': data.get('links', {}).get('external'),
        'totalLinks': data.get('links', {}).get('total'),
        'socialLinks': data.get('socialLinks'),
        'formsCount': data.get('formsCount'),
        'totalWordCount': data.get('totalWordCount'),
        'h1Tags': data.get('h1Tags'),
    }
    prompt = f"""Analyze this webpage's Call-to-Action (CTA) usage using the exact data below.

Evaluate: number of CTAs relative to content length, CTA-to-content ratio, forms presence, internal vs external link balance, social media links, and overall CTA effectiveness.

Data:
{json.dumps(fields, indent=2)}

An empty string ("") means the element was not found on the page.
Quote specific values from the data above in every finding (e.g. exact CTA count, link counts, form count, word count). Treat any empty string ("") as meaning the element does not exist on the page.

{INSIGHT_FORMAT}"""
    return call_llm(prompt, SYSTEM_PROMPT, 'analyze_cta_usage', logs, 'INSIGHT_MODEL')


def analyze_content_depth(data, logs):
    fields = {
        'totalWordCount': data.get('totalWordCount'),
        'contentLength': data.get('contentLength'),
        'headings': data.get('headings'),
        'headingHierarchy': data.get('headingHierarchy', [])[:15] if isinstance(data.get('headingHierarchy'), list) else data.get('headingHierarchy'),
        'keywordUsage': data.get('keywordUsage'),
        'totalImages': data.get('images', {}).get('total'),
        'missingAltPercent': data.get('images', {}).get('missingAltPercent'),
        'tablesCount': data.get('tablesCount'),
        'iframesCount': data.get('iframesCount'),
        'videosCount': data.get('videosCount'),
        'audioCount': data.get('audioCount'),
        'h1Tags': data.get('h1Tags'),
    }
    prompt = f"""Analyze this webpage's content depth and richness using the exact data below.

Evaluate: word count adequacy, content-to-heading ratio, keyword diversity, multimedia usage (images, videos, tables), content structure, and overall comprehensiveness.

Data:
{json.dumps(fields, indent=2)}

An empty string ("") means the element was not found on the page.
Quote specific values from the data above in every finding (e.g. exact word count, image count, missing alt %, heading counts, top keywords). Treat any empty string ("") as meaning the element does not exist on the page.

{INSIGHT_FORMAT}"""
    return call_llm(prompt, SYSTEM_PROMPT, 'analyze_content_depth', logs, 'INSIGHT_MODEL')


def analyze_ux_structure(data, logs):
    fields = {
        'domElementCount': data.get('domElementCount'),
        'inlineStylesCount': data.get('inlineStylesCount'),
        'externalStylesheetsCount': data.get('externalStylesheetsCount'),
        'inlineScriptsCount': data.get('inlineScriptsCount'),
        'externalScriptsCount': data.get('externalScriptsCount'),
        'loadTimeMs': data.get('loadTimeMs'),
        'viewportTag': data.get('viewportTag'),
        'skipNavPresent': data.get('skipNavPresent'),
        'ariaRolesCount': data.get('ariaRolesCount'),
        'ariaLabelsCount': data.get('ariaLabelsCount'),
        'unlabelledInputsCount': data.get('unlabelledInputsCount'),
        'tabindexUsage': data.get('tabindexUsage'),
        'faviconPresent': data.get('faviconPresent'),
        'missingAltPercent': data.get('images', {}).get('missingAltPercent'),
        'formsCount': data.get('formsCount'),
    }
    prompt = f"""Analyze this webpage for UX and structural concerns using the exact data below.

Evaluate: page load performance, DOM complexity, mobile responsiveness (viewport), accessibility (ARIA, labels, skip nav, tabindex), code quality (inline styles/scripts vs external), and overall structural health.

Data:
{json.dumps(fields, indent=2)}

An empty string ("") means the element was not found on the page.
Quote specific values from the data above in every finding (e.g. exact load time in ms, DOM element count, ARIA counts, inline style count, unlabelled input count). Treat any empty string ("") as meaning the element does not exist on the page.

{INSIGHT_FORMAT}"""
    return call_llm(prompt, SYSTEM_PROMPT, 'analyze_ux_structure', logs, 'INSIGHT_MODEL')


@app.route('/history', methods=['GET'])
def list_history():
    if not SAVES_DIR.exists():
        return jsonify([])
    entries = []
    for folder in sorted(SAVES_DIR.iterdir(), reverse=True):
        if not folder.is_dir():
            continue
        try:
            scrape = json.loads((folder / 'scrape_data.json').read_text(encoding='utf-8'))
            insights = json.loads((folder / 'insights.json').read_text(encoding='utf-8'))
            scores = {k: insights[k]['score'] for k in ('seo_structure', 'messaging_clarity', 'cta_usage', 'content_depth', 'ux_structure') if k in insights}
            entries.append({
                'timestamp': folder.name,
                'url': scrape.get('url', ''),
                'scores': scores,
                'wordCount': scrape.get('totalWordCount'),
                'loadTimeMs': scrape.get('loadTimeMs'),
            })
        except Exception:
            continue
    return jsonify(entries)


@app.route('/history/<timestamp>', methods=['DELETE'])
def delete_history(timestamp):
    folder = SAVES_DIR / timestamp
    if not folder.exists():
        return jsonify({'error': 'Not found'}), 404
    try:
        shutil.rmtree(folder)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/history/<timestamp>', methods=['GET'])
def get_history(timestamp):
    folder = SAVES_DIR / timestamp
    if not folder.exists():
        return jsonify({'error': 'Not found'}), 404
    try:
        scrape = json.loads((folder / 'scrape_data.json').read_text(encoding='utf-8'))
        insights = json.loads((folder / 'insights.json').read_text(encoding='utf-8'))
        recommendations = json.loads((folder / 'recommendations.json').read_text(encoding='utf-8'))
        insights['recommendations'] = recommendations
        return jsonify({'scrape': scrape, 'insights': insights})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    logs = []

    analyses = {
        'seo_structure': analyze_seo_structure,
        'messaging_clarity': analyze_messaging_clarity,
        'cta_usage': analyze_cta_usage,
        'content_depth': analyze_content_depth,
        'ux_structure': analyze_ux_structure,
    }

    results = {}
    for key, fn in analyses.items():
        try:
            results[key] = fn(data, logs)
        except Exception as e:
            results[key] = {
                'score': 0,
                'summary': f'Analysis failed: {str(e)}',
                'issues': [],
                'strengths': [],
            }

    try:
        results['recommendations'] = generate_recommendations(results, logs)
    except Exception as e:
        results['recommendations'] = []

    results['prompt_logs'] = logs

    insights_only = {k: results[k] for k in ('seo_structure', 'messaging_clarity', 'cta_usage', 'content_depth', 'ux_structure') if k in results}
    try:
        save_analysis(data, insights_only, results.get('recommendations', []))
    except Exception as e:
        print(f'[save_analysis error] {e}')

    return jsonify(results)


if __name__ == '__main__':
    print('Insight generator running on http://localhost:5000')
    app.run(port=5000, debug=False)
