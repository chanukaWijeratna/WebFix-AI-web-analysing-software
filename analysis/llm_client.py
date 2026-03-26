import json
import os
import requests
from pathlib import Path
from dotenv import load_dotenv

WEBAPP_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = WEBAPP_DIR / '.env'


def call_llm(prompt, system_prompt, call_name, logs, model_env_key, api_url_env_key='API_URL', api_key_env_key='API_KEY'):
    load_dotenv(ENV_PATH, override=True)
    model = os.getenv(model_env_key)
    api_url = os.getenv(api_url_env_key)
    api_key = os.getenv(api_key_env_key)
    payload = {
        'model': model,
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': prompt},
        ],
        'temperature': 0.3,
        'max_tokens': 1200,
    }
    log_entry = {
        'call_name': call_name,
        'system_prompt': system_prompt,
        'user_prompt': prompt,
        'payload': payload,
        'raw_output': None,
        'error': None,
    }
    try:
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        }
        response = requests.post(api_url, headers=headers, json=payload, timeout=90)
        response.raise_for_status()
        raw = response.json()['choices'][0]['message']['content'].strip()
        log_entry['raw_output'] = raw
        logs.append(log_entry)
        content = raw
        if content.startswith('```'):
            content = content.split('\n', 1)[1] if '\n' in content else content[3:]
            content = content.rsplit('```', 1)[0]
        return json.loads(content)
    except Exception as e:
        log_entry['error'] = str(e)
        logs.append(log_entry)
        raise
