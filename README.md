# Kirana Store Demand Suggestion Model

A beginner-friendly machine-learning project that uses daily product sales to estimate near-future demand and suggest replenishment quantities for a kirana store.

## What it does

- Generates sample daily sales data for demonstration.
- Builds date-aware sales features such as weekday, recent sales lags, and rolling averages.
- Compares simple seasonal-naive forecasting with Random Forest and Gradient Boosting.
- Uses chronological validation to avoid training on future data.
- Exposes product forecasts through a FastAPI service.
- Estimates reorder quantity using forecast demand, supplier lead time, safety stock, and current stock.

> **Important:** Generated data is only for testing the pipeline. Replace it with real store sales and stock records before relying on recommendations.

## Project structure

```text
suggestion-model/
├── app/
│   ├── __init__.py
│   ├── data_generator.py
│   ├── train.py
│   └── api.py
├── data/
├── models/
├── requirements.txt
└── README.md
```

## Run on Windows (PowerShell)

1. Install Python 3.10 or newer.
2. Open this project folder in VS Code.
3. Create and activate a virtual environment:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

4. Install dependencies:

```powershell
pip install -r requirements.txt
```

5. Generate sample data and train the model:

```powershell
python -m app.data_generator
python -m app.train
```

6. Start the API:

```powershell
uvicorn app.api:app --reload
```

7. Open the interactive API documentation at http://127.0.0.1:8000/docs.

## Data needed from a real store

At minimum, collect one row per product per day:

- date
- product name or product ID
- units sold
- selling price
- whether the product was available for sale / out of stock

For useful reorder suggestions, also collect current stock, supplier lead time in days, and the owner's preferred safety stock. Promotions and holidays improve forecasts when recorded consistently.

## Evaluation

The training workflow compares models using expanding chronological validation folds and Mean Absolute Error (MAE). It keeps the latest dates as a final holdout set. Lower MAE means the model's average forecast error is smaller in units sold.

MAPE can be misleading when actual sales are zero, so MAE and RMSE should be considered alongside it.

## API

After training, the service provides:

- `GET /health` — service status
- `GET /products` — products available in the trained data
- `GET /forecast?product=Milk&days=7&current_stock=10&lead_time_days=2` — demand forecast and reorder suggestion

Check `/docs` for the exact parameters and response format.
