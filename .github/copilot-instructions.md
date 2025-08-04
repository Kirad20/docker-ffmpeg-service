# FFmpeg Web Service API - Coding Guide

## Project Overview
This is a Node.js Express API service that provides HTTP endpoints for converting audio/video files using FFmpeg. The service accepts files via POST requests, processes them with FFmpeg, and returns the converted files in the specified format.

## Architecture

### Core Components
- **app.js**: Main application entry point that sets up Express routes and middleware
- **app/constants.js**: Configuration parameters (file size limits, port, timeout)
- **app/endpoints.js**: Defines conversion endpoints and FFmpeg parameters
- **Dockerfile**: Container configuration based on jrottenberg/ffmpeg:centos

### Data Flow
1. Client uploads file via POST request to an endpoint (e.g., `/mp3`)
2. File is saved to temp location with unique filename
3. FFmpeg processes the file using parameters defined in endpoints.js
4. Converted file is sent back to client
5. Temporary files are cleaned up

## Key Conventions

### Adding New Conversion Endpoints
To add a new endpoint, edit `app/endpoints.js` and add a new entry to the `types` object:

```javascript
// Example for adding a new webm endpoint in endpoints.js
exports.types = {
    // ... existing endpoints
    webm: {
        extension: 'webm',
        outputOptions: [
            '-c:v libvpx-vp9',
            '-b:v 2M'
        ],
    },
};
```

The key (e.g., `webm`) becomes the endpoint path (`/webm`).

### Video Compression Endpoints
The service provides specialized endpoints for video compression:

- `/compress-mp4`: Compresses video to MP4 format with approximately 60% size reduction
- `/compress-webm`: Compresses video to WebM format with approximately 60% size reduction

Example usage:
```bash
# Compress a video to MP4 with ~60% size reduction
curl -F "file=@input.mp4" 127.0.0.1:3000/compress-mp4 > compressed.mp4

# Compress a video to WebM with ~60% size reduction
curl -F "file=@input.mp4" 127.0.0.1:3000/compress-webm > compressed.webm
```

### Error Handling
The service uses Winston for logging. All operations are wrapped in error handlers that:
1. Log the error via Winston
2. Return appropriate HTTP status codes to the client
3. Clean up temporary files

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Start the service
node app.js

# Lint code
./node_modules/.bin/eslint .
```

### Docker Workflow
```bash
# Build image
docker build -t surebert/docker-ffpmeg .

# Run container with local storage mount
docker run -d \
    --name ffmpeg-service \
    --restart=always \
    -v /storage/tmpfs:/usr/src/app/uploads \
    -p 127.0.0.1:9025:3000 \
    surebert/docker-ffpmeg
```

## Configuration
- Default port: 3000 (set in constants.js)
- Max file size: 500MB (constants.js: `fileSizeLimit`)
- Connection timeout: 1 hour (constants.js: `timeout`)

## Integration Testing
Test endpoints with curl:
```bash
curl -F "file=@input.wav" 127.0.0.1:3000/mp3 > output.mp3
```

## Deployment

### CapRover Deployment
The service includes configuration for deployment on CapRover, a self-hosted PaaS:

1. **Required Files**:
   - `captain-definition`: Points to the Dockerfile for building
   - `.dockerignore`: Excludes unnecessary files from the build
   - `DEPLOY-CAPROVER.md`: Detailed deployment instructions

2. **Deployment Steps**:
   ```bash
   # Log in to CapRover
   caprover login
   
   # Create a new app
   caprover create
   
   # Deploy the application
   caprover deploy
   ```

3. **Important Considerations**:
   - Configure persistent storage for `/usr/src/app/uploads`
   - Adjust resource allocation for video processing
   - Set appropriate timeout values for large file uploads

For complete deployment instructions, refer to `DEPLOY-CAPROVER.md`.
