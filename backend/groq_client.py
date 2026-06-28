"""
Groq LLM client — RSS sentiment scoring and portfolio risk brief.
Primary: Groq API (llama-3.3-70b-versatile, ~200 tok/s).
Fallback: FinLlama via llama.cpp subprocess (offline).
"""

import os
import json
import subprocess
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

import httpx

GROQ_MODEL    = "llama-3.3-70b-versatile"
GROQ_API_URL  = "https://api.groq.com/openai/v1/chat/completions"
FINLLAMA_PATH = os.getenv("FINLLAMA_PATH", "")   # path to llama.cpp binary
FINLLAMA_MODEL= os.getenv("FINLLAMA_MODEL", "")  # path to FinLlama GGUF model


# ── RSS Feed Fetcher ────────────────────────────────────────────────────────────

RSS_FEEDS = [
    "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
    "https://www.moneycontrol.com/rss/latestnews.xml",
    "https://feeds.feedburner.com/ndtvprofit-latest",
]


def fetch_headlines(symbols: list[str], max_per_feed: int = 15) -> list[dict]:
    """
    Fetch RSS headlines and filter to those mentioning any of the given symbols
    (bare name without .NS). Returns list of {title, source, published}.
    """
    bare = [s.replace(".NS", "").upper() for s in symbols]
    headlines = []

    for feed_url in RSS_FEEDS:
        try:
            resp = httpx.get(feed_url, timeout=8.0, follow_redirects=True)
            resp.raise_for_status()
            root = ET.fromstring(resp.content)
            items = root.findall(".//item")[:max_per_feed]
            source = feed_url.split("/")[2].replace("www.", "")
            for item in items:
                title = (item.findtext("title") or "").strip()
                pub   = (item.findtext("pubDate") or "").strip()
                if not title:
                    continue
                title_upper = title.upper()
                if any(b in title_upper for b in bare):
                    headlines.append({"title": title, "source": source, "published": pub})
        except Exception:
            pass

    return headlines[:30]  # cap at 30 to keep prompt short


# ── Groq / FinLlama caller ──────────────────────────────────────────────────────

