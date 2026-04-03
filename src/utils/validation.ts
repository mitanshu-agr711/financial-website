import { ERROR_MESSAGES, HTTP_STATUS } from '../constants/index.js';

export class AppError extends Error {
  statusCode: number;
  errors?: Record<string, string>;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errors?: Record<string, string>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return { valid: errors.length === 0, errors };
};

export const validatePagination = (
  page?: number,
  limit?: number
): { page: number; limit: number; error?: string } => {
  let p = page ? parseInt(page.toString(), 10) : 1;
  let l = limit ? parseInt(limit.toString(), 10) : 10;

  if (isNaN(p) || p < 1) p = 1;
  if (isNaN(l) || l < 1) l = 10;
  if (l > 100) l = 100;

  return { page: p, limit: l };
};

export const validateDateRange = (
  startDate?: string,
  endDate?: string
): { startDate: Date | null; endDate: Date | null; error?: string } => {
  let start: Date | null = null;
  let end: Date | null = null;

  if (startDate) {
    start = new Date(startDate);
    if (isNaN(start.getTime())) {
      return { startDate: null, endDate: null, error: 'Invalid startDate format' };
    }
  }

  if (endDate) {
    end = new Date(endDate);
    if (isNaN(end.getTime())) {
      return { startDate: null, endDate: null, error: 'Invalid endDate format' };
    }
  }

  if (start && end && start > end) {
    return { startDate: null, endDate: null, error: 'startDate must be before endDate' };
  }

  return { startDate: start, endDate: end };
};

export const validateRecordInput = (data: any): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
    errors.amount = 'Amount must be a positive number';
  }

  if (!data.type || !['income', 'expense'].includes(data.type)) {
    errors.type = 'Type must be either "income" or "expense"';
  }

  if (!data.category || typeof data.category !== 'string' || data.category.trim() === '') {
    errors.category = 'Category is required and must be a non-empty string';
  }

  if (!data.date) {
    errors.date = 'Date is required';
  } else {
    const dateObj = new Date(data.date);
    if (isNaN(dateObj.getTime())) {
      errors.date = 'Invalid date format';
    }
  }

  if (data.description && typeof data.description !== 'string') {
    errors.description = 'Description must be a string';
  }

  return { valid: Object.keys(errors).length === 0, errors };
};

export const validateUserInput = (data: any): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!data.username || typeof data.username !== 'string' || data.username.trim() === '') {
    errors.username = 'Username is required and must be a non-empty string';
  }

  if (!data.email || !validateEmail(data.email)) {
    errors.email = 'Valid email is required';
  }

  if (!data.password) {
    errors.password = 'Password is required';
  } else {
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.valid) {
      errors.password = passwordValidation.errors.join('; ');
    }
  }

  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.name = 'Name is required and must be a non-empty string';
  }

  return { valid: Object.keys(errors).length === 0, errors };
};

export const validateRequiredFields = (
  data: any,
  requiredFields: string[]
): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  requiredFields.forEach((field) => {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors[field] = `${field} is required`;
    }
  });

  return { valid: Object.keys(errors).length === 0, errors };
};
