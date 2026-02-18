FROM ghcr.io/openfaas/classic-watchdog:0.2.3 AS watchdog

FROM python:3.9-slim

COPY --from=watchdog /fwatchdog /usr/bin/fwatchdog
RUN chmod +x /usr/bin/fwatchdog

# System dependencies (from requirements.sys)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 jq \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /home/app/function
WORKDIR /home/app/function

# Install aisprint stub (no-op, allows original code to run unchanged)
COPY aisprint-stub /tmp/aisprint-stub
RUN pip install --no-cache-dir /tmp/aisprint-stub && rm -rf /tmp/aisprint-stub

# Install Python dependencies (from requirements.txt)
COPY object-detector/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy ONNX model and class names
COPY object-detector/onnx/ ./onnx/
COPY object-detector/cfg/ ./cfg/

# Copy original code — UNTOUCHED
COPY object-detector/main.py .
COPY object-detector/postprocess.py .
COPY object-detector/entry.sh .
RUN chmod +x entry.sh

ENV fprocess="/home/app/function/entry.sh"
ENV write_timeout="600s"
ENV read_timeout="600s"
ENV exec_timeout="600s"

HEALTHCHECK --interval=3s CMD [ -e /tmp/.lock ]

CMD ["fwatchdog"]
