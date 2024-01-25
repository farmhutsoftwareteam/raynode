const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');


const router = express.Router();

router.post('/process-file/:filePath', (req, res) => {
  const filePath = req.params.filePath;
  const fullPath = path.join('/server/files/directory', filePath);

  // Check if the file exists
  if (fs.existsSync(fullPath)) {
    // Process the file
    // ...

    res.status(200).send('File processed successfully');
  } else {
    res.status(404).send('File not found');
  }
});

module.exports = router;