import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { errorHandler } from 'node-utils-kit';
import userRouter from './routes/userRouter.js';
import postRouter from './routes/postRouter.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Simple Health Check
app.get('/', (req, res) => {
  res.send("TaskPlanet Mini Social Post API is running.");
});

// Routes
app.use('/api/v1/users', userRouter);
app.use('/api/v1/posts', postRouter);

// Global Error Handler Middleware
app.use(errorHandler);

export default app;
