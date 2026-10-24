import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

// Load from both server/.env and root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../server/.env') });

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/saylani_hcm_lite';
  const isAtlas = uri.includes('mongodb+srv://') || uri.includes('mongodb.net');

  try {
    console.log(`[Database] Connecting to ${isAtlas ? 'MongoDB Atlas Cluster' : 'MongoDB'}...`);

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: isAtlas ? 5000 : 1500,
      dbName: 'saylani_hcm_lite',
    });

    console.log(`[Database] ✅ Connected successfully to ${isAtlas ? 'MongoDB Atlas' : 'MongoDB'}: ${uri.replace(/:([^:@]+)@/, ':****@')}`);

    // Automatically ensure all existing records are cleanly linked to the primary company
    const { ensureDataIsolationMigration } = await import('../services/migrationService');
    await ensureDataIsolationMigration();
  } catch (err: any) {
    if (isAtlas) {
      console.warn(`\n======================================================`);
      console.warn(`⚠️  MONGODB ATLAS CONNECTION FAILED:`);
      console.warn(`   ${err.message}`);
      console.warn(`\n📌 COMMON ATLAS FIX (IP WHITELIST):`);
      console.warn(`   1. Open MongoDB Atlas: https://cloud.mongodb.com/`);
      console.warn(`   2. In the left menu, click "Network Access" under Security`);
      console.warn(`   3. Click "Add IP Address"`);
      console.warn(`   4. Click "Allow Access From Anywhere" (0.0.0.0/0) or add your IP`);
      console.warn(`   5. Click "Confirm"`);
      console.warn(`======================================================\n`);
    } else {
      console.warn(`[Database] Local MongoDB not reachable (${err.message}).`);
    }

    console.log('[Database] Starting embedded in-memory MongoDB fallback so the app continues running...');

    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create({
        instance: {
          dbName: 'saylani_hcm_lite',
        },
      });
      const inMemoryUri = mongod.getUri();
      await mongoose.connect(inMemoryUri, { dbName: 'saylani_hcm_lite' });
      console.log(`[Database] Connected to Embedded MongoDB at: ${inMemoryUri}`);
    } catch (memErr: any) {
      console.error('[Database] Failed to launch embedded MongoDB:', memErr.message);
      throw memErr;
    }
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
