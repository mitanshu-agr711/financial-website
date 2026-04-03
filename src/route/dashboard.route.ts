import { Router } from 'express';
import {
  getDashboardSummary,
  getDashboardWithDateRange,
  getCategoryBreakdown,
  getMonthlyTrend,
} from '../controller/dashboard.controller.js';
import { verifyToken, onlyAnalystOrAdmin } from '../middleware/authMiddleware.js';

const dashboardRouter = Router();

dashboardRouter.use(verifyToken);
dashboardRouter.use(onlyAnalystOrAdmin);

dashboardRouter.get('/summary', getDashboardSummary);


dashboardRouter.get('/summary/range', getDashboardWithDateRange);

dashboardRouter.get('/breakdown/category', getCategoryBreakdown);

dashboardRouter.get('/trends/monthly', getMonthlyTrend);

export default dashboardRouter;
