# ffmpeg web service API

An web service for converting audio/video files using Nodejs, Express and FFMPEG.

Based on jrottenberg/ffmpeg 6.0 container with Ubuntu 22.04.

## Endpoints

### Audio Conversion
> POST /convert/audio/to/mp3 - Convert audio file to MP3 format
> POST /convert/audio/to/m4a - Convert audio file to M4A format (AAC)
> POST /convert/audio/to/wav - Convert audio file to WAV format

### Video Conversion
> POST /convert/video/to/mp4 - Convert video file to MP4 format (H.264)
> POST /convert/video/to/webm - Convert video file to WebM format (VP9)

### Image Conversion
> POST /convert/image/to/jpg - Convert image file to JPG format

### Video Compression
> POST /video/compress/to/mp4 - Compress video to MP4 with ~60% size reduction
> POST /video/compress/to/webm - Compress video to WebM with ~60% size reduction
> POST /video/compress/to/hevc - Convert video to HEVC (H.265) with 70-80% reduction
> POST /video/compress/to/av1 - Convert video to AV1 format with up to 85% reduction

### API Info
> GET / - Web Service Readme
> GET /endpoints - List all available endpoints

## Usage Examples

Curl Examples:

> curl -F "file=@input.wav" 127.0.0.1:3000/convert/audio/to/mp3 > output.mp3

> curl -F "file=@input.m4a" 127.0.0.1:3000/convert/audio/to/mp3 > output.mp3

> curl -F "file=@input.mov" 127.0.0.1:3000/convert/video/to/mp4 > output.mp4

> curl -F "file=@input.mp4" 127.0.0.1:3000/video/compress/to/mp4 > compressed.mp4

> curl -F "file=@input.mp4" 127.0.0.1:3000/video/compress/to/hevc > compressed_hevc.mp4

> curl -F "file=@input.tiff" 127.0.0.1:3000/convert/image/to/jpg > output.jpg

> curl -F "file=@input.png" 127.0.0.1:3000/convert/image/to/jpg > output.jpg

## Configuration and New Endpoints
You can change the ffmpeg conversion settings or add new endpoints by editing 
the /app/endpoints.js file

## Installation

Requires local Node and FFMPEG installation.

1) Install FFMPEG https://ffmpeg.org/download.html

2) Install node https://nodejs.org/en/download/
Using homebrew:
> $ brew install node

## Dev - Running Local Node.js Web Service

Navigate to project directory and:

Install dependencies:
> $ npm install

Start app:
> $ node app.js

Check for errors with ESLint:
> $ ./node_modules/.bin/eslint .

## Running Local Docker Container

Build Docker Image from Dockerfile with a set image tag. ex: docker-ffpmeg
> $ docker build -t surebert/docker-ffpmeg .

Launch Docker Container from Docker Image, exposing port 9025 on localhost only

> docker run -d \
    --name ffmpeg-service \
    --restart=always \
    -v /storage/tmpfs:/usr/src/app/uploads \
    -p 127.0.0.1:9025:3000 \
    surebert/docker-ffpmeg

Launch Docker Container from Docker Image, exposing port 9026 on all IPs
> docker run -p 9025:3000 -d surebert/docker-ffpmeg
