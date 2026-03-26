import json
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from pathlib import Path
import requests
from recommendations import generate_recommendations

load_dotenv(Path(__file__).parent / '.env')

app = Flask(__name__)
CORS(app)

API_KEY = os.getenv('API_KEY')
API_URL = 'https://openrouter.ai/api/v1/chat/completions'
MODEL = 'google/gemini-3.1-flash-lite-preview'

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


def call_llm(prompt):
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json',
    }
    payload = {
        'model': MODEL,
        'messages': [
            {'role': 'system', 'content': 'You are a web analysis expert. Always respond with valid JSON only. No markdown, no explanation, no extra text.'},
            {'role': 'user', 'content': prompt}
        ],
        'temperature': 0.3,
        'max_tokens': 1200,
    }
    response = requests.post(API_URL, headers=headers, json=payload, timeout=90)
    response.raise_for_status()
    content = response.json()['choices'][0]['message']['content'].strip()
    if content.startswith('```'):
        content = content.split('\n', 1)[1] if '\n' in content else content[3:]
        content = content.rsplit('```', 1)[0]
    return json.loads(content)


def analyze_seo_structure(data):
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

"##MISSING##" means the element was not found on the page — flag it as a problem if important.
Quote specific values from the data above in every finding (e.g. actual tag content, presence/absence of fields, status code value).

{INSIGHT_FORMAT}"""
    return call_llm(prompt)


def analyze_messaging_clarity(data):
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

"##MISSING##" means the element was not found on the page.
Quote specific values from the data above in every finding (e.g. actual heading text, word count, top keywords, meta description content).

{INSIGHT_FORMAT}"""
    return call_llm(prompt)


def analyze_cta_usage(data):
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

"##MISSING##" means the element was not found on the page.
Quote specific values from the data above in every finding (e.g. exact CTA count, link counts, form count, word count).

{INSIGHT_FORMAT}"""
    return call_llm(prompt)


def analyze_content_depth(data):
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

"##MISSING##" means the element was not found on the page.
Quote specific values from the data above in every finding (e.g. exact word count, image count, missing alt %, heading counts, top keywords).

{INSIGHT_FORMAT}"""
    return call_llm(prompt)


def analyze_ux_structure(data):
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

"##MISSING##" means the element was not found on the page.
Quote specific values from the data above in every finding (e.g. exact load time in ms, DOM element count, ARIA counts, inline style count, unlabelled input count).

{INSIGHT_FORMAT}"""
    return call_llm(prompt)


@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400

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
            results[key] = fn(data)
        except Exception as e:
            results[key] = {
                'score': 0,
                'summary': f'Analysis failed: {str(e)}',
                'issues': [],
                'strengths': [],
            }

    try:
        results['recommendations'] = generate_recommendations(results)
    except Exception as e:
        results['recommendations'] = []

    return jsonify(results)


if __name__ == '__main__':
    print('Insight generator running on http://localhost:5000')
    app.run(port=5000, debug=False)
