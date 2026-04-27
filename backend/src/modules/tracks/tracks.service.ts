import CustomError from "../../types/customError";
import { ErrorMessages } from "../../types/errorsMessages";
import { HTTPStatusText } from "../../types/HTTPStatusText";
import { TrackModel } from "./tracks.model";

export class TrackService {
  static async getMany(search?: string) {
    return TrackModel.findMany(search);
  }

  static async getById(id: string) {
    const track = await TrackModel.findById(id);
    if (!track) throw new CustomError(ErrorMessages.TRACK_NOT_FOUND, 404, HTTPStatusText.FAIL);
    return track;
  }

  static async getStaff(trackId: string, userId: string, safeUserData: (user: any) => any) {
    const track = await TrackModel.findById(trackId);
    if (!track) throw new CustomError(ErrorMessages.TRACK_NOT_FOUND, 404, HTTPStatusText.FAIL);

    const isInTrack = await TrackModel.isUserInTrack(userId, trackId);
    if (!isInTrack)
      throw new CustomError(
        ErrorMessages.YOU_DONT_HAVE_PERMISSION_TO_VIEW_THE_STAFF_OF_THIS_TRACK,
        403,
        HTTPStatusText.FAIL,
      );

    const staff = await TrackModel.findStaff(trackId);

    return staff
      .filter((user: any) => user.emailConfirmed === true)
      .map((user: any) => ({
        ...safeUserData(user),
        googleId: undefined,
        emailConfirmed: undefined,
        deletedAt: undefined,
      }));
  }

  static async create(userId: string, payload: any) {
    const duplicate = await TrackModel.findByName(payload.name);
    if (duplicate) throw new CustomError(ErrorMessages.DUPLICATE_TRACK_NAME, 400, HTTPStatusText.FAIL);

    return TrackModel.transaction(async (tx: any) => {
      const newTrack = await tx.track.create({
        data: {
          ...payload,
          name: payload.name.trim(),
          shortDescription: payload.shortDescription.trim(),
          longDescription: payload.longDescription.trim(),
          domain: payload.domain.trim(),
          level: payload.level.trim(),
          language: payload.language.trim(),
          targetAudience: payload.targetAudience.trim(),
          pricingModel: payload.pricingModel.trim(),
          creatorId: userId,
        },
      });

      await tx.userTrack.create({ data: { userId, trackId: newTrack.id } });

      return newTrack;
    });
  }

  static async update(id: string, payload: any) {
    const track = await TrackModel.findById(id);
    if (!track) throw new CustomError(ErrorMessages.TRACK_NOT_FOUND, 404, HTTPStatusText.FAIL);

    if (payload.name) {
      const duplicate = await TrackModel.findByName(payload.name);
      if (duplicate && duplicate.id !== id)
        throw new CustomError(ErrorMessages.DUPLICATE_TRACK_NAME, 400, HTTPStatusText.FAIL);
    }

    const data: any = {};
    if (payload.name) data.name = payload.name.trim();
    if (payload.shortDescription) data.shortDescription = payload.shortDescription.trim();
    if (payload.longDescription) data.longDescription = payload.longDescription.trim();
    if (payload.domain) data.domain = payload.domain.trim();
    if (payload.level) data.level = payload.level.trim();
    if (payload.language) data.language = payload.language.trim();
    if (payload.targetAudience) data.targetAudience = payload.targetAudience.trim();
    if (payload.learningOutcomes) data.learningOutcomes = payload.learningOutcomes;
    if (payload.relatedJobs) data.relatedJobs = payload.relatedJobs;
    if (payload.pricingModel) data.pricingModel = payload.pricingModel.trim();

    return TrackModel.update(id, data);
  }

  static async delete(id: string) {
    const track = await TrackModel.findById(id);
    if (!track) throw new CustomError(ErrorMessages.TRACK_NOT_FOUND, 404, HTTPStatusText.FAIL);

    return TrackModel.transaction(async (tx: any) => {
      await tx.track.update({ where: { id }, data: { deletedAt: new Date(), creatorId: null } });
      await tx.course.updateMany({ where: { trackId: id }, data: { deletedAt: new Date() } });
      await tx.userTrack.updateMany({ where: { trackId: id }, data: { deletedAt: new Date() } });
      await tx.userCourse.updateMany({ where: { trackId: id }, data: { deletedAt: new Date() } });
    });
  }
}
