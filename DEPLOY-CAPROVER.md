# Deploying FFmpeg Web Service on CapRover

This guide provides instructions for deploying this FFmpeg Web Service on a CapRover server.

## Prerequisites

- A CapRover server already set up and running
- CapRover CLI installed on your local machine (`npm install -g caprover`)
- Git installed on your local machine

## Deployment Steps

### 1. Log in to CapRover

```bash
caprover login
```

Follow the prompts to enter your CapRover server URL and password.

### 2. Create a New App on CapRover

```bash
caprover create
```

Choose a name for your app (e.g., `ffmpeg-service`).

### 3. Deploy the Application

From the project directory, run:

```bash
caprover deploy
```

Select the app you created in the previous step.

### 4. Configure Environment Variables (Optional)

If you need to customize the service, you can set environment variables in the CapRover dashboard:

- Go to your CapRover dashboard
- Navigate to "Apps" and select your FFmpeg service app
- Go to the "Environmental Variables" tab
- Add your variables (e.g., `PORT=3000`)

### 5. Set Persistent Storage

Since FFmpeg processes files temporarily, you should set up a persistent storage directory for the uploads:

1. In the CapRover dashboard, go to your app
2. Navigate to the "Persistent Data" tab
3. Add a new directory mapping:
   - Path in app: `/usr/src/app/uploads`
   - Label: `ffmpeg-uploads`

### 6. Update Deployment Settings (Optional)

For better performance with video processing:

1. Go to the "Deployment" tab
2. Increase the allocated resources (CPU, RAM)
3. Adjust the "Instance Count" based on your needs

## Testing the Deployment

After deployment, you can test the service using curl:

```bash
curl -F "file=@input.mp3" https://your-app-name.your-captain-domain.com/mp4 > output.mp4
```

## Troubleshooting

- If you encounter memory issues, increase the allocated RAM in the CapRover dashboard
- For large file uploads, you might need to adjust Nginx settings on your CapRover server
- Check the logs in the CapRover dashboard for any errors
