"""
news.py — Market News Intelligence router

GET  /api/news          — fetch + LLM-classify top market headlines (macro impact)
GET  /api/news/symbol   — symbol-specific news sentiment
"""

import os
import json
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from functools import lru_cache
from typing import Optional

import httpx
from fastapi import APIRouter, Query

router = APIRouter()

# ── RSS Sources ────────────────────────────────────────────────────────────────

RSS_SOURCES = [
    {
        "url": "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
        "source": "Economic Times",
    },
    {
        "url": "https://www.moneycontrol.com/rss/latestnews.xml",
        "source": "Moneycontrol",
    },
    {
        "url": "https://feeds.feedburner.com/ndtvprofit-latest",
        "source": "NDTV Profit",
    },
    {
        "url": "https://www.business-standard.com/rss/markets-106.rss",
        "source": "Business Standard",
    },
]

# Impact categories the LLM classifies headlines into
IMPACT_CATEGORIES = [
    "RBI_POLICY",       # Rate changes, monetary policy
    "GEOPOLITICAL",     # Wars, sanctions, global tensions
    "BUDGET_FISCAL",    # Union budget, taxes, subsidies
    "FII_DII",          # Foreign/Domestic institutional flows
    "EARNINGS",         # Quarterly results, guidance
    "SECTOR_SPECIFIC",  # Sector regulations, norms
    "GLOBAL_MACRO",     # Fed, US economy, oil, commodities
    "CURRENCY",         # INR/USD, forex
    "GENERAL",          # Other market news
]


# ── Helpers ────────────────────────────────────────────────────────────────────

def _fetch_all_headlines(max_per_feed: int = 15) -> list[dict]:
    """Fetch all headlines from all RSS feeds (no symbol filter)."""
    headlines = []
    seen_titles = set()

    for feed in RSS_SOURCES:
        try:
            resp = httpx.get(feed["url"], timeout=8.0, follow_redirects=True)
            resp.raise_for_status()
            root = ET.fromstring(resp.content)
            items = root.findall(".//item")[:max_per_feed]
            for item in items:
                title = (item.findtext("title") or "").strip()
                pub   = (item.findtext("pubDate") or "").strip()
                link  = (item.findtext("link") or "").strip()
                desc  = (item.findtext("description") or "").strip()[:200]
                if not title or title in seen_titles:
                    continue
                seen_titles.add(title)
                headlines.append({
                    "title":       title,
                    "source":      feed["source"],
                    "published":   pub,
                    "link":        link,
                    "description": desc,
                })
        except Exception:
            pass

    return headlines[:40]  # cap at 40


def _classify_headlines(headlines: list[dict]) -> list[dict]:
    """
    Use Groq LLM to classify each headline by:
    - category (from IMPACT_CATEGORIES)
    - impact_direction: BULLISH / BEARISH / NEUTRAL
    - impact_score: -1.0 to +1.0
    - affected_sectors: list of sectors most impacted
    - summary: one-sentence plain English explanation
    """
    if not headlines:
        return []

    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        # No LLM available — return headlines with NEUTRAL classification
        return [
            {
                **h,
                "category":         "GENERAL",
                "impact_direction": "NEUTRAL",
                "impact_score":     0.0,
                "affected_sectors": [],
                "summary":          h["title"],
            }
            for h in headlines
        ]

    headlines_text = "\n".join(
        f"{i+1}. [{h['source']}] {h['title']}" for i, h in enumerate(headlines)
    )

    prompt = f"""You are a senior Indian equity market analyst. Analyze these market news headlines and classify each one.

Headlines:
{headlines_text}

For each headline, return:
- category: one of {json.dumps(IMPACT_CATEGORIES)}
- impact_direction: BULLISH, BEARISH, or NEUTRAL (on Indian equity markets)
- impact_score: float from -1.0 (very bearish) to +1.0 (very bullish)
- affected_sectors: list of NSE sectors most impacted (e.g. ["Banking", "IT", "Energy"])
- summary: one sentence explaining WHY this matters to Indian stock investors

Return valid JSON array only, no extra text:
[
  {{
    "index": 1,
    "category": "...",
    "impact_direction": "...",
    "impact_score": 0.0,
    "affected_sectors": ["..."],
    "summary": "..."
  }}
]"""

    try:
        resp = httpx.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": "You are a financial analyst. Return only valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                "max_tokens": 2000,
                "temperature": 0.1,
            },
            timeout=40.0,
        )
        resp.raise_for_status()
        raw = resp.json()["choices"][0]["message"]["content"].strip()

        # Extract JSON array
        start = raw.find("[")
        end   = raw.rfind("]") + 1
        classifications = json.loads(raw[start:end])

        # Merge classifications back with original headline data
        result = []
        cls_map = {c["index"]: c for c in classifications}
        for i, h in enumerate(headlines):
            cls = cls_map.get(i + 1, {})
            result.append({
                **h,
                "category":         cls.get("category", "GENERAL"),
                "impact_direction": cls.get("impact_direction", "NEUTRAL"),
                "impact_score":     float(cls.get("impact_score", 0.0)),
                "affected_sectors": cls.get("affected_sectors", []),
                "summary":          cls.get("summary", h["title"]),
            })
        return result

    except Exception:
        # LLM failed — return with basic classification
        return [
            {
                **h,
                "category":         "GENERAL",
                "impact_direction": "NEUTRAL",
                "impact_score":     0.0,
                "affected_sectors": [],
                "summary":          h["title"],
            }
            for h in headlines
        ]


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/news")
def get_market_news(limit: int = Query(20, ge=1, le=40)):
    """
    Fetch top market headlines from Indian financial RSS feeds and classify
    each headline by category, impact direction, and affected sectors via LLM.
    """
    headlines = _fetch_all_headlines(max_per_feed=limit)
    classified = _classify_headlines(headlines[:limit])

    # Sort: bearish + bullish items first, neutral last
    classified.sort(key=lambda x: abs(x.get("impact_score", 0.0)), reverse=True)

    return {
        "items":        classified,
        "total":        len(classified),
        "fetched_at":   datetime.now(timezone.utc).isoformat(),
        "groq_enabled": bool(os.getenv("GROQ_API_KEY")),
    }


@router.get("/news/sentiment")
def get_symbol_sentiment(symbols: str = Query(..., description="Comma-separated NSE symbols e.g. RELIANCE.NS,TCS.NS")):
    """
    Get Groq-powered sentiment scores for specific stocks from live RSS headlines.
    """
    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
    if not symbol_list:
        return {"headlines": [], "scores": {}}

    try:
        from groq_client import score_sentiment
        return score_sentiment(symbol_list)
    except Exception as e:
        return {"error": str(e), "headlines": [], "scores": {}}
