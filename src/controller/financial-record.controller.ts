import { Request, Response } from 'express';
import { FinancialRecord } from '../models/financial-record.model.js';
import { AppError, validateRecordInput, validatePagination, validateDateRange, validateRequiredFields } from '../utils/validation.js';
import { HTTP_STATUS, ERROR_MESSAGES, PAGINATION } from '../constants/index.js';

export const createRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    // console.log("hello")
    const { amount, type, category, date, description } = req.body;
    const userId = req.userId;
    // console.log('Creating record for user:', userId);

    if (!userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    }

    // Check for missing required fields
    const requiredFieldsCheck = validateRequiredFields(req.body, ['amount', 'type', 'category', 'date']);
    if (!requiredFieldsCheck.valid) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: ERROR_MESSAGES.MISSING_REQUIRED_FIELDS,
        errors: requiredFieldsCheck.errors,
      });
      return;
    }

    // Validate input
    const validation = validateRecordInput({ amount, type, category, date, description });
    if (!validation.valid) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: ERROR_MESSAGES.INVALID_REQUEST,
        errors: validation.errors,
      });
      return;
    }

    const newRecord = await FinancialRecord.create({
      userId,
      amount,
      type,
      category,
      date: new Date(date),
      description: description || '',
    });

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Record created successfully',
      data: newRecord,
    });
  } catch (error: any) {
    console.error('CreateRecord Error:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ message: error.message, errors: error.errors });
    } else {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: ERROR_MESSAGES.INTERNAL_ERROR,
        error: error.message,
      });
    }
  }
};

export const getRecords = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    }

    const { page, limit } = validatePagination(req.query.page as any, req.query.limit as any);
    const { startDate, endDate, error: dateError } = validateDateRange(
      req.query.startDate as string,
      req.query.endDate as string
    );

    if (dateError) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ message: dateError });
      return;
    }

    // Build filter query
    const filter: any = {
      userId,
      isDeleted: false,
    };

    if (req.query.type && ['income', 'expense'].includes(req.query.type as string)) {
      filter.type = req.query.type;
    }

    if (req.query.category) {
      filter.category = { $regex: req.query.category, $options: 'i' };
    }

    if (req.query.search) {
      filter.description = { $regex: req.query.search, $options: 'i' };
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.date.$lte = endOfDay;
      }
    }

    // Get total count for pagination
    const total = await FinancialRecord.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    // Fetch records
    const rawRecords = await FinancialRecord.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Convert ObjectId to string for type compatibility
    const records = rawRecords.map((record: any) => ({
      ...record,
      _id: record._id.toString(),
      userId: record.userId.toString(),
    }));

    res.status(HTTP_STATUS.OK).json({
      message: 'Records retrieved successfully',
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages,
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

export const getRecordById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    }

    const record = await FinancialRecord.findOne({
      _id: id,
      userId,
      isDeleted: false,
    });

    if (!record) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: ERROR_MESSAGES.RECORD_NOT_FOUND,
      });
      return;
    }

    res.status(HTTP_STATUS.OK).json({
      message: 'Record retrieved successfully',
      data: record,
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

export const updateRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { amount, type, category, date, description } = req.body;

    if (!userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    }

    // Validate input if provided - check for missing values in provided fields
    if (Object.keys(req.body).length > 0) {
      const providedFields = Object.keys(req.body).filter(key => req.body[key] !== undefined);
      const requiredFields = ['amount', 'type', 'category', 'date'];
      
      const missingInProvided = requiredFields.filter(field => 
        providedFields.includes(field) && (req.body[field] === null || req.body[field] === '')
      );
      
      if (missingInProvided.length > 0) {
        const errors: Record<string, string> = {};
        missingInProvided.forEach(field => {
          errors[field] = `${field} cannot be empty`;
        });
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: ERROR_MESSAGES.MISSING_REQUIRED_FIELDS,
          errors,
        });
        return;
      }

      const validation = validateRecordInput({ amount, type, category, date, description });
      if (!validation.valid) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: ERROR_MESSAGES.INVALID_REQUEST,
          errors: validation.errors,
        });
        return;
      }
    }

    const record = await FinancialRecord.findOne({
      _id: id,
      userId,
      isDeleted: false,
    });

    if (!record) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: ERROR_MESSAGES.RECORD_NOT_FOUND,
      });
      return;
    }

    // Update only provided fields
    if (amount !== undefined) record.amount = amount;
    if (type !== undefined) record.type = type;
    if (category !== undefined) record.category = category;
    if (date !== undefined) record.date = new Date(date);
    if (description !== undefined) record.description = description;

    await record.save();

    res.status(HTTP_STATUS.OK).json({
      message: 'Record updated successfully',
      data: record,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ message: error.message, errors: error.errors });
    } else {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }
};

export const softDeleteRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    }

    const record = await FinancialRecord.findOne({
      _id: id,
      userId,
      isDeleted: false,
    });

    if (!record) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: ERROR_MESSAGES.RECORD_NOT_FOUND,
      });
      return;
    }

    record.isDeleted = true;
    record.deletedAt = new Date();
    await record.save();

    res.status(HTTP_STATUS.OK).json({
      message: 'Record deleted successfully',
      data: record,
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

export const permanentlyDeleteRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    }

    const record = await FinancialRecord.findOne({
      _id: id,
      userId,
    });

    if (!record) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: ERROR_MESSAGES.RECORD_NOT_FOUND,
      });
      return;
    }

    await FinancialRecord.deleteOne({ _id: id });

    res.status(HTTP_STATUS.OK).json({
      message: 'Record permanently deleted successfully',
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

export const getBulkRecords = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { ids } = req.body;

    if (!userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Please provide an array of record IDs',
      });
      return;
    }

    const records = await FinancialRecord.find({
      _id: { $in: ids },
      userId,
      isDeleted: false,
    });

    res.status(HTTP_STATUS.OK).json({
      message: 'Bulk records retrieved successfully',
      data: records,
      count: records.length,
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
