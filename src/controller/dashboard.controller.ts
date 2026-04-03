import { Request, Response } from 'express';
import { FinancialRecord } from '../models/financial-record.model.js';
import { AppError, validateDateRange } from '../utils/validation.js';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants/index.js';
import { DashboardSummary } from '../types/index.js';

export const getDashboardSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    }

    // Get all non-deleted records for this user
    const allRecords = await FinancialRecord.find({
      userId,
      isDeleted: false,
    });

    // Calculate totals
    const totalIncome = allRecords
      .filter((r) => r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0);

    const totalExpenses = allRecords
      .filter((r) => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0);

    const netBalance = totalIncome - totalExpenses;

    // Category-wise breakdown
    const categoryMap = new Map<string, number>();
    allRecords.forEach((record) => {
      const current = categoryMap.get(record.category) || 0;
      categoryMap.set(record.category, current + record.amount);
    });

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Recent transactions (last 10)
    const recentTransactions = allRecords
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10)
      .map((record: any) => ({
        _id: record._id.toString(),
        userId: record.userId.toString(),
        amount: record.amount,
        type: record.type,
        category: record.category,
        date: record.date,
        description: record.description,
        isDeleted: record.isDeleted,
        deletedAt: record.deletedAt,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      }));

    // Date-wise trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trendMap = new Map<string, { income: number; expense: number }>();
    allRecords.forEach((record) => {
      if (record.date >= thirtyDaysAgo) {
        const dateKey = record.date.toISOString().split('T')[0];
        const current = trendMap.get(dateKey) || { income: 0, expense: 0 };
        if (record.type === 'income') {
          current.income += record.amount;
        } else {
          current.expense += record.amount;
        }
        trendMap.set(dateKey, current);
      }
    });

    const dateRangeTrends = Array.from(trendMap.entries())
      .map(([date, { income, expense }]) => ({
        date,
        income,
        expense,
        balance: income - expense,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const summary: DashboardSummary = {
      totalIncome,
      totalExpenses,
      netBalance,
      categoryBreakdown,
      recentTransactions,
      dateRangeTrends,
    };

    res.status(HTTP_STATUS.OK).json({
      message: 'Dashboard summary retrieved successfully',
      data: summary,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }
};

export const getDashboardWithDateRange = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    }

    const { startDate, endDate, error: dateError } = validateDateRange(
      req.query.startDate as string,
      req.query.endDate as string
    );

    if (dateError) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ message: dateError });
      return;
    }

    // Build date filter
    const dateFilter: any = { userId, isDeleted: false };
    if (startDate) dateFilter.date = { $gte: startDate };
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      if (dateFilter.date) {
        dateFilter.date.$lte = endOfDay;
      } else {
        dateFilter.date = { $lte: endOfDay };
      }
    }

    const records = await FinancialRecord.find(dateFilter);

    // Calculate totals for the date range
    const totalIncome = records
      .filter((r) => r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0);

    const totalExpenses = records
      .filter((r) => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0);

    const netBalance = totalIncome - totalExpenses;

    // Category-wise breakdown
    const categoryMap = new Map<string, number>();
    records.forEach((record) => {
      const current = categoryMap.get(record.category) || 0;
      categoryMap.set(record.category, current + record.amount);
    });

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Recent transactions
    const recentTransactions = records
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10)
      .map((record: any) => ({
        _id: record._id.toString(),
        userId: record.userId.toString(),
        amount: record.amount,
        type: record.type,
        category: record.category,
        date: record.date,
        description: record.description,
        isDeleted: record.isDeleted,
        deletedAt: record.deletedAt,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      }));

    // Daily trends
    const trendMap = new Map<string, { income: number; expense: number }>();
    records.forEach((record) => {
      const dateKey = record.date.toISOString().split('T')[0];
      const current = trendMap.get(dateKey) || { income: 0, expense: 0 };
      if (record.type === 'income') {
        current.income += record.amount;
      } else {
        current.expense += record.amount;
      }
      trendMap.set(dateKey, current);
    });

    const dateRangeTrends = Array.from(trendMap.entries())
      .map(([date, { income, expense }]) => ({
        date,
        income,
        expense,
        balance: income - expense,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const summary: DashboardSummary = {
      totalIncome,
      totalExpenses,
      netBalance,
      categoryBreakdown,
      recentTransactions,
      dateRangeTrends,
    };

    res.status(HTTP_STATUS.OK).json({
      message: 'Dashboard summary with date range retrieved successfully',
      data: summary,
      filters: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }
};

export const getCategoryBreakdown = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    }

    const records = await FinancialRecord.find({
      userId,
      isDeleted: false,
      type: req.query.type || undefined,
    });

    const categoryMap = new Map<string, number>();
    records.forEach((record) => {
      const current = categoryMap.get(record.category) || 0;
      categoryMap.set(record.category, current + record.amount);
    });

    const total = Array.from(categoryMap.values()).reduce((sum, val) => sum + val, 0);

    const breakdown = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    res.status(HTTP_STATUS.OK).json({
      message: 'Category breakdown retrieved successfully',
      data: breakdown,
      total,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }
};

export const getMonthlyTrend = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const months = parseInt(req.query.months as string) || 12;

    if (!userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    }

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const records = await FinancialRecord.find({
      userId,
      isDeleted: false,
      date: { $gte: startDate },
    });

    const monthMap = new Map<string, { income: number; expense: number }>();
    records.forEach((record) => {
      const monthKey = record.date.toISOString().slice(0, 7);
      const current = monthMap.get(monthKey) || { income: 0, expense: 0 };
      if (record.type === 'income') {
        current.income += record.amount;
      } else {
        current.expense += record.amount;
      }
      monthMap.set(monthKey, current);
    });

    const trends = Array.from(monthMap.entries())
      .map(([month, { income, expense }]) => ({
        month,
        income,
        expense,
        balance: income - expense,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.status(HTTP_STATUS.OK).json({
      message: 'Monthly trends retrieved successfully',
      data: trends,
      monthsShown: months,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }
};
