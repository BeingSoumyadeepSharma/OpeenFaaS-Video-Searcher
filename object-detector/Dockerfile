FROM ghcr.io/openfaas/classic-watchdog:0.2.3 AS watchdog

FROM python:3.9-slim

COPY --from=watchdog /fwatchdog /usr/bin/fwatchdog
RUN chmod +x /usr/bin/fwatchdog

# System dependencies (from requirements.sys)
# Use HTTPS mirrors and retry apt operations to avoid transient network failures.
RUN set -eux; \
        if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
            sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources; \
        fi; \
        if [ -f /etc/apt/sources.list ]; then \
            sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list; \
        fi; \
        for attempt in 1 2 3; do \
            apt-get update && \
            apt-get install -y --no-install-recommends --fix-missing \
                libgl1 libglib2.0-0 jq patchelf && \
            break; \
            echo "apt-get failed on attempt ${attempt}, retrying..."; \
            sleep 5; \
        done; \
        rm -rf /var/lib/apt/lists/*

RUN mkdir -p /home/app/function
WORKDIR /home/app/function

# Install aisprint stub (no-op, allows original code to run unchanged)
COPY aisprint-stub /tmp/aisprint-stub
RUN pip install --no-cache-dir /tmp/aisprint-stub && rm -rf /tmp/aisprint-stub

# Install boto3 for S3 support (used by s3_helper.py in entry.sh)
RUN pip install --no-cache-dir boto3

# Install Python dependencies (from requirements.txt)
COPY object-detector/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    patchelf --clear-execstack /usr/local/lib/python3.9/site-packages/onnxruntime/capi/onnxruntime_pybind11_state.cpython-39-x86_64-linux-gnu.so

# Copy ONNX model and class names
COPY object-detector/onnx/ ./onnx/
COPY object-detector/cfg/ ./cfg/

# Copy S3 helper script (transparent S3 download/upload wrapper)
COPY s3-wrapper/s3_helper.py .
COPY s3-wrapper/queue_helper.py .

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
