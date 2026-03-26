import json
import os
import requests
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / '.env')

API_KEY = os.getenv('API_KEY')
API_URL = 'https://openrouter.ai/api/v1/chat/completions'
MODEL = 'google/gemini-3.1-flash-lite-preview'


def generate_recommendations(insights):
    summary_block = ''
    for key, title in [
        ('seo_structure', 'SEO Structure'),
        ('messaging_clarity', 'Messaging Clarity'),
        ('cta_usage', 'CTA Usage'),
        ('content_depth', 'Content Depth'),
        ('ux_structure', 'UX & Structure'),
    ]:
        insight = insights.get(key)
        if not insight or insight.get('score', 0) == 0:
            continue
        issues = insight.get('issues', [])
        strengths = insight.get('strengths', [])
        summary_block += f"\n## {title} (score: {insight.get('score')}/100)\n"
        summary_block += f"Summary: {insight.get('summary')}\n"
        if issues:
            summary_block += "Issues:\n" + '\n'.join(
                f"  - [{i['severity'].upper()}] {i['issue']} — {i['suggestion']}"
                for i in issues
            ) + '\n'
        if strengths:
            summary_block += "Strengths:\n" + '\n'.join(f"  + {s}" for s in strengths) + '\n'

    prompt = f"""You are a web optimisation consultant. Based on the analysis results below, provide 3 to 5 prioritised, actionable recommendations to most improve this website.

{summary_block}

Focus on the highest-impact improvements. Each recommendation must be specific and reference actual findings from the analysis above.

Respond with ONLY a valid JSON object (no markdown, no extra text) in this exact format:
{{
  "recommendations": [
    {{
      "title": "<short title, max 8 words>",
      "description": "<2-3 sentences explaining what to do and why, citing specific metrics or issues from the analysis>",
      "priority": "high|medium|low",
      "category": "<SEO|Messaging|CTA|Content|UX>"
    }}
  ]
}}"""

    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json',
    }
    payload = {
        'model': MODEL,
        'messages': [
            {'role': 'system', 'content': 'You are a web optimisation expert. Always respond with valid JSON only. No markdown, no explanation, no extra text.'},
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
    return json.loads(content).get('recommendations', [])
