import { Role } from "../../generated/prisma/client";
import express from "express";
import checkCourseExists from "../../middlewares/checkCourseExists";
import verifyCourseMember from "../../middlewares/verifyCourseMember";
import { protect } from "../../middlewares/protect";
import { restrict } from "../../middlewares/restrict";
import { ResourceController } from "./resource.controller";
import { uploadToS3 } from "./resource.upload";
import { validate } from "../../middlewares/validate";
import { ResourceValidationSchemas } from "./resource.validation";

const router = express.Router({ mergeParams: true });

router.get(
  "/",
  protect,
  validate({ params: ResourceValidationSchemas.courseIdParams }),
  checkCourseExists,
  verifyCourseMember,
  ResourceController.getMany,
);

router.get(
  "/:id",
  protect,
  validate({ params: ResourceValidationSchemas.idParams }),
  checkCourseExists,
  verifyCourseMember,
  ResourceController.get,
);

router.post(
  "/upload",
  protect,
  restrict(Role.INSTRUCTOR),
  validate({ params: ResourceValidationSchemas.courseIdParams }),
  checkCourseExists,
  verifyCourseMember,
  uploadToS3(),
  ResourceController.upload,
);

router.get(
  "/:id/download",
  protect,
  validate({ params: ResourceValidationSchemas.idParams }),
  checkCourseExists,
  verifyCourseMember,
  ResourceController.download,
);


router.delete(
  "/:id",
  protect,
  restrict(Role.INSTRUCTOR),
  validate({ params: ResourceValidationSchemas.idParams }),
  checkCourseExists,
  verifyCourseMember,
  ResourceController.delete,
);

export default router;
