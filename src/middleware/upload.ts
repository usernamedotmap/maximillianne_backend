import { Request, Response, NextFunction } from "express";
import multer, { FileFilterCallback } from "multer";

const MAX_FILES_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type '${file.mimetype}'. Only JPEG, PNG, and webP image are allowed.`,
      ),
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILES_SIZE_BYTES,
    files: 1,
  },
  fileFilter,
});

export const uploadPaymentProof = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const singleUpload = upload.single("proof");

  singleUpload(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          error: {
            code: "FILE_TOO_LARGE",
            message:
              "Payment proof file exceeds the 5MB maximum allowed limit.",
          },
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          code: "UPLOAD_ERROR",
          message: err.message,
        },
      });
    } else if (err instanceof Error) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_FILE_TYPE",
          message: err.message,
        },
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Field 'proof' is required with a  valid image file.",
        },
      });
    }

    next();
  });
};
