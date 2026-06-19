FROM python:3.12-slim

WORKDIR /app

# Install hatchling for pyproject.toml processing
RUN pip install --no-cache-dir hatchling

# Copy application files (including pyproject.toml)
COPY . .

# Install dependencies strictly from pyproject.toml
RUN pip install --no-cache-dir .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
