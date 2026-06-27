from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from angel_client import login


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        login()
        print("Angel One login successful")
    except Exception as e:
        print(f"Angel One login failed (will retry on first request): {e}")
    yield


app = FastAPI(title="PRAVAH API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import regime, market, signals, portfolio, backtest, stress

app.include_router(regime.router,    prefix="/api")
app.include_router(market.router,    prefix="/api")
app.include_router(signals.router,   prefix="/api")
app.include_router(portfolio.router, prefix="/api")
app.include_router(backtest.router,  prefix="/api")
app.include_router(stress.router,    prefix="/api")


@app.get("/")
def root():
    return {"status": "ok", "service": "PRAVAH API", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
