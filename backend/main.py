from fastapi import FastAPI

app = FastAPI(title="Quant Trading API")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Quant Trading API"}
