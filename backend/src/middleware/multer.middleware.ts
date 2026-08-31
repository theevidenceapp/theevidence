import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./tmp");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname.replace(/\s+/g, "_"));
  },
});

const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg",
    "application/pdf",
    "text/csv",
    "application/vnd.ms-excel",
  ];

  if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith(".csv")) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, WEBP images, PDF, and CSV files are allowed"));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fieldSize: 50 * 1024 * 1024, // 50 MB text limit (Fixes "Field value too long" for base64 content)
    fileSize: 20 * 1024 * 1024,  // 20 MB file limit for PDFs and Cover Image
  },
});