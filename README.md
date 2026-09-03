# FileLite

FileLite is a full-stack file utility service for image compression, video compression, audio extraction, video downloads, background removal, and image upscaling.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://dashboard.render.com/blueprint/new?repo=https%3A%2F%2Fgithub.com%2FDalgatAhi%2Ffile_djahater)

## Local development

Start the backend:

```sh
cd backend
npm run dev
```

Start the frontend:

```sh
cd frontend
npm run dev
```

Open `http://localhost:5173`.

## Deploy as a public website

This project is ready for Docker hosting. The Docker container builds the frontend and serves it from the backend, so the deployed app runs from one HTTPS URL.

Recommended quick path with Render:

1. Push this repository to GitHub.
2. In Render, choose **New** -> **Blueprint**.
3. Connect the repository.
4. Render will read `render.yaml` and create the web service.
5. Open the Render URL after the first deploy finishes.

The app exposes `/health` for hosting health checks.

Optional environment variable:

- `YOUTUBE_COOKIES`: base64-encoded Netscape cookies file content. This can help when YouTube blocks server-side downloads.
