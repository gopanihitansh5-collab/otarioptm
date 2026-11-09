import sys
sys.path.insert(0, r'C:\Users\rcgop\Desktop\empty folder\Project\otarioptm')
import uvicorn
from src.gateway.main import app

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8000)