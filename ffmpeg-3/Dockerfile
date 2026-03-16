FROM ghcr.io/openfaas/classic-watchdog:0.2.3 AS watchdog

FROM python:3.9-slim

COPY --from=watchdog /fwatchdog /usr/bin/fwatchdog
RUN chmod +x /usr/bin/fwatchdog

# System dependencies (from requirements.sys)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg jq \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /home/app/function
WORKDIR /home/app/function

# Install aisprint stub (no-op, allows original code to run unchanged)
COPY aisprint-stub /tmp/aisprint-stub
RUN pip install --no-cache-dir /tmp/aisprint-stub && rm -rf /tmp/aisprint-stub

# Install boto3 for S3 support (used by s3_helper.py in entry.sh)
RUN pip install --no-cache-dir boto3

# Copy S3 helper script (transparent S3 download/upload wrapper)
COPY s3-wrapper/s3_helper.py .

# Copy original code — UNTOUCHED
COPY ffmpeg-3/main.py .
COPY ffmpeg-3/entry.sh .
RUN chmod +x entry.sh

ENV fprocess="/home/app/function/entry.sh"
ENV write_timeout="600s"
ENV read_timeout="600s"
ENV exec_timeout="600s"

HEALTHCHECK --interval=3s CMD [ -e /tmp/.lock ]

CMD ["fwatchdog"]
