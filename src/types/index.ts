// User and Role Types
export enum UserRole {
  VIEWER = "viewer",
  ANALYST = "analyst",
  ADMIN = "admin",
}

export interface IUser {
  _id: string;
  username: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

export interface JWTPayload {
  userId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Financial Record Types
export interface IFinancialRecord {
  _id: string;
  userId: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: Date;
  description?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Query Types
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface FilterQuery {
  startDate?: Date;
  endDate?: Date;
  category?: string;
  type?: "income" | "expense";
  search?: string;
}

// Dashboard Types
export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  recentTransactions: IFinancialRecord[];
  dateRangeTrends: Array<{
    date: string;
    income: number;
    expense: number;
    balance: number;
  }>;
}

// Error Response Type
export interface ErrorResponse {
  message: string;
  statusCode: number;
  errors?: Record<string, string>;
}
