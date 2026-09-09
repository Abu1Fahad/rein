const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

console.log('Resolving SRV records for cluster0.e6zsich.mongodb.net...');
dns.resolveSrv('_mongodb._tcp.cluster0.e6zsich.mongodb.net', (err, addresses) => {
  if (err) {
    console.error('❌ SRV Error:', err);
  } else {
    console.log('✅ Resolved SRV Hosts:', addresses);
  }
});
