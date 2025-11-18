const dns = require('dns').promises;
const net = require('net');
const { URL } = require('url');

async function test() {
  const cs = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!cs) {
    console.error('Set SUPABASE_DB_URL or DATABASE_URL to run this test');
    process.exit(2);
  }

  const url = new URL(cs);
  const host = url.hostname;
  const port = Number(url.port || 5432);

  console.log('Testing DB host:', host, 'port:', port);

  try {
    const aRecords = await dns.resolve4(host).catch(() => []);
    const aaaaRecords = await dns.resolve6(host).catch(() => []);

    console.log('A records (IPv4):', aRecords);
    console.log('AAAA records (IPv6):', aaaaRecords);

    const tryConnect = (addr, family) => new Promise((resolve) => {
      const s = new net.Socket();
      const timeout = setTimeout(() => {
        s.destroy();
        resolve({ addr, family, ok: false, reason: 'timeout' });
      }, 5000);
      s.once('error', (err) => {
        clearTimeout(timeout);
        resolve({ addr, family, ok: false, reason: err.code || err.message });
      });
      s.connect(port, addr, () => {
        clearTimeout(timeout);
        s.end();
        resolve({ addr, family, ok: true });
      });
    });

    for (const ip of aRecords) {
      const r = await tryConnect(ip, 4);
      console.log('-> IPv4', r);
    }
    for (const ip of aaaaRecords) {
      const r = await tryConnect(ip, 6);
      console.log('-> IPv6', r);
    }

    // Also try connecting to hostname directly (let OS decide)
    const rHost = await tryConnect(host, 'auto');
    console.log('-> Hostname connect result:', rHost);

  } catch (e) {
    console.error('Error during DNS/connect tests:', e);
  }
}

test();
