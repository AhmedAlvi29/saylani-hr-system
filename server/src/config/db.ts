import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/saylani_hcm_lite';

  try {
    // Attempt standard connection with 2.5s timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`[Database] Connected successfully to MongoDB at: ${uri}`);
  } catch (err: any) {
    console.warn(`[Database] Failed to connect to local MongoDB (${err.message}).`);
    console.log('[Database] Initializing embedded in-memory MongoDB for zero-config hackathon execution...');

    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create({
        instance: {
          dbName: 'saylani_hcm_lite',
        },
      });
      const inMemoryUri = mongod.getUri();
      await mongoose.connect(inMemoryUri);
      console.log(`[Database] Connected to Embedded MongoDB instance at: ${inMemoryUri}`);
    } catch (memErr: any) {
      console.error('[Database] Failed to launch embedded MongoDB:', memErr.message);
      throw memErr;
    }
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
