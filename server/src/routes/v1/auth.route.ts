import { Router } from "express";
import { AuthController } from "../../controllers/auth.controller";
import { authGuard } from "../../middleware/auth-guard";
import { validateBody } from "../../middleware/validate-request";
import { loginSchema, registerSchema } from "../../validation/auth.schema";

export const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), AuthController.register);
authRouter.post("/login", validateBody(loginSchema), AuthController.login);
authRouter.post("/logout", AuthController.logout);
authRouter.get("/me", authGuard, AuthController.me);
