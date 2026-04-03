import express from "express";
import cors from "cors";
import { Redis } from "@upstash/redis";
import rateLimit from "express-rate-limit";
import router from "./route/auth.route.js";
import recordRouter from "./route/financial-record.route.js";
import dashboardRouter from "./route/dashboard.route.js";
import { connectDB } from "./models/connect.model.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
dotenv.config();
try {
    const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    const app = express();
    connectDB();
    const corsOptions = {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        optionsSuccessStatus: 200,
    };
    const globalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: "Too many requests from this IP, please try again later.",
        standardHeaders: true,
        legacyHeaders: false,
    });
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        message: "Too many auth attempts, please try again later.",
        skipSuccessfulRequests: true,
    });
    app.use(globalLimiter);
    app.use(cors(corsOptions));
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));
    app.use(cookieParser());
    app.use((req, res, next) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${req.method} ${req.path}`);
        next();
    });
    app.get("/", (req, res) => {
        res.json({
            message: "Financial Management Backend is running",
        });
    });
    app.get("/redis-test", async (_, res) => {
        try {
            await redis.set("server-test", "working", { ex: 60 });
            const value = await redis.get("server-test");
            res.json({
                message: " Redis connection successful",
                redis: value,
            });
        }
        catch (error) {
            res.status(500).json({
                message: " Redis connection failed",
                error: error.message,
            });
        }
    });
    app.use("/auth", authLimiter, router);
    app.use("/api/records", recordRouter);
    app.use("/api/dashboard", dashboardRouter);
    app.use(notFoundHandler);
    app.use(errorHandler);
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`

  Port: ${PORT}
 Database: MongoDB (Connected)
  Redis: ${process.env.UPSTASH_REDIS_REST_URL ? "Connected" : "Not configured"}

    `);
    });
}
catch (error) {
    console.error("Error during initialization:", error.message);
    console.error("Full error:", error);
    process.exit(1);
}
