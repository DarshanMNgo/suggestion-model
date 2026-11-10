"""Create realistic-looking sample daily sales data for pipeline testing.

The generated data is synthetic. It is not a substitute for a shop's real records.
Run: python -m app.data_generator
"""
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
PRODUCTS = {
    "Milk": (22, 4.0),
    "Rice": (8, 1.8),
    "Bread": (15, 3.0),
    "Biscuits": (18, 4.0),
    "Cooking Oil": (6, 1.5),
    "Eggs": (20, 3.5),
    "Sugar": (10, 2.0),
    "Soft Drinks": (12, 3.0),
}


def generate_sales(days: int = 540, seed: int = 42) -> pd.DataFrame:
    """Return one row per product per day with a few useful store signals."""
    rng = np.random.default_rng(seed)
    dates = pd.date_range(end=pd.Timestamp.today().normalize(), periods=days, freq="D")
    rows = []

    for product, (base, noise) in PRODUCTS.items():
        product_offset = rng.uniform(0, 2 * np.pi)
        for i, date in enumerate(dates):
            weekend_boost = 1.20 if date.dayofweek >= 5 else 1.0
            weekly_pattern = 1 + 0.10 * np.sin(2 * np.pi * date.dayofweek / 7 + product_offset)
            monthly_pattern = 1 + 0.08 * np.sin(2 * np.pi * date.dayofyear / 30.4)
            promotion = int(rng.random() < 0.07)
            promo_boost = 1.30 if promotion else 1.0
            expected = base * weekend_boost * weekly_pattern * monthly_pattern * promo_boost
            units = max(0, int(round(rng.normal(expected, noise))))
            price = round(float(rng.uniform(0.97, 1.03) * (10 if product in {"Milk", "Bread"} else 50)), 2)
            # Simulate occasional stock-outs; observed sales can be lower than demand.
            in_stock = int(rng.random() >= 0.025)
            if not in_stock:
                units = 0
            rows.append({
                "date": date,
                "product": product,
                "units_sold": units,
                "price": price,
                "promotion": promotion,
                "in_stock": in_stock,
            })

    result = pd.DataFrame(rows).sort_values(["product", "date"]).reset_index(drop=True)
    return result


if __name__ == "__main__":
    DATA_DIR.mkdir(exist_ok=True)
    output = DATA_DIR / "sales.csv"
    generate_sales().to_csv(output, index=False)
    print(f"Created {output}")