def _call_groq(prompt: str, system: str = "", max_tokens: int = 512) -> str:
    """Call Groq API. Raises on failure so caller can fallback."""
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY not set")

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    resp = httpx.post(
        GROQ_API_URL,
        headers={"Authorization": f"Bearer {api_key}",
                 "Content-Type": "application/json"},
        json={"model": GROQ_MODEL, "messages": messages,
              "max_tokens": max_tokens, "temperature": 0.2},
        timeout=30.0,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


def _call_finllama(prompt: str, max_tokens: int = 512) -> str:
    """FinLlama fallback via llama.cpp CLI subprocess."""
    if not FINLLAMA_PATH or not FINLLAMA_MODEL:
        raise RuntimeError("FINLLAMA_PATH or FINLLAMA_MODEL not configured")

    result = subprocess.run(
        [
            FINLLAMA_PATH, "-m", FINLLAMA_MODEL,
            "-p", prompt,
            "-n", str(max_tokens),
            "--temp", "0.2",
            "-c", "2048",
            "--log-disable",
        ],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if result.returncode != 0:
        raise RuntimeError(f"llama.cpp failed: {result.stderr[:200]}")
    # llama.cpp echoes the prompt — strip it
    output = result.stdout
    if prompt in output:
        output = output[output.index(prompt) + len(prompt):]
    return output.strip()


def _llm(prompt: str, system: str = "", max_tokens: int = 512) -> str:
    """Try Groq → fallback to FinLlama → fallback to stub."""
    try:
        return _call_groq(prompt, system=system, max_tokens=max_tokens)
    except Exception:
        pass
    try:
        full = f"{system}\n\n{prompt}" if system else prompt
        return _call_finllama(full, max_tokens=max_tokens)
    except Exception:
        return "LLM unavailable — run with GROQ_API_KEY set for AI-powered analysis."


# ── Sentiment Scorer ────────────────────────────────────────────────────────────

def score_sentiment(symbols: list[str]) -> dict:
    """
    Fetch RSS headlines mentioning the given stocks, score sentiment via LLM.
    Returns {symbol: {score: -1..1, label, headlines: [...]}, "raw_headlines": [...]}
    """
    headlines = fetch_headlines(symbols)
    if not headlines:
        return {"headlines": [], "scores": {s: {"score": 0.0, "label": "NEUTRAL", "headlines": []} for s in symbols}}

    headlines_text = "\n".join(
        f"- {h['title']} ({h['source']})" for h in headlines
    )

    system = (
        "You are a financial sentiment analyst specializing in Indian equity markets. "
        "Return only valid JSON."
    )
    prompt = f"""Analyze the sentiment of these news headlines for each stock symbol.

Headlines:
{headlines_text}

Stocks to score: {', '.join(s.replace('.NS', '') for s in symbols)}

Return JSON in this exact format (no extra text):
{{
  "scores": {{
    "SYMBOL": {{"score": 0.0, "label": "BULLISH|BEARISH|NEUTRAL", "relevant_headlines": ["..."]}}
  }}
}}

Score range: -1.0 (very bearish) to +1.0 (very bullish). 0.0 = neutral or no relevant news."""

    raw = _llm(prompt, system=system, max_tokens=800)

    try:
        # Extract JSON from response (LLM may wrap in markdown)
        start = raw.find("{")
        end   = raw.rfind("}") + 1
        parsed = json.loads(raw[start:end])
        scores = parsed.get("scores", {})
    except Exception:
        scores = {}

    # Normalise keys — LLM may return bare names without .NS
    result = {}
    for sym in symbols:
        bare = sym.replace(".NS", "")
        data = scores.get(sym) or scores.get(bare) or {}
        result[sym] = {
            "score":    float(data.get("score", 0.0)),
            "label":    data.get("label", "NEUTRAL"),
            "headlines": data.get("relevant_headlines", []),
        }

    return {"headlines": headlines, "scores": result}


# ── Risk Brief ──────────────────────────────────────────────────────────────────

def generate_risk_brief(
    portfolio: dict,          # {symbol: weight}
    optimizer_result: dict,   # from run_comparison()
    sentiment: dict,          # from score_sentiment()
    regime: str = "SIDEWAYS",
) -> dict:
    """
    Generate a structured 1-page portfolio risk memo via Groq.
    Returns {brief, risk_flags, opportunities, generated_at}.
    """
    top_holdings = sorted(portfolio.items(), key=lambda x: x[1], reverse=True)[:8]
    holdings_text = "\n".join(f"  {s}: {w*100:.1f}%" for s, w in top_holdings)

    winner     = optimizer_result.get("winner", "pravah_bl")
    optimizers = optimizer_result.get("optimizers", {})
    # Use BL metrics; fall back to winner's metrics if BL errored
    bl_metrics = optimizers.get("pravah_bl", {}).get("risk_metrics", {})
    if not bl_metrics:
        bl_metrics = optimizers.get(winner, {}).get("risk_metrics", {})
    sharpe     = bl_metrics.get("sharpe_ratio", "N/A")
    drawdown   = bl_metrics.get("max_drawdown", "N/A")

    bear_stocks = [
        s for s, d in sentiment.get("scores", {}).items()
        if d.get("score", 0) < -0.3
    ]
    bull_stocks = [
        s for s, d in sentiment.get("scores", {}).items()
        if d.get("score", 0) > 0.3
    ]

    system = (
        "You are PRAVAH, an AI quant analyst for Indian equity markets. "
        "Write concise, professional portfolio briefs. No fluff."
    )
    prompt = f"""Generate a portfolio risk brief for this portfolio.

PORTFOLIO (top holdings):
{holdings_text}

MARKET REGIME: {regime}
OPTIMIZER WINNER: {winner} (PRAVAH Black-Litterman)
PRAVAH SHARPE RATIO: {sharpe}
MAX DRAWDOWN: {drawdown}%

SENTIMENT ALERTS:
- Bearish news: {', '.join(s.replace('.NS','') for s in bear_stocks) or 'None'}
- Bullish news: {', '.join(s.replace('.NS','') for s in bull_stocks) or 'None'}

Return JSON (no extra text):
{{
  "brief": "2-3 sentence executive summary of portfolio risk and positioning",
  "risk_flags": ["flag1", "flag2", "flag3"],
  "opportunities": ["opp1", "opp2"]
}}"""

    raw = _llm(prompt, system=system, max_tokens=600)

    try:
        start  = raw.find("{")
        end    = raw.rfind("}") + 1
        parsed = json.loads(raw[start:end])
    except Exception:
        parsed = {
            "brief": raw[:400] if raw else "Analysis unavailable.",
            "risk_flags": [],
            "opportunities": [],
        }

    return {
        **parsed,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model": GROQ_MODEL if os.getenv("GROQ_API_KEY", "") else "finllama-fallback",
    }
