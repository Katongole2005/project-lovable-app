#!/usr/bin/env python3
# run_api.py
import uvicorn
import os
from config import API_HOST, API_PORT

if __name__ == "__main__":
    print("[INFO] Starting Mobifliks Mirror API Server...")
    print(f"   Host: {API_HOST}")
    print(f"   Port: {API_PORT}")
    print(f"   API: http://{API_HOST}:{API_PORT}/")
    print(f"   Docs: http://{API_HOST}:{API_PORT}/docs")

    uvicorn.run("api_server:app", host=API_HOST, port=API_PORT, reload=True)
