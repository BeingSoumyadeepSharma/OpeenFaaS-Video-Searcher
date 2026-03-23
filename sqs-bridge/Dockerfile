FROM python:3.11-slim

WORKDIR /app

COPY sqs-bridge/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY sqs-bridge/consumer.py .

CMD ["python", "consumer.py"]
