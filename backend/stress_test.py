from angel_client import get_candles

SCENARIOS = {
    "covid_2020":          ("2020-01-15", "2020-03-24"),
    "bear_2022":           ("2022-01-01", "2022-06-17"),
    "demonetisation_2016": ("2016-11-08", "2016-12-26"),
    "adani_2023":          ("2023-01-24", "2023-02-22"),
    "il_fs_2018":          ("2018-09-21", "2018-10-26"),
}

SCENARIO_LABELS = {
    "covid_2020":          "COVID Crash 2020",
    "bear_2022":           "Bear Market 2022",
    "demonetisation_2016": "Demonetisation 2016",
    "adani_2023":          "Adani Crisis 2023",
    "il_fs_2018":          "IL&FS Crisis 2018",
}


def _period_return(symbol: str, start: str, end: str) -> float:
    import pandas as pd
    candles = get_candles(symbol, interval="ONE_DAY", days_back=2000)
    if not candles:
        return -10.0
    df = pd.DataFrame(candles)
    df["date"] = pd.to_datetime(df["date"])
    window = df[(df["date"] >= start) & (df["date"] <= end)]
    if len(window) < 2:
        return -10.0
    p0 = float(window.iloc[0]["close"])
    p1 = float(window.iloc[-1]["close"])
    return round((p1 - p0) / p0 * 100, 2)


def run_stress_test(portfolio: dict, scenario: str, custom_drop: float = None) -> dict:
    """
    portfolio = {"RELIANCE.NS": 0.15, "TCS.NS": 0.12, ...}
    scenario  = key from SCENARIOS or "custom"
    """
    tickers = list(portfolio.keys())

    if scenario == "custom" and custom_drop is not None:
        stock_impacts = {}
        for ticker in tickers:
            try:
                import yfinance as yf
                beta = yf.Ticker(ticker).info.get("beta", 1.0) or 1.0
            except Exception:
                beta = 1.0
            stock_impacts[ticker] = round(custom_drop * beta, 2)
        nifty_drop  = custom_drop
        description = f"Custom Shock: Nifty -{abs(custom_drop):.1f}%"

    else:
        if scenario not in SCENARIOS:
            scenario = "covid_2020"
        start, end = SCENARIOS[scenario]
        nifty_drop  = _period_return("^NSEI", start, end)
        description = SCENARIO_LABELS.get(scenario, scenario)

        stock_impacts = {}
        for ticker in tickers:
            impact = _period_return(ticker, start, end)
            stock_impacts[ticker] = impact if impact != -10.0 else nifty_drop

    portfolio_after = 0.0
    for ticker, weight in portfolio.items():
        drop   = stock_impacts.get(ticker, nifty_drop) / 100
        portfolio_after += weight * (1 + drop)

    portfolio_loss = round((portfolio_after - 1.0) * 100, 2)

    return {
        "scenario":           description,
        "nifty_drop":         nifty_drop,
        "portfolio_before":   100.0,
        "portfolio_after":    round(portfolio_after * 100, 2),
        "portfolio_loss_pct": portfolio_loss,
        "stock_impacts":      [{"symbol": k, "impact": v} for k, v in stock_impacts.items()],
        "worst_stock":        min(stock_impacts, key=stock_impacts.get) if stock_impacts else "",
        "best_stock":         max(stock_impacts, key=stock_impacts.get) if stock_impacts else "",
    }
