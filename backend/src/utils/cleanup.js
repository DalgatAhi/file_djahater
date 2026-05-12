const fs = require('fs');

// Delete a file safely (no throw if missing)
function deleteFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Ignore cleanup errors
  }
}

// Remove files older than maxAgeMs from a directory (periodic sweep)
function sweepDirectory(dir, maxAgeMs = 30 * 60 * 1000) {
  try {
    const files = fs.readdirSync(dir);
    const now = Date.now();
    files.forEach(file => {
      const filePath = `${dir}/${file}`;
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
      }
    });
  } catch {
    // Ignore sweep errors
  }
}

module.exports = { deleteFile, sweepDirectory };
