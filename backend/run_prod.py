import uvicorn
import os

if __name__ == "__main__":
    # Get port from environment (Render provides this)
    port = int(os.getenv("PORT", 8000))
    # Standard single-worker setup for Render
    uvicorn.run("main:app", host="0.0.0.0", port=port)
