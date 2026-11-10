import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

load_dotenv()

import uvicorn

from src.gateway.main import app

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
