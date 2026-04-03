import jwt, { Secret, SignOptions} from "jsonwebtoken";
import ms, { StringValue } from "ms";
import { redisClient} from './redisClient.js'
import { config } from "dotenv";
config();
import { v4 as uuidv4 } from 'uuid'
import { User } from '../models/user.model.js';

const accessSecret: Secret = process.env.ACCESS_TOKEN_SECRET as string;
const refreshSecret: Secret = process.env.REFRESH_TOKEN_SECRET as string;
const accessTokenExpire = (process.env.ACCESS_TOKEN_EXPIRE || "15m") as StringValue;
const refreshTokenExpire = (process.env.REFRESH_TOKEN_EXPIRE || '10d') as StringValue;
const refreshTokenExpireSec = Math.floor(
  (ms(refreshTokenExpire as ms.StringValue) ?? 864000000) / 1000
);


export const verifyRefreshToken = async (token: string): Promise<{ userId: string, sessionId: string } | null> => {
  try {
    const decoded = jwt.verify(token, refreshSecret) as { userId: string, sid: string };
    if (!decoded || typeof decoded.userId !== "string" || typeof decoded.sid !== "string") return null;
    const redisToken = await redisClient.get(`refreshToken:${decoded.userId}:${decoded.sid}`);
    if (redisToken !== token) return null;
    return { userId: decoded.userId, sessionId: decoded.sid };
  } catch (err) {
    return null;
  }
};

export const createAccessToken = (userId: string): string => {
  const options: SignOptions = { expiresIn: accessTokenExpire };
  return jwt.sign({ userId }, accessSecret, options);
};

export const createAccessTokenWithRole = async (userId: string): Promise<string> => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    
    const options: SignOptions = { expiresIn: accessTokenExpire };
    return jwt.sign({ userId, role: user.role }, accessSecret, options);
  } catch (error) {
    throw new Error('Failed to create access token with role');
  }
};

export const createRefreshToken = async (userId: string, sessionId?: string): Promise<{ token: string, sessionId: string }> => {
  const sid = sessionId || uuidv4();
  const options: SignOptions = { expiresIn: refreshTokenExpire };
  const token = jwt.sign({ userId, sid }, refreshSecret, options);
  await redisClient.set(`refreshToken:${userId}:${sid}`, token, { ex: refreshTokenExpireSec });
  return { token, sessionId: sid };
};
