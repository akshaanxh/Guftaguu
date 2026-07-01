const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL, { family: 0 });

redis.on('connect', async () => {
    console.log("✅ CONNECTED TO REDIS CLOUD!");
    await redis.del('waiting_queue');
    console.log("🧹 Waiting queue cleared.");
});

redis.on('error', (err) => console.error("❌ Redis Error:", err));

module.exports = redis;
