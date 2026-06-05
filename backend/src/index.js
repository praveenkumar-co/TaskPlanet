import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import connectDB from './db/index.js';
import { connectRedisAndBloom } from './db/redis.js';
import app from './app.js';

connectDB()
  .then(async () => {
    await connectRedisAndBloom();
    
    const port = process.env.PORT || 8000;
    app.listen(port, () => {
      console.log(`🚀 Server is running at port: ${port}`);
    });
  })
  .catch((error) => {
    console.error("❌ MongoDB connection failed: ", error.message);
  });

