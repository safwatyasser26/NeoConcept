import { NextFunction, Request, Response } from "express";
import { UserService } from "./user.service";
import { HTTPStatusText } from "../../types/HTTPStatusText";
import {
  CourseIdBody,
  GetUserStaffRequestsQuery,
  GetUserStudentRequestsQuery,
  TrackIdBody,
  UpdateBody,
} from "./user.validation";
import { SuccessMessages } from "../../types/successMessages";

export class UserController {
  static async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body as UpdateBody;
      const user = res.locals.user;

      const result = await UserService.updateUser({ userId: user.id, username, password, deletedAt: user.deletedAt });

      return res.status(200).json({
        status: HTTPStatusText.SUCCESS,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteUser(_req: Request, res: Response, next: NextFunction) {
    try {
      await UserService.deleteUser(res.locals.user);

      return res.status(200).json({
        status: HTTPStatusText.SUCCESS,
        message: SuccessMessages.USER_DELETED,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getUserTracks(_req: Request, res: Response, next: NextFunction) {
    try {
      const tracks = await UserService.getUserTracks(res.locals.user);

      return res.status(200).json({
        status: HTTPStatusText.SUCCESS,
        data: tracks,
      });
    } catch (err) {
      next(err);
    }
  }

  static async selectTrack(req: Request, res: Response, next: NextFunction) {
    try {
      const { trackId } = req.body as TrackIdBody;

      await UserService.selectTrack({ user: res.locals.user, trackId });

      return res.status(200).json({
        status: HTTPStatusText.SUCCESS,
        message: SuccessMessages.TRACK_SELECTED,
      });
    } catch (err) {
      next(err);
    }
  }

  static async quitTrack(req: Request, res: Response, next: NextFunction) {
    try {
      const { trackId } = req.body as TrackIdBody;

      await UserService.quitTrack({ user: res.locals.user, trackId });

      return res.status(200).json({
        status: HTTPStatusText.SUCCESS,
        message: SuccessMessages.TRACK_QUITTED,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getUserCourses(_req: Request, res: Response, next: NextFunction) {
    try {
      const courses = await UserService.getUserCourses({ userId: res.locals.user.id });

      return res.status(200).json({
        status: HTTPStatusText.SUCCESS,
        data: courses,
      });
    } catch (err) {
      next(err);
    }
  }

  static async joinCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const { courseId } = req.body as CourseIdBody;

      await UserService.joinCourse({ user: res.locals.user, courseId });

      return res.status(200).json({
        status: HTTPStatusText.SUCCESS,
        message: SuccessMessages.COURSE_JOINED,
      });
    } catch (err) {
      next(err);
    }
  }

  static async quitCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const { courseId } = req.body as CourseIdBody;

      await UserService.quitCourse({ user: res.locals.user, courseId });

      return res.status(200).json({
        status: HTTPStatusText.SUCCESS,
        message: SuccessMessages.COURSE_QUITTED,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getUserStaffRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, search } = req.query as GetUserStaffRequestsQuery;

      const requests = await UserService.getUserStaffRequests({ user: res.locals.user, status, search });

      return res.status(200).json({
        status: HTTPStatusText.SUCCESS,
        data: requests,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getUserStudentRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, search } = req.query as GetUserStudentRequestsQuery;

      const requests = await UserService.getUserStudentRequests(res.locals.user, status, search);

      return res.status(200).json({
        status: HTTPStatusText.SUCCESS,
        data: requests,
      });
    } catch (err) {
      next(err);
    }
  }
}
