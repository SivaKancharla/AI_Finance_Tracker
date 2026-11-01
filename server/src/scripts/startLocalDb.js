import { MongoMemoryServer } from 'mongodb-memory-server';

console.log('Starting local in-memory MongoDB server...');
const mongod = await MongoMemoryServer.create({
  instance: {
    port: 27017,
    dbName: 'fintrack'
  }
});

console.log('====================================================');
console.log(' Local In-Memory MongoDB is running!');
console.log(' Connection URI: mongodb://localhost:27017/fintrack');
console.log(' Press Ctrl+C to stop the database.');
console.log('====================================================');

process.on('SIGINT', async () => {
  console.log('\nStopping local in-memory MongoDB...');
  await mongod.stop();
  process.exit(0);
});
