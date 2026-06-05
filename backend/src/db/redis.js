import { createClient } from "redis";
import { BloomFilter } from "scalable-bloom-kit";
import User from "../models/userModel.js";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6380";

const redisClient = createClient({
  url: redisUrl
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));

export const usernameFilter = new BloomFilter({
  client: redisClient,
  key: "usernames:bloom",
  expectedItems: 100000,
  errorRate: 0.01,
  expansion: 2,
  autoCreate: true
});

export const connectRedisAndBloom = async () => {
  try {
    await redisClient.connect();
    console.log("Redis connected successfully!");
    
    await usernameFilter.init();
    console.log("Username Bloom filter initialized!");

    // Seed the bloom filter from Mongo on first run
    const info = await usernameFilter.info();
    if (!info.numberOfItemsInserted || info.numberOfItemsInserted === 0) {
      console.log("Seeding Username Bloom Filter from database...");
      const users = await User.find({}).select("username");
      const usernames = users.map(u => u.username);
      if (usernames.length > 0) {
        await usernameFilter.addMany(usernames);
        console.log(`Seeded ${usernames.length} usernames into Bloom filter.`);
      } else {
        console.log("No usernames found to seed.");
      }
    } else {
      console.log(`Bloom filter already contains ${info.numberOfItemsInserted} usernames.`);
    }
  } catch (error) {
    console.error("❌ Redis / Bloom filter initialization failed: ", error.message);
  }
};

export { redisClient };
