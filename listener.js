// listener.js
const WebSocket = require("ws");
const { MongoClient } = require("mongodb");
const Redis = require("ioredis");

// --- CONFIG ---
const WS_URL = "ws://localhost:8080"; // your WebSocket server
const MONGO_URL = "mongodb://localhost:27017/?replicaSet=rs0";
const DB_NAME = "events_db";
const COLLECTION = "events";
const redis = new Redis(); // default: localhost:6379

// --- PROCESS EVENT ---
async function processEvent(event, listenerName) {
  const client = new MongoClient(MONGO_URL);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    // Insert event (unique index on eventId prevents duplicates)
    await collection.insertOne({ ...event, processedBy: listenerName });
    console.log(` ${listenerName} processed and saved event: ${event.eventId}`);
  } catch (err) {
    if (err.code === 11000) {
      console.log(` ${listenerName} duplicate event skipped: ${event.eventId}`);
    } else {
      console.error(` ${listenerName} error processing event:`, err);
    }
  } finally {
    await client.close();
  }
}

// --- HANDLE EVENT WITH REDIS LOCK ---
async function handleEvent(rawEvent, listenerName) {
  const event = JSON.parse(rawEvent);
  const eventId = event.eventId;
  const lockKey = `lock:${eventId}`;

  // Add small random delay to avoid same listener winning lock repeatedly
  await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 100)));

  // Acquire a Redis lock (expire in 10s)
  const acquired = await redis.set(lockKey, listenerName, "NX", "EX", 10);
  if (!acquired) {
    console.log(` ${listenerName} event already being processed: ${eventId}`);
    return;
  }

  try {
    await processEvent(event, listenerName);
  } finally {
    await redis.del(lockKey);
  }
}

// --- START LISTENER INSTANCE ---
function startListener(instanceName) {
  const ws = new WebSocket(WS_URL);

  ws.on("open", () => {
    console.log(` ${instanceName} connected to WebSocket`);
  });

  ws.on("message", async (data) => {
    console.log(` ${instanceName} received event: ${data.toString()}`);
    await handleEvent(data.toString(), instanceName);
  });

  ws.on("close", () => console.log(`❌ ${instanceName} disconnected`));
  ws.on("error", (err) => console.error(`💥 ${instanceName} error:`, err));
}

// --- SIMULATE MULTIPLE INSTANCES ---
for (let i = 1; i <= 10; i++) {
  startListener(`Listener-${i}`);
}
