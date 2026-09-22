import bcrypt from "bcryptjs";
import { ApiError } from "../../utils/api-error";
import { signAuthToken } from "../../utils/jwt";
import { MerchantModel, type MerchantDocument } from "../merchants/merchant.model";
import type { LoginInput, RegisterInput } from "./auth.validation";

const SALT_ROUNDS = 12;

export interface AuthResult {
  merchant: MerchantDocument;
  token: string;
}

export async function registerMerchant(input: RegisterInput): Promise<AuthResult> {
  const existing = await MerchantModel.findOne({ email: input.email });
  if (existing) {
    throw ApiError.conflict("EMAIL_IN_USE", "An account with this email already exists.");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const merchant = await MerchantModel.create({
    name: input.name,
    email: input.email,
    passwordHash,
  });

  const token = signAuthToken({ merchantId: merchant.id });
  return { merchant, token };
}

export async function loginMerchant(input: LoginInput): Promise<AuthResult> {
  const merchant = await MerchantModel.findOne({ email: input.email }).select("+passwordHash");
  if (!merchant) {
    throw ApiError.unauthorized("Invalid email or password.", "INVALID_CREDENTIALS");
  }

  const isValid = await bcrypt.compare(input.password, merchant.passwordHash);
  if (!isValid) {
    throw ApiError.unauthorized("Invalid email or password.", "INVALID_CREDENTIALS");
  }

  const token = signAuthToken({ merchantId: merchant.id });
  return { merchant, token };
}
