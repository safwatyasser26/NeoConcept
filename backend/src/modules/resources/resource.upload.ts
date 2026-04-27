import { S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";

export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export function uploadToS3() {
  const upload = multer({
    storage: multerS3({
      s3,
      bucket: process.env.AWS_S3_BUCKET!,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (_req, file, cb) => cb(null, `resources/${Date.now()}-${file.originalname}`),
    }),
  });

  return upload.single("file");
}
