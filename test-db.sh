#!/bin/sh
node -e "
const dns = require('dns');
const net = require('net');
console.log('=== DNS RESOLVE ===');
dns.resolve4('db.xppfzlscfkrhocmkdjsn.supabase.co', (e,a) => {
  if (e) console.log('A records: ERROR -', e.message);
  else console.log('A records:', a);
});
dns.resolve6('db.xppfzlscfkrhocmkdjsn.supabase.co', (e,a) => {
  if (e) console.log('AAAA records: ERROR -', e.message);
  else console.log('AAAA records:', a);
  setTimeout(() => testTCP(), 500);
});

function testTCP() {
  console.log('=== TCP CONNECT (34.120.45.67:5432) ===');
  const sock = net.createConnection({host: '34.120.45.67', port: 5432});
  sock.on('connect', () => {
    console.log('TCP CONNECTED');
    sock.end();
    process.exit(0);
  });
  sock.on('error', (e) => {
    console.log('TCP ERROR:', e.message);
    process.exit(1);
  });
  sock.setTimeout(5000, () => {
    console.log('TCP TIMEOUT');
    sock.destroy();
    process.exit(2);
  });
}
"
