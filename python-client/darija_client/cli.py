import sys

from .api import TranslationApiClient, TranslationClientError
from .config import ApiConfig


def main(arguments: list[str] | None = None) -> int:
    arguments = sys.argv[1:] if arguments is None else arguments
    text = " ".join(arguments).strip() if arguments else input("English text: ").strip()
    if not text or len(text) > 5000:
        print("Enter between 1 and 5000 characters.", file=sys.stderr)
        return 2

    try:
        client = TranslationApiClient(ApiConfig.from_environment())
        print(client.translate(text))
        return 0
    except (TranslationClientError, ValueError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
