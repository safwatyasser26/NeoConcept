import { z } from "zod";
import { Role } from "../../generated/prisma";

export class AuthValidationSchemas {
  static signup = z.object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email format")
      .transform((val) => val.toLowerCase()),

    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be less than 30 characters"),

    password: z.string().min(6, "Password must be at least 6 characters"),

    role: z.nativeEnum(Role),
  });

  static loginBody = z.object({
    email: z.string().email("Invalid email").toLowerCase(),
    password: z.string().min(1, "Password is required"),
  });

  static confirmEmailParams = z.object({
    token: z.string().min(1),
  });

  static resendConfirmationEmailBody = z.object({
    email: z.string().email("Invalid email address"),
  });

  static forgotPasswordBody = z.object({
    email: z.string().email("Invalid email address").toLowerCase(),
  });

  static verifyOTPBody = z.object({
    email: z.string().email("Invalid email address"),
    otp: z.string().length(6, "OTP must be 6 digits"),
  });

  static resetPasswordBody = z.object({
    email: z.string().email("Invalid email address"),
    otp: z.string().length(6, "OTP must be 6 digits"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
  });

  static mobileGoogleAuthBody = z.object({
    idToken: z.string().nonempty("idToken is required"),
  });

  static mobileGoogleAuthQuery = z.object({
    role: z.string().optional(),
  });
}

export type SignupBody = z.infer<typeof AuthValidationSchemas.signup>;
export type LoginBody = z.infer<typeof AuthValidationSchemas.loginBody>;
export type ConfirmEmailParams = z.infer<typeof AuthValidationSchemas.confirmEmailParams>;
export type ResendConfirmationEmailBody = z.infer<typeof AuthValidationSchemas.resendConfirmationEmailBody>;
export type ForgotPasswordBody = z.infer<typeof AuthValidationSchemas.forgotPasswordBody>;
export type VerifyOTPBody = z.infer<typeof AuthValidationSchemas.verifyOTPBody>;
export type ResetPasswordBody = z.infer<typeof AuthValidationSchemas.resetPasswordBody>;
export type MobileGoogleAuthBody = z.infer<typeof AuthValidationSchemas.mobileGoogleAuthBody>;
export type MobileGoogleAuthQuery = z.infer<typeof AuthValidationSchemas.mobileGoogleAuthQuery>;
