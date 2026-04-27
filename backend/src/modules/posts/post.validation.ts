import { z } from "zod";

export class PostValidationSchemas {
  static getManyQuery = z.object({
    search: z.string().optional(),
  });

  static courseIdParams = z.object({
    courseId: z.string().uuid("Invalid course ID"),
  });

  static idParams = z.object({
    courseId: z.string().uuid("Invalid course ID"),
    id: z.string().uuid("Invalid post ID"),
  });

  static createBody = z.object({
    title: z
      .string()
      .min(1, "Title must be at least 1 character long")
      .max(255, "Title must be at most 255 characters long")
      .trim(),
    content: z.string().min(1, "Content must be at least 1 character long").trim(),
  });

  static updateBody = z
    .object({
      title: z
        .string()
        .min(1, "Title must be at least 1 character long")
        .max(255, "Title must be at most 255 characters long")
        .trim()
        .optional(),
      content: z.string().min(1, "Content must be at least 1 character long").trim().optional(),
    })
    .refine((data) => data.title || data.content, {
      message: "Title or content is required",
    });
}

export type GetManyQuery = z.infer<typeof PostValidationSchemas.getManyQuery>;
export type CourseIdParams = z.infer<typeof PostValidationSchemas.courseIdParams>;
export type IdParams = z.infer<typeof PostValidationSchemas.idParams>;
export type CreateBody = z.infer<typeof PostValidationSchemas.createBody>;
export type UpdateBody = z.infer<typeof PostValidationSchemas.updateBody>;
