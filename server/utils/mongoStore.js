const fs = require('fs/promises');
const path = require('path');
const { MongoClient } = require('mongodb');

const COLLECTION_MAP = {
  'users.json': 'users',
  'sensorData.json': 'sensorData',
  'lcd.json': 'lcd',
  'thresholds.json': 'thresholds',
  'alerts.json': 'alerts',
  'predictions.json': 'predictions',
};

let clientPromise = null;
let dbPromise = null;

function isMongoEnabled() {
  return Boolean(process.env.MONGODB_URI);
}

function getDatabaseName() {
  return process.env.MONGODB_DB_NAME || 'iot_dashboard';
}

function resolveCollectionName(filePath) {
  return COLLECTION_MAP[path.basename(filePath)] || null;
}

async function getMongoClient() {
  if (!isMongoEnabled()) {
    return null;
  }

  if (!clientPromise) {
    const client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    clientPromise = client.connect();
  }

  return clientPromise;
}

async function getMongoDb() {
  if (!isMongoEnabled()) {
    return null;
  }

  if (!dbPromise) {
    const client = await getMongoClient();
    dbPromise = client.db(getDatabaseName());
  }

  return dbPromise;
}

function stripMongoId(document) {
  if (!document) {
    return document;
  }

  const { _id, ...rest } = document;
  return rest;
}

async function ensureMongoSeed(filePath, defaultValue) {
  const collectionName = resolveCollectionName(filePath);

  if (!collectionName) {
    return false;
  }

  const db = await getMongoDb();
  const collection = db.collection(collectionName);
  const count = await collection.estimatedDocumentCount();

  if (count > 0) {
    return true;
  }

  let seedValue = defaultValue;

  try {
    const existingContent = await fs.readFile(filePath, 'utf8');
    if (existingContent.trim()) {
      seedValue = JSON.parse(existingContent);
    }
  } catch {
    // Ignore local file errors when seeding MongoDB.
  }

  if (Array.isArray(seedValue)) {
    if (seedValue.length > 0) {
      await collection.insertMany(seedValue.map((item) => ({ ...item })));
    }
    return true;
  }

  if (seedValue && typeof seedValue === 'object') {
    await collection.insertOne({ ...seedValue });
  }

  return true;
}

async function readMongoJson(filePath, defaultValue) {
  const collectionName = resolveCollectionName(filePath);

  if (!collectionName) {
    return defaultValue;
  }

  const db = await getMongoDb();
  const collection = db.collection(collectionName);
  const documents = await collection.find({}).sort({ _id: 1 }).toArray();

  if (!documents.length) {
    return defaultValue;
  }

  if (Array.isArray(defaultValue)) {
    return documents.map(stripMongoId);
  }

  return stripMongoId(documents[0]) || defaultValue;
}

async function writeMongoJson(filePath, data) {
  const collectionName = resolveCollectionName(filePath);

  if (!collectionName) {
    return;
  }

  const db = await getMongoDb();
  const collection = db.collection(collectionName);

  await collection.deleteMany({});

  if (Array.isArray(data)) {
    if (data.length > 0) {
      await collection.insertMany(data.map((item) => ({ ...item })));
    }
    return;
  }

  if (data && typeof data === 'object') {
    await collection.insertOne({ ...data });
  }
}

module.exports = {
  ensureMongoSeed,
  isMongoEnabled,
  readMongoJson,
  resolveCollectionName,
  writeMongoJson,
};