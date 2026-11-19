FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY pyproject.toml uv.lock ./
RUN --mount=from=ghcr.io/astral-sh/uv:0.13.9,source=/uv,target=/usr/local/bin/uv \
    uv sync --locked --no-dev --no-cache --python /usr/local/bin/python

COPY scores ./scores
RUN useradd --uid 10001 --user-group --create-home app \
    && mkdir /app/instance \
    && chown app:app /app/instance

USER app
EXPOSE 8001
CMD ["/app/.venv/bin/uvicorn", "scores:create_app", "--factory", "--host", "0.0.0.0", "--port", "8001", "--root-path", "/api", "--proxy-headers", "--forwarded-allow-ips", "*"]
