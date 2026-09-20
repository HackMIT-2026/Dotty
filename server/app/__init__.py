"""Reads server/.env before anything else asks os.getenv for MONGO_URI, JWT_SECRET or ANTHROPIC_API_KEY.

Variables already set in the shell win, so `MONGO_DB=dotty_test pytest` and a deployment's own configuration
both override the file.
"""

from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:  # python-dotenv is optional: without it, the shell environment is all there is
    pass
else:
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
