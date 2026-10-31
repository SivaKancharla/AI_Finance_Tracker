import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Increase Jest timeout for DB spins
if (typeof jest !== 'undefined') {
  jest.setTimeout(30000);
}

let mongoServer;

export const connectTestDB = async () => {
  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create({
      instance: {
        launchTimeout: 60000
      }
    });
  }
  const uri = mongoServer.getUri();
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
};

export const clearTestDB = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

export const closeTestDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
};

