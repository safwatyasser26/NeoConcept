import { z } from "zod";

export class ResourceValidationSchemas {
  static courseIdParams = z.object({
    courseId: z.string(),
  });

  static idParams = z.object({
    courseId: z.string(),
    id: z.string(),
  });

  static uploadBody = z.object({
    courseId: z.string(),
  });
}

export type CourseIdParams = z.infer<typeof ResourceValidationSchemas.courseIdParams>;
export type IdParams = z.infer<typeof ResourceValidationSchemas.idParams>;
export type UploadBody = z.infer<typeof ResourceValidationSchemas.uploadBody>;
