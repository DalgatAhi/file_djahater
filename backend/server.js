const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const compressRoute = require('./src/routes/compress');
const compressVideoRoute = require('./src/routes/compress-video');
const upscaleRoute = require('./src/routes/upscale');
const removeBgRoute = require('./src/routes/remove-background');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure temp directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const compressedDir = path.join(__dirname, 'compressed');
[uploadsDir, compressedDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'DELETE'],
}));

app.use(express.json());

// Serve compressed files for download
app.use('/download', express.static(compressedDir));

// Routes
app.use('/api', compressRoute);
app.use('/api', compressVideoRoute);
app.use('/api', upscaleRoute);
app.use('/api', removeBgRoute);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`FileLite backend running on http://localhost:${PORT}`);
});
