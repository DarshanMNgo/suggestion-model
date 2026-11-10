"""Train and compare baseline, Random Forest, and Gradient Boosting models.

Run after generating data: python -m app.train
"""
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "sales.csv"
MODEL_DIR = ROOT / "models"
FEATURES = [
    "day_of_week", "day_of_month", "month", "is_weekend", "promotion",
    "lag_1", "lag_7", "rolling_mean_7", "rolling_mean_28",
]


def make_features(frame: pd.DataFrame) -> pd.DataFrame:
    """Create lag and calendar features separately for each product."""
    frame = frame.sort_values(["product", "date"]).copy()
    frame["date"] = pd.to_datetime(frame["date"])
    frame["day_of_week"] = frame["date"].dt.dayofweek
    frame["day_of_month"] = frame["date"].dt.day
    frame["month"] = frame["date"].dt.month
    frame["is_weekend"] = (frame["day_of_week"] >= 5).astype(int)
    grouped = frame.groupby("product", group_keys=False)["units_sold"]
    frame["lag_1"] = grouped.shift(1)
    frame["lag_7"] = grouped.shift(7)
    frame["rolling_mean_7"] = grouped.transform(lambda s: s.shift(1).rolling(7).mean())
    frame["rolling_mean_28"] = grouped.transform(lambda s: s.shift(1).rolling(28).mean())
    return frame.dropna(subset=FEATURES + ["units_sold"]).reset_index(drop=True)


def main() -> None:
    if not DATA_PATH.exists():
        raise FileNotFoundError("Run 'python -m app.data_generator' first.")

    raw = pd.read_csv(DATA_PATH, parse_dates=["date"])
    data = make_features(raw)
    unique_dates = np.array(sorted(data["date"].unique()))
    split_at = int(len(unique_dates) * 0.80)
    train_dates, test_dates = unique_dates[:split_at], unique_dates[split_at:]
    train = data[data["date"].isin(train_dates)].copy()
    test = data[data["date"].isin(test_dates)].copy()

    candidates = {
        "RandomForest": RandomForestRegressor(
            n_estimators=250, max_depth=12, min_samples_leaf=2,
            random_state=42, n_jobs=-1,
        ),
        "GradientBoosting": GradientBoostingRegressor(
            n_estimators=150, learning_rate=0.05, max_depth=2,
            loss="huber", random_state=42,
        ),
    }

    # Expanding-window validation: every validation fold is later than its training fold.
    train_unique = np.array(sorted(train["date"].unique()))
    fold_size = max(7, len(train_unique) // 5)
    validation_scores = {name: [] for name in candidates}
    for fold in range(3):
        val_start = max(28, len(train_unique) - (3 - fold) * fold_size)
        val_end = min(len(train_unique), val_start + fold_size)
        if val_start >= val_end:
            continue
        fold_train_dates = train_unique[:val_start]
        fold_val_dates = train_unique[val_start:val_end]
        fold_train = train[train["date"].isin(fold_train_dates)]
        fold_val = train[train["date"].isin(fold_val_dates)]
        for name, model in candidates.items():
            model.fit(fold_train[FEATURES], fold_train["units_sold"])
            prediction = np.maximum(0, model.predict(fold_val[FEATURES]))
            validation_scores[name].append(mean_absolute_error(fold_val["units_sold"], prediction))

    # Seasonal-naive baseline predicts the same weekday's previous-week sales.
    baseline_mae = mean_absolute_error(test["units_sold"], test["lag_7"])
    mean_cv = {
        name: float(np.mean(scores)) if scores else float("inf")
        for name, scores in validation_scores.items()
    }
    best_name = min(mean_cv, key=mean_cv.get)
    if mean_cv[best_name] >= baseline_mae:
        print("Note: baseline MAE is lower than model CV MAE on this holdout comparison.")

    best_model = candidates[best_name]
    best_model.fit(train[FEATURES], train["units_sold"])
    test_prediction = np.maximum(0, best_model.predict(test[FEATURES]))
    mae = mean_absolute_error(test["units_sold"], test_prediction)
    rmse = mean_squared_error(test["units_sold"], test_prediction) ** 0.5

    # Refit on all available feature rows for deployment after evaluating the holdout.
    best_model.fit(data[FEATURES], data["units_sold"])
    MODEL_DIR.mkdir(exist_ok=True)
    bundle = {
        "model": best_model,
        "model_name": best_name,
        "features": FEATURES,
        "history": raw.sort_values(["product", "date"]).to_dict(orient="records"),
        "metrics": {
            "holdout_mae": float(mae),
            "holdout_rmse": float(rmse),
            "baseline_mae": float(baseline_mae),
            "cross_validation_mae": mean_cv,
        },
    }
    joblib.dump(bundle, MODEL_DIR / "demand_model.joblib")
    print(f"Selected model: {best_name}")
    print(f"Holdout MAE: {mae:.2f} units")
    print(f"Holdout RMSE: {rmse:.2f} units")
    print(f"Seasonal-naive baseline MAE: {baseline_mae:.2f} units")
    print(f"Saved model to {MODEL_DIR / 'demand_model.joblib'}")


if __name__ == "__main__":
    main()
