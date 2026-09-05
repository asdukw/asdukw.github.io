FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml README.md ./
COPY app ./app
COPY scripts ./scripts
COPY alembic.ini ./alembic.ini
COPY alembic ./alembic

RUN python -m pip install --no-cache-dir .

ENV PYTHONUNBUFFERED=1
ENV PORT=8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
