// ensureIndex.js
const { MongoClient } = require("mongodb");

const uri = "mongodb://localhost:27017/?replicaSet=rs0"; // use your local Mongo URL
const dbName = "events_db";
const collectionName = "events";

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Create a unique index on eventId to prevent duplicates
    await collection.createIndex({ eventId: 1 }, { unique: true });
    console.log("✅ Unique index on eventId created successfully!");
  } catch (err) {
    console.error("❌ Error creating index:", err);
  } finally {
    await client.close();
  }
}

main();
