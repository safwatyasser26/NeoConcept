import bcrypt from "bcryptjs";
import crypto from "crypto";
import { promises as fs } from "fs";
import CustomError from "../../types/customError";
import { HTTPStatusText } from "../../types/HTTPStatusText";
import {
  ConfirmEmailParams,
  ForgotPasswordBody,
  LoginBody,
  MobileGoogleAuthBody,
  MobileGoogleAuthQuery,
  ResendConfirmationEmailBody,
  ResetPasswordBody,
  SignupBody,
  VerifyOTPBody,
} from "./auth.validation";
import sendEmail from "../../utils/sendEmail";
import signToken from "../../utils/signToken";
import safeUserData from "../../utils/safeUserData";
import createRandomOTP from "../../utils/createRandomOTP";
import { OAuth2Client } from "google-auth-library";
import { Role } from "../../generated/prisma";
import { AuthModel } from "./auth.model";
import { ErrorMessages } from "../../types/errorsMessages";
import { SuccessMessages } from "../../types/successMessages";
import { Constants } from "../../types/constants";

export class AuthService {
  private static readonly MAX_OTP_ATTEMPTS = 5;
  private static oauthClient: OAuth2Client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  static async signup({ email, username, password, role }: SignupBody) {
    const existingUser = await AuthModel.findUserByEmail(email.toLowerCase());
    if (existingUser) {
      throw new CustomError(ErrorMessages.EMAIL_ALREADY_EXISTS, 409, HTTPStatusText.FAIL);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const confirmEmailToken = crypto.randomBytes(32).toString("hex");
    const confirmEmailTokenHash = crypto.createHash("sha256").update(confirmEmailToken).digest("hex");

    await AuthModel.createUser({
      email: email.toLowerCase(),
      username,
      password: hashedPassword,
      role: role,
      confirmEmailToken: confirmEmailTokenHash,
      // ! Login - Status 200 load test will fail if the NODE_ENV is production because it has to confirmed, 
      // ! but if we make the NODE_ENV development so the email will be confirmed so the resend confirmation test will fail
      emailConfirmed: process.env.NODE_ENV === Constants.DEVELOPMENT,
      confirmEmailExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return {
      confirmEmailToken,
      isDev: process.env.NODE_ENV === Constants.DEVELOPMENT,
    };
  }

  static async confirmEmail({ token }: ConfirmEmailParams) {
    const failHtml = await fs.readFile(Constants.EMAIL_VERIFICATION_FAILURE_HTML, "utf-8");

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await AuthModel.findUserByConfirmToken(tokenHash);
    if (!user) {
      throw new CustomError(ErrorMessages.INVALID_TOKEN, 400, HTTPStatusText.FAIL, failHtml);
    }

    await AuthModel.confirmUserEmail(user.id);

    const successHtml = await fs.readFile(Constants.EMAIL_VERIFICATION_SUCCESS_HTML, "utf-8");

    return successHtml;
  }

  static async resendConfirmationEmail({ email }: ResendConfirmationEmailBody) {
    const user = await AuthModel.findUserByEmail(email);
    if (!user) throw new CustomError(ErrorMessages.USER_NOT_FOUND, 404, HTTPStatusText.FAIL);
    if (user.emailConfirmed) throw new CustomError(ErrorMessages.EMAIL_ALREADY_CONFIRMED, 400, HTTPStatusText.FAIL);

    const confirmEmailToken = crypto.randomBytes(32).toString("hex");
    const confirmEmailTokenHash = crypto.createHash("sha256").update(confirmEmailToken).digest("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await AuthModel.updateConfirmationToken(user.id, confirmEmailTokenHash, expires);

    const rawMessage = await fs.readFile(Constants.EMAIL_CONFIRMATION_MESSAGE_HTML, "utf-8");
    const message = rawMessage.replaceAll(
      "%%CONFIRMATION_LINK%%",
      `${process.env.APP_URL}/api/v1/auth/confirm-email/${confirmEmailToken}`,
    );

    // ! Remove while load testing
    // sendEmail(email, SuccessMessages.EMAIL_CONFIRMATION, message, true);

    return { success: true };
  }

  static async login({ email, password }: LoginBody) {
    const user = await AuthModel.findUserByEmail(email);

    if (!user || !user.password) {
      throw new CustomError(ErrorMessages.INVALID_CREDENTIALS, 400, HTTPStatusText.FAIL);
    }

    const passwordIsValid = await bcrypt.compare(password, user.password);

    if (!passwordIsValid) {
      throw new CustomError(ErrorMessages.INVALID_CREDENTIALS, 400, HTTPStatusText.FAIL);
    }

    if (!user.emailConfirmed) {
      throw new CustomError(ErrorMessages.EMAIL_NOT_CONFIRMED, 403, HTTPStatusText.FAIL);
    }

    const token = signToken({ id: user.id, username: user.username });

    return {
      token,
      user: safeUserData(user),
    };
  }

  static async forgotPassword({ email }: ForgotPasswordBody) {
    const user = await AuthModel.findUserByEmail(email);

    if (!user) {
      throw new CustomError(ErrorMessages.USER_NOT_FOUND, 404, HTTPStatusText.FAIL);
    }

    const otp = createRandomOTP(6);

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    const expires = new Date(Date.now() + 20 * 60 * 1000);

    await AuthModel.updateResetPasswordOTP(user.id, otpHash, expires);

    const rawMessage = await fs.readFile(Constants.RESET_PASSWORD_MESSAGE_HTML, "utf-8");

    const message = rawMessage.replace("%%OTP%%", otp);

    // ! Remove while load testing
    // sendEmail(user.email, "NeoConcept - Password Reset", message, true);

    return { message: SuccessMessages.PASSWORD_RESET_EMAIL_SENT };
  }

  static async verifyOTP({ email, otp }: VerifyOTPBody) {
    const user = await AuthModel.findUserByEmail(email.toLowerCase());

    if (!user) {
      throw new CustomError(ErrorMessages.USER_NOT_FOUND, 404, HTTPStatusText.FAIL);
    }

    if (!user.resetPasswordOTP) {
      throw new CustomError(ErrorMessages.NO_OTP_REQUEST_FOUND, 400, HTTPStatusText.FAIL);
    }

    if (user.otpAttempts >= AuthService.MAX_OTP_ATTEMPTS) {
      throw new CustomError(ErrorMessages.TOO_MANY_OTP_ATTEMPTS, 429, HTTPStatusText.FAIL);
    }

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    if (user.resetPasswordOTP !== otpHash) {
      await AuthModel.incrementOtpAttempts(user.id);

      throw new CustomError(ErrorMessages.INVALID_OTP, 400, HTTPStatusText.FAIL);
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new CustomError(ErrorMessages.OTP_EXPIRED, 400, HTTPStatusText.FAIL);
    }

    await Promise.all([AuthModel.clearResetOTP(user.id), AuthModel.resetOtpAttempts(user.id)]);

    return {
      success: true,
      message: SuccessMessages.OTP_VERIFIED,
    };
  }

  static async resetPassword({ email, otp, newPassword }: ResetPasswordBody) {
    const user = await AuthModel.findUserByEmail(email.toLowerCase());

    if (!user) {
      throw new CustomError(ErrorMessages.USER_NOT_FOUND, 404, HTTPStatusText.FAIL);
    }

    if (!user.resetPasswordOTP) {
      throw new CustomError(ErrorMessages.NO_OTP_REQUEST_FOUND, 400, HTTPStatusText.FAIL);
    }

    if (user.otpAttempts >= AuthService.MAX_OTP_ATTEMPTS) {
      throw new CustomError(ErrorMessages.TOO_MANY_OTP_ATTEMPTS, 429, HTTPStatusText.FAIL);
    }

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    if (user.resetPasswordOTP !== otpHash) {
      await AuthModel.incrementOtpAttempts(user.id);

      throw new CustomError(ErrorMessages.INVALID_OTP, 400, HTTPStatusText.FAIL);
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new CustomError(ErrorMessages.OTP_EXPIRED, 400, HTTPStatusText.FAIL);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await Promise.all([
      AuthModel.updateUserPassword(user.id, hashedPassword),
      AuthModel.clearResetOTP(user.id),
      AuthModel.resetOtpAttempts(user.id),
    ]);

    return {
      success: true,
      message: SuccessMessages.PASSWORD_RESET_SUCCESSFULLY,
    };
  }

  static async mobileGoogleAuth(body: MobileGoogleAuthBody, query: MobileGoogleAuthQuery) {
    let role: Role = Role.STUDENT;

    switch (String(query.role)?.toUpperCase()) {
      case Role.ADMIN:
        role = Role.ADMIN;
        break;
      case Role.INSTRUCTOR:
        role = Role.INSTRUCTOR;
        break;
      case Role.ASSISTANT:
        role = Role.ASSISTANT;
    }

    const ticket = await AuthService.oauthClient.verifyIdToken({
      idToken: body.idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) throw new CustomError(ErrorMessages.INVALID_GOOGLE_TOKEN, 400, HTTPStatusText.FAIL);

    const { email, name, sub: googleId } = payload;

    let user = await AuthModel.findUserByEmail(email!);

    if (user) {
      if (role && user.role !== role) throw new CustomError(ErrorMessages.ROLE_MISMATCH, 400, HTTPStatusText.FAIL);
      if (!user.googleId) user = await AuthModel.updateUserGoogleId(user.id, googleId!);
    } else {
      user = await AuthModel.createUserWithGoogle(email!, name!, googleId!, role);
    }

    const token = signToken({ id: user.id, username: user.username });

    return { token, user: safeUserData(user) };
  }
}
