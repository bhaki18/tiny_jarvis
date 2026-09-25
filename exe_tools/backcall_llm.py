import sys
import requests

prompt = sys.argv[1]

url = "http://127.0.0.1:8080/v1/chat/completions"

data = {
    "messages": [
        {
            "role": "user",
            "content": prompt
        }
    ],
    "max_tokens": 500,
    "chat_template_kwargs": {
        "enable_thinking": False
    }
}

response = requests.post(url, json=data)
response.raise_for_status()

result = response.json()

print(result["choices"][0]["message"]["content"])
