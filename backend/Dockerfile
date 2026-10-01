FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/yt && /opt/yt/bin/pip install --no-cache-dir yt-dlp
ENV PATH="/opt/yt/bin:${PATH}"
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
RUN node --version && python3 --version && yt-dlp --version && ffmpeg -version
ENV PORT=4000
EXPOSE 4000
CMD ["npm","run","start:all"]
