#!/usr/bin/env python3
import base64
import json
import logging
import os
import signal
import sys
import time
from typing import Optional

import boto3
import requests


LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("sqs-bridge")

QUEUE_URL = os.environ["QUEUE_URL"]
TARGET_FUNCTION = os.environ["TARGET_FUNCTION"]
GATEWAY_URL = os.environ["GATEWAY_URL"].rstrip("/")
AWS_REGION = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")
WAIT_TIME_SECONDS = int(os.environ.get("WAIT_TIME_SECONDS", "20"))
VISIBILITY_TIMEOUT_SECONDS = int(os.environ.get("VISIBILITY_TIMEOUT_SECONDS", "300"))
MAX_MESSAGES = int(os.environ.get("MAX_MESSAGES", "1"))
IDLE_SLEEP_SECONDS = float(os.environ.get("IDLE_SLEEP_SECONDS", "1"))
REQUEST_TIMEOUT_SECONDS = int(os.environ.get("REQUEST_TIMEOUT_SECONDS", "900"))

OPENFAAS_USERNAME = os.environ.get("OPENFAAS_USERNAME")
OPENFAAS_PASSWORD = os.environ.get("OPENFAAS_PASSWORD")

sqs = boto3.client("sqs", region_name=AWS_REGION)

running = True


def _stop_handler(_signum, _frame):
    global running
    running = False
    logger.info("Shutdown signal received, stopping bridge loop")


signal.signal(signal.SIGINT, _stop_handler)
signal.signal(signal.SIGTERM, _stop_handler)


def _build_auth_header() -> Optional[str]:
    if not OPENFAAS_USERNAME or not OPENFAAS_PASSWORD:
        return None
    token = f"{OPENFAAS_USERNAME}:{OPENFAAS_PASSWORD}".encode("utf-8")
    return "Basic " + base64.b64encode(token).decode("utf-8")


def _invoke_function(message_body: str) -> requests.Response:
    url = f"{GATEWAY_URL}/function/{TARGET_FUNCTION}"
    headers = {"Content-Type": "application/json"}

    auth_header = _build_auth_header()
    if auth_header:
        headers["Authorization"] = auth_header

    return requests.post(
        url,
        data=message_body.encode("utf-8"),
        headers=headers,
        timeout=REQUEST_TIMEOUT_SECONDS,
    )


def _process_message(message):
    message_id = message.get("MessageId", "unknown")
    receipt_handle = message["ReceiptHandle"]
    message_body = message.get("Body", "")

    # Validate that queue payload is JSON before forwarding.
    try:
        json.loads(message_body)
    except json.JSONDecodeError:
        logger.error("Skipping non-JSON message id=%s", message_id)
        sqs.delete_message(QueueUrl=QUEUE_URL, ReceiptHandle=receipt_handle)
        return

    try:
        response = _invoke_function(message_body)
    except Exception as exc:
        logger.exception("Function call exception for message id=%s: %s", message_id, exc)
        return

    if 200 <= response.status_code < 300:
        sqs.delete_message(QueueUrl=QUEUE_URL, ReceiptHandle=receipt_handle)
        logger.info(
            "Delivered message id=%s to function=%s status=%s",
            message_id,
            TARGET_FUNCTION,
            response.status_code,
        )
    else:
        logger.error(
            "Function returned failure for message id=%s function=%s status=%s body=%s",
            message_id,
            TARGET_FUNCTION,
            response.status_code,
            response.text[:1000],
        )


def main():
    logger.info(
        "Starting SQS bridge queue=%s target_function=%s gateway=%s region=%s",
        QUEUE_URL,
        TARGET_FUNCTION,
        GATEWAY_URL,
        AWS_REGION,
    )

    while running:
        try:
            result = sqs.receive_message(
                QueueUrl=QUEUE_URL,
                MaxNumberOfMessages=MAX_MESSAGES,
                WaitTimeSeconds=WAIT_TIME_SECONDS,
                VisibilityTimeout=VISIBILITY_TIMEOUT_SECONDS,
                AttributeNames=["All"],
                MessageAttributeNames=["All"],
            )
        except Exception as exc:
            logger.exception("SQS receive_message failed: %s", exc)
            time.sleep(IDLE_SLEEP_SECONDS)
            continue

        messages = result.get("Messages", [])
        if not messages:
            time.sleep(IDLE_SLEEP_SECONDS)
            continue

        for message in messages:
            _process_message(message)

    logger.info("Bridge stopped")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
