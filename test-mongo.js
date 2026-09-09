const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://Dlid:asask7l@cluster0.e6zsich.mongodb.net/rein?retryWrites=true&w=majority";

async function test() {
  console.log('Testing connection to MongoDB Atlas with Google DNS (8.8.8.8)...');
  try {
    const client = new MongoClient(uri, {
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
