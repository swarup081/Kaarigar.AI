# Both AI services in one container, on one port.
#
# A standalone APK needs a stable public address compiled in at build time,
# which means one deployment behind one URL. serve_all.py provides that;
# the individual services still run on their own for local development.

FROM python:3.12-slim

# ffmpeg backs the audio duration checks. Without it those gates are skipped
# rather than failing, but a too-long recording then costs a wasted model call.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Requirements first, so a code change does not reinstall dependencies.
COPY voice-cataloger/requirements.txt ./voice-requirements.txt
COPY pricing-engine/requirements.txt ./pricing-requirements.txt
RUN pip install --no-cache-dir -r voice-requirements.txt -r pricing-requirements.txt

COPY voice-cataloger/ ./voice-cataloger/
COPY pricing-engine/ ./pricing-engine/
COPY serve_all.py ./

# Never bake GEMINI_API_KEY into the image. Supply it at runtime as a secret.
ENV GEMINI_MODEL=gemini-3.6-flash \
    PYTHONUNBUFFERED=1

EXPOSE 8000

# Hosting platforms assign the port through $PORT; 8000 is the local default.
CMD ["sh", "-c", "uvicorn serve_all:app --host 0.0.0.0 --port ${PORT:-8000}"]
