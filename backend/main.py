import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from angel_client import login


def _warm_cache():
    """Background: prefetch all Nifty50 candles + compute signals into MongoDB."""
    try:
        from signal_engine import get_top_signals, _compute_all_signals_bg
        get_top_signals(50)   # warms Nifty50 synchronously, triggers BG for all 379
        print("[cache] startup warm complete")
    except Exception as e:
        print(f"[cache] Warm failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        login()
        print("Angel One login successful")
    except Exception as e:
        print(f"Angel One login failed (will retry on first request): {e}")
    # Fire-and-forget cache warm — don't block startup
    asyncio.get_event_loop().run_in_executor(None, _warm_cache)
    yield


app = FastAPI(title="PRAVAH API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def unhandled_exception(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    origin = request.headers.get("origin", "")
    headers = {"Access-Control-Allow-Origin": origin} if origin else {}
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "type": type(exc).__name__},
        headers=headers,
    )

from routers import regime, market, signals, portfolio, backtest, stress, auth, optimizer, news

app.include_router(auth.router,      prefix="/api")
app.include_router(regime.router,    prefix="/api")
app.include_router(market.router,    prefix="/api")
app.include_router(signals.router,   prefix="/api")
app.include_router(portfolio.router, prefix="/api")
app.include_router(backtest.router,  prefix="/api")
app.include_router(stress.router,    prefix="/api")
app.include_router(optimizer.router, prefix="/api")
app.include_router(news.router,      prefix="/api")


@app.get("/")
def root():
    return {"status": "ok", "service": "PRAVAH API", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
