FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for WeasyPrint
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libpangocairo-1.0-0 \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    shared-mime-info \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Install hatchling for pyproject.toml processing
RUN pip install --no-cache-dir hatchling

# Copy application files (including pyproject.toml)
COPY . .

# Install dependencies strictly from pyproject.toml
RUN pip install --no-cache-dir .[dev]

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
