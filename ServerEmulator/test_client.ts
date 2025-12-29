import dgram from 'dgram';

const PORT = 61000;
const HOST = '127.0.0.1';

const CONNECTION_MAGIC = 0x9919D9C7;

function buildLithTechConnectPacket(): Buffer {
  const buffer = Buffer.alloc(200);
  let offset = 0;

  buffer.writeUInt32LE(CONNECTION_MAGIC, offset);
  offset += 4;

  const requestTypeBits = 2;
  buffer.writeUInt8(requestTypeBits << 5, offset);
  offset += 1;

  const password = '37eG87Ph';
  buffer.write(password, offset, 'ascii');
  offset += 128;

  buffer.writeUInt32LE(Date.now() & 0xFFFFFFFF, offset);
  offset += 4;

  return buffer.subarray(0, offset);
}

function sendTestPacket() {
  const client = dgram.createSocket('udp4');

  client.on('message', (msg, rinfo) => {
    console.log(`[Response] From ${rinfo.address}:${rinfo.port}`);
    console.log(`[Response] Length: ${msg.length} bytes`);
    console.log(`[Response] Hex: ${msg.toString('hex')}`);
    
    if (msg.length >= 4) {
      const magic = msg.readUInt32LE(0);
      console.log(`[Response] Magic: 0x${magic.toString(16)}`);
    }
    
    client.close();
  });

  client.on('error', (err) => {
    console.error('[Error]', err);
    client.close();
  });

  const simplePacket = Buffer.from([0x01, 0x00, 0x00, 0x00]);
  console.log(`\n[Test 1] Sending simple ping to ${HOST}:${PORT}`);
  console.log(`[Test 1] Data: ${simplePacket.toString('hex')}`);
  
  client.send(simplePacket, PORT, HOST, (err) => {
    if (err) {
      console.error('[Send Error]', err);
    } else {
      console.log('[Test 1] Sent successfully');
    }
  });

  setTimeout(() => {
    const lithPacket = buildLithTechConnectPacket();
    console.log(`\n[Test 2] Sending LithTech connect packet to ${HOST}:${PORT}`);
    console.log(`[Test 2] First 20 bytes: ${lithPacket.subarray(0, 20).toString('hex')}`);
    console.log(`[Test 2] Total length: ${lithPacket.length} bytes`);
    
    client.send(lithPacket, PORT, HOST, (err) => {
      if (err) {
        console.error('[Send Error]', err);
      } else {
        console.log('[Test 2] Sent successfully');
      }
    });
  }, 1000);

  setTimeout(() => {
    console.log('\n[Timeout] No response received within 5 seconds');
    client.close();
  }, 5000);
}

console.log('='.repeat(50));
console.log('  FoM UDP Test Client');
console.log('='.repeat(50));
console.log(`Target: ${HOST}:${PORT}`);

sendTestPacket();
