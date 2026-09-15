import { Merchant, type MerchantDocument } from "../models/merchant.model";
import { AppError } from "../utils/app-error";
import { signAuthToken } from "../utils/jwt";
import { isDuplicateKeyError } from "../utils/mongo-errors";
import { normalizeEmail } from "../utils/normalize-email";
import { hashPassword, verifyPassword } from "../utils/password";
import type { LoginInput, RegisterInput } from "../validation/auth.schema";

export interface PublicMerchant {
  id: string;
  name: string;
  email: string;
  businessName?: string;
  phone?: string;
  platform?: string;
  createdAt: Date;
}

export interface AuthResult {
  token: string;
  merchant: PublicMerchant;
}

function toPublicMerchant(doc: MerchantDocument): PublicMerchant {
  return {
    id: doc.id as string,
    name: doc.name,
    email: doc.email,
    businessName: doc.businessName ?? undefined,
    phone: doc.phone ?? undefined,
    platform: doc.platform ?? undefined,
    createdAt: doc.createdAt,
  };
}

async function register(input: RegisterInput): Promise<AuthResult> {
  const email = normalizeEmail(input.email);

  const existing = await Merchant.exists({ email });
  if (existing) {
    throw new AppError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);

  let merchant: MerchantDocument;
  try {
    merchant = await Merchant.create({
      name: input.name,
      email,
      passwordHash,
      businessName: input.businessName,
      phone: input.phone,
      platform: input.platform,
    });
  } catch (error) {
    // Belt-and-suspenders against a race between the exists() check above
    // and this insert — the schema's unique index is the real guarantee.
    if (isDuplicateKeyError(error)) {
      throw new AppError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists");
    }
    throw error;
  }

  return { token: signAuthToken(merchant.id as string), merchant: toPublicMerchant(merchant) };
}

async function login(input: LoginInput): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  const merchant = await Merchant.findOne({ email }).select("+passwordHash");

  // Same error for "no such account" and "wrong password" — never reveal
  // which one it was.
  if (!merchant) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Incorrect email or password");
  }

  const valid = await verifyPassword(input.password, merchant.passwordHash);
  if (!valid) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Incorrect email or password");
  }

  return { token: signAuthToken(merchant.id as string), merchant: toPublicMerchant(merchant) };
}

async function getById(merchantId: string): Promise<PublicMerchant> {
  const merchant = await Merchant.findById(merchantId);
  if (!merchant) {
    throw new AppError(401, "UNAUTHORIZED", "Session is no longer valid");
  }
  return toPublicMerchant(merchant);
}

export const AuthService = { register, login, getById };
