const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const { MongoClient } = require('mongodb');

const directUri = "mongodb://Dlid:asask7l@ac-p4aysp8-shard-00-00.e6zsich.mongodb.net:27017,ac-p4aysp8-shard-00-01.e6zsich.mongodb.net:27017,ac-p4aysp8-shard-00-02.e6zsich.mongodb.net:27017/rein?replicaSet=atlas-7lf7fo-shard-0&ssl=true&authSource=admin";

async function test() {
  console.log('Testing direct seed list connection to MongoDB Atlas...');
  try {
    const client = new MongoClient(directUri, {
      tls: true,
      tlsAllowInvalidCertificates: true,
      serverSelectionTimeoutMS: 10000
    });
    await client.connect();
    console.log('✅ Connected successfully to MongoDB Atlas!');
    const db = client.db('rein');
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    const usersCount = await db.collection('users').countDocuments();
    const playersCount = await db.collection('players').countDocuments();
    console.log(`Users count: ${usersCount}, Players count: ${playersCount}`);
    await client.close();
  } catch (err) {
    console.error('❌ Connection error:', err);
  }
}

test();
