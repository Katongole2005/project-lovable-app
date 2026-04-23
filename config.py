# config.py
import os
from dotenv import load_dotenv

load_dotenv()

USERNAME = os.getenv("MOBIFLIKS_USERNAME", "Mike")
PHONE_NUMBER = os.getenv("MOBIFLIKS_PHONE", "0702587110")
COUNTRY_CODE = os.getenv("MOBIFLIKS_COUNTRY_CODE", "256")

API_HOST = os.getenv("API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("API_PORT", "8000"))