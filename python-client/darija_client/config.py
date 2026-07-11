import os
from dataclasses import dataclass


@dataclass(frozen=True)
class ApiConfig:
    base_url: str
    username: str
    password: str
    timeout_seconds: int = 30

    @classmethod
    def from_environment(cls) -> "ApiConfig":
        return cls(
            base_url=os.getenv("API_URL", "http://localhost:8080").rstrip("/"),
            username=os.getenv("API_USERNAME", ""),
            password=os.getenv("API_PASSWORD", ""),
            timeout_seconds=int(os.getenv("API_TIMEOUT_SECONDS", "30")),
        )

    def validate(self) -> None:
        if not self.username or not self.password:
            raise ValueError("Set API_USERNAME and API_PASSWORD before running the client.")
