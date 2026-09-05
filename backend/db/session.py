import os
from typing import Optional

class DatabaseSessionManager:
    """Manages database connections (e.g., Supabase / PostgreSQL)."""

    def __init__(self):
        self.supabase_url: Optional[str] = os.getenv("SUPABASE_URL")
        self.supabase_anon_key: Optional[str] = os.getenv("SUPABASE_ANON_KEY")
        self.supabase_secret_key: Optional[str] = os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_KEY")
        self._is_connected: bool = False

    def is_configured(self) -> bool:
        return bool(
            self.supabase_url
            and (self.supabase_secret_key or self.supabase_anon_key)
            and not self.supabase_url.startswith("https://your-project")
        )

db_manager = DatabaseSessionManager()
