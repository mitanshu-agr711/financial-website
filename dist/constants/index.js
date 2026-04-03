export const ROLES = {
    VIEWER: "viewer",
    ANALYST: "analyst",
    ADMIN: "admin",
};
export const USER_STATUS = {
    ACTIVE: "active",
    INACTIVE: "inactive",
};
export const RECORD_TYPES = {
    INCOME: "income",
    EXPENSE: "expense",
};
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
};
export const ERROR_MESSAGES = {
    INVALID_CREDENTIALS: "Invalid username/email or password",
    USER_NOT_FOUND: "User not found",
    USER_ALREADY_EXISTS: "User already exists",
    UNAUTHORIZED: "Unauthorized access",
    FORBIDDEN: "You do not have permission to access this resource",
    INVALID_REQUEST: "Invalid request",
    INTERNAL_ERROR: "Internal server error",
    RECORD_NOT_FOUND: "Financial record not found",
    INVALID_PAGINATION: "Invalid pagination parameters",
    MISSING_REQUIRED_FIELDS: "Missing required fields",
};
export const CATEGORIES = [
    "Salary",
    "Freelance",
    "Investment",
    "Food",
    "Transportation",
    "Entertainment",
    "Utilities",
    "Healthcare",
    "Shopping",
    "Education",
    "Other",
];
export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
};
export const DATE_RANGE_LIMITS = {
    MIN_DAYS: 1,
    MAX_DAYS: 365,
};
