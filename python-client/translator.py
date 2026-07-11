#!/usr/bin/env python3
import base64
import json
import os
import sys
import urllib.error
import urllib.request


def translate(text: str) -> str:
    api_url = os.getenv("API_URL", "http://localhost:8080").rstrip("/")
    username = os.getenv("API_USERNAME", "")
    password = os.getenv("API_PASSWORD", "")
    if not username or not password:
        raise RuntimeError("Set API_USERNAME and API_PASSWORD before running the client.")

    credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
    request = urllib.request.Request(
        f"{api_url}/api/translate",
        data=json.dumps({"text": text}).encode(),
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)["translation"]
    except urllib.error.HTTPError as error:
        try:
            message = json.load(error).get("error", "Translation failed.")
        except (ValueError, AttributeError):
            message = "Translation failed."
        raise RuntimeError(message) from error
    except urllib.error.URLError as error:
        raise RuntimeError("Could not reach the translation server.") from error


def main() -> int:
    text = " ".join(sys.argv[1:]).strip() if len(sys.argv) > 1 else input("English text: ").strip()
    if not text or len(text) > 5000:
        print("Enter between 1 and 5000 characters.", file=sys.stderr)
        return 2
    try:
        print(translate(text))
        return 0
    except RuntimeError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
