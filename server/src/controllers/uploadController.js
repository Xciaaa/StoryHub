const path = require('path');

const uploadImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }
  const url = `/uploads/${req.file.filename}`;
  return res.status(201).json({ url, filename: req.file.filename });
};

module.exports = { uploadImage };
