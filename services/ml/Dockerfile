FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /srv
# LightGBM needs the OpenMP runtime
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*
COPY services/ml/requirements.txt services/ml/requirements.txt
RUN pip install -r services/ml/requirements.txt
COPY services/ml services/ml
COPY data/demo data/demo
ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --app-dir services/ml --host 0.0.0.0 --port ${PORT}"]
