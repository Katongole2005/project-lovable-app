import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from api_server import app

try:
    from a2wsgi import ASGIMiddleware
except Exception as exc:
    raise RuntimeError(
        "a2wsgi is required to run this FastAPI app under a WSGI server."
    ) from exc

application = ASGIMiddleware(app)
