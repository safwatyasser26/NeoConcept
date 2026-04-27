import { Request, Response, NextFunction } from "express";
import { ResourceService } from "./resource.service";
import { HTTPStatusText } from "../../types/HTTPStatusText";
import { SuccessMessages } from "../../types/successMessages";
import { CourseIdParams, IdParams, UploadBody } from "./resource.validation";

export class ResourceController {
  static async getMany(_req: Request, res: Response, next: NextFunction) {
    try {
      const { courseId } = res.locals.params as CourseIdParams;
      const data = await ResourceService.getResources(courseId);

      res.status(200).json({ status: HTTPStatusText.SUCCESS, data });
    } catch (err) {
      next(err);
    }
  }

  static async get(_req: Request, res: Response, next: NextFunction) {
    try {
      const { courseId, id } = res.locals.params as IdParams;
      const data = await ResourceService.getResourceById(courseId, id);

      res.status(200).json({ status: HTTPStatusText.SUCCESS, data });
    } catch (err) {
      next(err);
    }
  }

  static async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const { courseId } = res.locals.params as CourseIdParams;
      const file = req.file!;
      const userId = res.locals.user.id;

      const data = await ResourceService.uploadResource(courseId, file, userId);

      res.status(201).json({ status: HTTPStatusText.SUCCESS, data });
    } catch (err) {
      next(err);
    }
  }

  static async download(_req: Request, res: Response, next: NextFunction) {
    try {
      const { courseId, id } = res.locals.params as IdParams;

      const result = await ResourceService.downloadResource(courseId, id);

      res.setHeader("Content-Type", result.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(result.fileName)}"`);

      result.stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }

  static async delete(_req: Request, res: Response, next: NextFunction) {
    try {
      const { courseId, id } = res.locals.params as IdParams;

      await ResourceService.deleteResource(courseId, id);

      res.status(200).json({
        status: HTTPStatusText.SUCCESS,
        message: SuccessMessages.RESOURCE_DELETED,
      });
    } catch (err) {
      next(err);
    }
  }
}
