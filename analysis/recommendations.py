from llm_client import call_llm

SYSTEM_PROMPT = 'You are a web optimisation expert. Always respond with valid JSON only. No markdown, no explanation, no extra text.'


def generate_recommendations(insights, logs):
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

Each recommendation MUST: (1) cite the specific metric values from the analysis above, (2) explain clearly why that metric is a problem and what negative impact it has, and (3) state the exact fix. Do not generalise — every description must read like: "X was found to be Y, which causes Z — to fix this, do W."

Respond with ONLY a valid JSON object (no markdown, no extra text) in this exact format:
{{
  "recommendations": [
    {{
      "title": "<short title, max 8 words>",
      "description": "<2-3 sentences that quote specific values from the analysis above, explain why it matters, and state the exact fix>",
      "priority": "high|medium|low",
      "category": "<SEO|Messaging|CTA|Content|UX>"
    }}
  ]
}}"""

    result = call_llm(prompt, SYSTEM_PROMPT, 'generate_recommendations', logs, 'RECOMMENDATIONS_MODEL')
    return result.get('recommendations', [])
