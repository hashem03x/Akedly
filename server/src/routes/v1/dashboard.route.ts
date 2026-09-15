import { Router } from "express";
import { DashboardController } from "../../controllers/dashboard.controller";
import { authGuard } from "../../middleware/auth-guard";

export const dashboardRouter = Router();

dashboardRouter.get("/overview", authGuard, DashboardController.overview);
