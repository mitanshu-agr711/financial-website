import jwt from "jsonwebtoken";
import ms from "ms";
import { redisClient } from './redisClient.js';
import { config } from "dotenv";
config();
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/user.model.js';
const accessSecret = process.env.ACCESS_TOKEN_SECRET;
const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
const accessTokenExpire = (process.env.ACCESS_TOKEN_EXPIRE || "15m");
const refreshTokenExpire = (process.env.REFRESH_TOKEN_EXPIRE || '10d');
const refreshTokenExpireSec = Math.floor((ms(refreshTokenExpire) ?? 864000000) / 1000);
export const verifyRefreshToken = async (token) => {
    try {
        const decoded = jwt.verify(token, refreshSecret);
        if (!decoded || typeof decoded.userId !== "string" || typeof decoded.sid !== "string")
            return null;
        const redisToken = await redisClient.get(`refreshToken:${decoded.userId}:${decoded.sid}`);
        if (redisToken !== token)
            return null;
        return { userId: decoded.userId, sessionId: decoded.sid };
    }
    catch (err) {
        return null;
    }
};
export const createAccessToken = (userId) => {
    const options = { expiresIn: accessTokenExpire };
    return jwt.sign({ userId }, accessSecret, options);
};
export const createAccessTokenWithRole = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user)
            throw new Error('User not found');
        const options = { expiresIn: accessTokenExpire };
        return jwt.sign({ userId, role: user.role }, accessSecret, options);
    }
    catch (error) {
        throw new Error('Failed to create access token with role');
    }
};
export const createRefreshToken = async (userId, sessionId) => {
    const sid = sessionId || uuidv4();
    const options = { expiresIn: refreshTokenExpire };
    const token = jwt.sign({ userId, sid }, refreshSecret, options);
    await redisClient.set(`refreshToken:${userId}:${sid}`, token, { ex: refreshTokenExpireSec });
    return { token, sessionId: sid };
};
