import pandas as pd
import numpy as np
from angel_client import get_candles


class BacktestEngine:

    def __init__(self, symbol: str, start: str, end: str, capital: float = 100000):
        self.symbol  = symbol
        self.capital = capital
        candles = get_candles(symbol, interval="ONE_DAY", days_back=900)
        df = pd.DataFrame(candles)
        df["date"] = pd.to_datetime(df["date"])
        for col in ["open", "high", "low", "close", "volume"]:
            df[col] = df[col].astype(float)
        df = self._compute(df)
        self.df = df[(df["date"] >= start) & (df["date"] <= end)].reset_index(drop=True)

    def _compute(self, df: pd.DataFrame) -> pd.DataFrame:
        c = df["close"]
        h = df["high"]
        l = df["low"]

        df["SMA_50"]  = c.rolling(50).mean()
        df["SMA_200"] = c.rolling(200).mean()

        delta = c.diff()
        gain  = delta.clip(lower=0).rolling(14).mean()
        loss  = (-delta.clip(upper=0)).rolling(14).mean()
        df["RSI"] = 100 - (100 / (1 + gain / loss.replace(0, np.nan)))

        ema12 = c.ewm(span=12, adjust=False).mean()
        ema26 = c.ewm(span=26, adjust=False).mean()
        df["MACD"]     = ema12 - ema26
        df["MACD_SIG"] = df["MACD"].ewm(span=9, adjust=False).mean()

        sma20 = c.rolling(20).mean()
        std20 = c.rolling(20).std()
        df["BB_UPPER"] = sma20 + 2 * std20
        df["BB_LOWER"] = sma20 - 2 * std20

        return df.dropna().reset_index(drop=True)

    def run(self, strategy: str = "composite") -> dict:
        df = self.df.copy()
        df["signal"] = 0

        if strategy == "ma_crossover":
            df.loc[df["SMA_50"] > df["SMA_200"], "signal"] = 1
            df.loc[df["SMA_50"] < df["SMA_200"], "signal"] = -1
        elif strategy == "rsi":
            df.loc[df["RSI"] < 30, "signal"] = 1
            df.loc[df["RSI"] > 70, "signal"] = -1
        elif strategy == "macd":
            df.loc[df["MACD"] > df["MACD_SIG"], "signal"] = 1
            df.loc[df["MACD"] < df["MACD_SIG"], "signal"] = -1
        elif strategy == "bollinger":
            df.loc[df["close"] < df["BB_LOWER"], "signal"] = 1
            df.loc[df["close"] > df["BB_UPPER"], "signal"] = -1
        elif strategy == "composite":
            s = pd.Series(0, index=df.index)
            s += (df["SMA_50"] > df["SMA_200"]).astype(int)
            s -= (df["SMA_50"] < df["SMA_200"]).astype(int)
            s += (df["RSI"] < 30).astype(int) * 2
            s -= (df["RSI"] > 70).astype(int) * 2
            s += (df["MACD"] > df["MACD_SIG"]).astype(int)
            s -= (df["MACD"] < df["MACD_SIG"]).astype(int)
            df.loc[s >= 2,  "signal"] = 1
            df.loc[s <= -2, "signal"] = -1

        df["position"]        = df["signal"].replace(0, np.nan).ffill().fillna(0)
        df["market_ret"]      = df["close"].pct_change().fillna(0.0)
        df["strategy_ret"]    = (df["position"].shift(1) * df["market_ret"]).fillna(0.0)
        df["market_equity"]   = self.capital * (1 + df["market_ret"]).cumprod()
        df["strategy_equity"] = self.capital * (1 + df["strategy_ret"]).cumprod()


        sr = df["strategy_ret"].dropna()
        rf = 0.065 / 252

        equity   = df["strategy_equity"]
        roll_max = equity.cummax()
        drawdown = (equity - roll_max) / roll_max

        equity_curve = [
            {"date": str(row["date"])[:10],
             "strategy": round(float(row["strategy_equity"])),
             "market":   round(float(row["market_equity"]))}
            for _, row in df.iterrows()
        ]
        dd_curve = [
            {"date": str(row["date"])[:10], "drawdown": round(float(dd) * 100, 2)}
            for (_, row), dd in zip(df.iterrows(), drawdown)
        ]

        neg_sr = sr[sr < 0]
        sortino_denom = neg_sr.std() if len(neg_sr) > 0 else sr.std()

        return {
            "total_return":   round((equity.iloc[-1] / self.capital - 1) * 100, 2),
            "annual_return":  round(sr.mean() * 252 * 100, 2),
            "market_return":  round((df["market_equity"].iloc[-1] / self.capital - 1) * 100, 2),
            "alpha":          round((equity.iloc[-1] - df["market_equity"].iloc[-1]) / self.capital * 100, 2),
            "sharpe":         round((sr.mean() - rf) / sr.std() * np.sqrt(252), 2) if sr.std() > 0 else 0.0,
            "sortino":        round((sr.mean() - rf) / sortino_denom * np.sqrt(252), 2) if sortino_denom > 0 else 0.0,
            "max_drawdown":   round(drawdown.min() * 100, 2),
            "var_95":         round(float(np.percentile(sr, 5)) * 100, 2),
            "win_rate":       round((sr > 0).sum() / (sr != 0).sum() * 100, 2),
            "total_trades":   int((df["signal"] != df["signal"].shift(1)).sum()),
            "final_value":    round(float(equity.iloc[-1]), 2),
            "equity_curve":   equity_curve,
            "drawdown_curve": dd_curve,
        }
