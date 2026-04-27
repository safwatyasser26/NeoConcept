import { z } from "zod";
import { Status } from "../../generated/prisma";

export class UserValidationSchemas {
  static updateBody = z
    .object({
      username: z.string().trim().min(1, "Username must be at least 1 character long").optional(),
      password: z.string().min(6, "Password must be at least 6 characters long").optional(),
    })
    .refine((data) => data.username || data.password, {
      message: "Username or password is required",
      path: ["body"],
    });

  static courseIdBody = z.object({
    courseId: z.string().uuid("Invalid course id"),
  });

  static trackIdBody = z.object({
    trackId: z.string().uuid("Invalid track id"),
  });

  static quitTrackBody = z.object({
    trackId: z.string().uuid("Invalid track id"),
  });

  static getUserStaffRequestsQuery = z.object({
    status: z.nativeEnum(Status).optional(),
    search: z.string().optional(),
  });

  static getUserStudentRequestsQuery = z.object({
    status: z.nativeEnum(Status).optional(),
    search: z.string().optional(),
  });
}

export type UpdateBody = z.infer<typeof UserValidationSchemas.updateBody>;
export type CourseIdBody = z.infer<typeof UserValidationSchemas.courseIdBody>;
export type TrackIdBody = z.infer<typeof UserValidationSchemas.trackIdBody>;
export type QuitTrackBody = z.infer<typeof UserValidationSchemas.quitTrackBody>;
export type GetUserStaffRequestsQuery = z.infer<typeof UserValidationSchemas.getUserStaffRequestsQuery>;
export type GetUserStudentRequestsQuery = z.infer<typeof UserValidationSchemas.getUserStudentRequestsQuery>;
