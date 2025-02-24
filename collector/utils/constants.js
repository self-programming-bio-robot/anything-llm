const path = require("path");

const WATCH_DIRECTORY = process.env.NODE_ENV === "development"
  ? path.resolve(__dirname, "../hotdir")
  : path.resolve(process.env.STORAGE_DIR, `collector/hotdir`);

const ACCEPTED_MIMES = {
  "text/plain": [".txt", ".md"],
  "text/html": [".html"],

  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
    ".pptx",
  ],

  "application/vnd.oasis.opendocument.text": [".odt"],
  "application/vnd.oasis.opendocument.presentation": [".odp"],

  "application/pdf": [".pdf"],
  "application/mbox": [".mbox"],

  "audio/wav": [".wav"],
  "audio/mpeg": [".mp3"],

  "video/mp4": [".mp4"],
  "video/mpeg": [".mpeg"],
};

const SUPPORTED_FILETYPE_CONVERTERS = {
  ".txt": "./convert/asTxt.js",
  ".md": "./convert/asTxt.js",
  ".html": "./convert/asTxt.js",
  ".pdf": "./convert/asPDF.js",

  ".docx": "./convert/asDocx.js",
  ".pptx": "./convert/asOfficeMime.js",

  ".odt": "./convert/asOfficeMime.js",
  ".odp": "./convert/asOfficeMime.js",

  ".mbox": "./convert/asMbox.js",

  ".mp3": "./convert/asAudio.js",
  ".wav": "./convert/asAudio.js",
  ".mp4": "./convert/asAudio.js",
  ".mpeg": "./convert/asAudio.js",
};

module.exports = {
  SUPPORTED_FILETYPE_CONVERTERS,
  WATCH_DIRECTORY,
  ACCEPTED_MIMES,
};
