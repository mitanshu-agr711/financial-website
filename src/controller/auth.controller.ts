import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { createAccessToken, createAccessTokenWithRole, createRefreshToken, verifyRefreshToken } from "../utils/tokengenerator.js";
import { redisClient } from "../utils/redisClient.js";
import { AppError, validateEmail, validatePassword, validateUserInput, validateRequiredFields } from "../utils/validation.js";
import { HTTP_STATUS, ERROR_MESSAGES, ROLES } from "../constants/index.js";
import { UserRole } from "../types/index.js";

import { v4 as uuidv4 } from 'uuid';

export const register = async (req: Request, res: Response):Promise<void> => {
  try {
    const { username, name, email, password, role = ROLES.VIEWER } = req.body;
    
    // Check for missing required fields
    const requiredFieldsCheck = validateRequiredFields(req.body, ['username', 'name', 'email', 'password']);
    if (!requiredFieldsCheck.valid) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        message: ERROR_MESSAGES.MISSING_REQUIRED_FIELDS,
        errors: requiredFieldsCheck.errors 
      });
      return;
    }

    const validation = validateUserInput({ username, name, email, password });
    if (!validation.valid) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: ERROR_MESSAGES.INVALID_REQUEST,
        errors: validation.errors,
      });
      return;
    }

    if (!Object.values(ROLES).includes(role)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: "Invalid role. Must be one of: viewer, analyst, admin",
      });
      return;
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser) {
      res.status(HTTP_STATUS.CONFLICT).json({ message: ERROR_MESSAGES.USER_ALREADY_EXISTS });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      name,
      email,
      password: hashedPassword,
      role: role || ROLES.VIEWER,
      status: "active",
    });

    res.status(HTTP_STATUS.CREATED).json({
      message: "User created successfully",
      data: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });
    return;
  } catch (error) {
    console.error("Registration error:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
    return;
  }
};


export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const {  username, email, password } = req.body;

    // Check for missing required fields (username OR email required, plus password)
    if (!password) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        message: ERROR_MESSAGES.MISSING_REQUIRED_FIELDS,
        errors: { password: 'password is required' }
      });
      return;
    }
    
    if (!username && !email) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        message: ERROR_MESSAGES.MISSING_REQUIRED_FIELDS,
        errors: { login: 'Either username or email is required' }
      });
      return;
    }

    const query = username
      ? { $or: [{ username: username }, { email: username }] }
      : { email: email };

    const user = await User.findOne(query).select("+password");
    if (!user) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.USER_NOT_FOUND });
      return;
    }

    if (user.status === "inactive") {
      res.status(HTTP_STATUS.FORBIDDEN).json({ message: "User account is inactive" });
      return;
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: ERROR_MESSAGES.INVALID_CREDENTIALS });
      return;
    }

    const actualUserId = user._id.toString();
    const sessionId = uuidv4();
    const accessToken = await createAccessTokenWithRole(actualUserId);
    const refreshToken = await createRefreshToken(actualUserId, sessionId);
   
    res
      .status(HTTP_STATUS.OK)
      .cookie("refreshToken", refreshToken.token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 10 * 24 * 60 * 60 * 1000,
        path: "/"
      })
      .cookie("sessionId", sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 10 * 24 * 60 * 60 * 1000,
        path: "/"
      })
      .json({
        user: {
          id: actualUserId,
          email: user.email,
          name: user.name,
          username: user.username,
          role: user.role,
        },
        accessToken,
        message: "Login successful"
      });

  } catch (error) {
    console.error("Login error:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.INTERNAL_ERROR });
  }
};




export const logout = async (req: Request, res: Response): Promise<void> => {
  const refreshToken = req.cookies?.refreshToken;
  const sessionId = req.cookies?.sessionId;
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;

  let userIdFromAccessToken: string | undefined;
  if (accessToken) {
    try {
      const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET!) as { userId?: string };
      if (typeof decoded.userId === "string") {
        userIdFromAccessToken = decoded.userId;
      }
    } catch {
      // Ignore invalid/expired access token and continue with refresh-token-based logout.
    }
  }

  try {
    if (sessionId && userIdFromAccessToken) {
      await redisClient.del(`refreshToken:${userIdFromAccessToken}:${sessionId}`);
    } else if (refreshToken) {
      const payload = await verifyRefreshToken(refreshToken);
      if (payload) {
        await redisClient.del(`refreshToken:${payload.userId}:${payload.sessionId}`);
      }
    }
  } catch (error) {
    console.error("Logout error while deleting Redis token:", error);
  }

  const clearCookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
    path: "/",
  };

  res
    .clearCookie("refreshToken", clearCookieOptions)
    .clearCookie("sessionId", clearCookieOptions)
    .status(HTTP_STATUS.OK)
    .json({ message: "Logged out successfully" });
};

// Admin: Create user with specific role
export const adminCreateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, name, email, password, role = ROLES.VIEWER } = req.body;

    // Validate input
    const validation = validateUserInput({ username, name, email, password });
    if (!validation.valid) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: ERROR_MESSAGES.INVALID_REQUEST,
        errors: validation.errors,
      });
      return;
    }

    // Validate role
    if (!Object.values(ROLES).includes(role)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: "Invalid role. Must be one of: viewer, analyst, admin",
      });
      return;
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      res.status(HTTP_STATUS.CONFLICT).json({
        message: ERROR_MESSAGES.USER_ALREADY_EXISTS,
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      name,
      email,
      password: hashedPassword,
      role,
      status: "active",
    });

    res.status(HTTP_STATUS.CREATED).json({
      message: "User created successfully by admin",
      data: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        status: newUser.status,
      },
    });
  } catch (error) {
    console.error("Admin create user error:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
};

// Admin: Get all users
export const adminGetAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (limit > 100) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: "Limit cannot exceed 100",
      });
      return;
    }

    const total = await User.countDocuments();
    const totalPages = Math.ceil(total / limit);

    const users = await User.find()
      .select("-password")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(HTTP_STATUS.OK).json({
      message: "Users retrieved successfully",
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Admin get users error:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
};

// Admin: Get user by ID
export const adminGetUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-password");

    if (!user) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: ERROR_MESSAGES.USER_NOT_FOUND,
      });
      return;
    }

    res.status(HTTP_STATUS.OK).json({
      message: "User retrieved successfully",
      data: user,
    });
  } catch (error) {
    console.error("Admin get user error:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
};

// Admin: Update user role
export const adminUpdateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !Object.values(ROLES).includes(role)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: "Invalid role. Must be one of: viewer, analyst, admin",
      });
      return;
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: ERROR_MESSAGES.USER_NOT_FOUND,
      });
      return;
    }

    res.status(HTTP_STATUS.OK).json({
      message: "User role updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Admin update role error:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
};

// Admin: Update user status
export const adminUpdateUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["active", "inactive"].includes(status)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: "Invalid status. Must be either 'active' or 'inactive'",
      });
      return;
    }

    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: ERROR_MESSAGES.USER_NOT_FOUND,
      });
      return;
    }

    res.status(HTTP_STATUS.OK).json({
      message: "User status updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Admin update status error:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
};

// Admin: Delete user
export const adminDeleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: ERROR_MESSAGES.USER_NOT_FOUND,
      });
      return;
    }

    res.status(HTTP_STATUS.OK).json({
      message: "User deleted successfully",
      data: { id: user._id },
    });
  } catch (error) {
    console.error("Admin delete user error:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
};
