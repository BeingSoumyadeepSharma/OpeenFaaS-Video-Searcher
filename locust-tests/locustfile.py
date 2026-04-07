import uuid
import random
import csv
import os
from locust import HttpUser, task

# Read configuration from environment variables
# Note: Locust passes host directly to self.client.base_url

csv_path = os.environ.get("CSV_FILE", os.path.join(os.path.dirname(__file__), "..", "videos.csv"))
video_inputs = []

try:
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if "input_video" in row:
                video_inputs.append(row["input_video"])
except Exception as e:
    print(f"Warning: Failed to read {csv_path}: {e}")

# Fallback if csv read fails or is empty
if not video_inputs:
    print("Warning: Using fallback video input.")
    video_inputs = ["s3://cloud-pipeline-loadtest-sharma/video_cut.mp4"]

class VideoSearcherUser(HttpUser):
    # Think time simulation defaults to 20 seconds
    def wait_time(self):
        mean_s = float(os.environ.get("THINK_TIME_S", "20.0"))
        # Exponential distribution formula for delay to simulate random arrivals
        return random.expovariate(1.0 / mean_s)

    @task
    def invoke_ffmpeg_0(self):
        if not video_inputs:
            return

        run_id = str(uuid.uuid4())
        bucket = "cloud-pipeline-loadtest-sharma"
        base_output = f"s3://{bucket}/run_{run_id}/"
        root_prefix = f"s3://{bucket}/run_{run_id}"
        
        # Choose a random video from the list
        input_video = random.choice(video_inputs)
        
        payload = {
            "run_id": run_id,
            "input": input_video,
            "output": f"{base_output}ffmpeg0",
            "root_prefix": root_prefix
        }
        
        # POST to /function/ffmpeg-0, mimicking the JMeter HTTP Request Defaults HTTP Header Manager
        headers = {
            "Content-Type": "application/json"
        }
        
        self.client.post("/function/ffmpeg-0", json=payload, headers=headers, name="ffmpeg-0 (Split Audio/Video)")
