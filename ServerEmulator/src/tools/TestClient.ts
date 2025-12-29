import dgram from 'dgram';
import { BitStreamWriter } from '../protocol/BitStream';
import { CONNECTION_MAGIC, ConnectionRequestType, DEFAULT_PORT } from '../protocol/Constants';

class TestClient {
  private socket: dgram.Socket;
  private serverAddress: string;
  private serverPort: number;

  constructor(serverAddress: string = '127.0.0.1', serverPort: number = DEFAULT_PORT) {
    this.socket = dgram.createSocket('udp4');
    this.serverAddress = serverAddress;
    this.serverPort = serverPort;
    
    this.socket.on('message', (msg, rinfo) => {
      console.log(`\nReceived ${msg.length} bytes from ${rinfo.address}:${rinfo.port}`);
      this.hexDump(msg);
      this.analyzeResponse(msg);
    });

    this.socket.on('error', (err) => {
      console.error('Socket error:', err);
    });
  }

  private hexDump(buffer: Buffer): void {
    const bytesPerLine = 16;
    for (let offset = 0; offset < buffer.length; offset += bytesPerLine) {
      const slice = buffer.subarray(offset, Math.min(offset + bytesPerLine, buffer.length));
      const hex = Array.from(slice).map(b => b.toString(16).padStart(2, '0')).join(' ');
      const ascii = Array.from(slice).map(b => (b >= 0x20 && b <= 0x7e) ? String.fromCharCode(b) : '.').join('');
      console.log(`  ${offset.toString(16).padStart(4, '0')}  ${hex.padEnd(47)}  |${ascii}|`);
    }
  }

  private analyzeResponse(data: Buffer): void {
    if (data.length < 4) return;
    
    const firstDword = data.readUInt32LE(0);
    if (firstDword === CONNECTION_MAGIC) {
      console.log('\n  → Response contains Connection Magic');
      if (data.length > 4) {
        const typeBits = data[4] & 0x07;
        console.log(`  → Response Type: ${typeBits}`);
      }
    }
  }

  sendConnectionRequest(): void {
    console.log(`\nSending connection request to ${this.serverAddress}:${this.serverPort}`);
    
    const writer = new BitStreamWriter(256);
    
    writer.writeUInt32(CONNECTION_MAGIC);
    writer.writeBits(ConnectionRequestType.CONNECT, 3);
    
    const fakeGuid = Buffer.alloc(16);
    for (let i = 0; i < 16; i++) {
      writer.writeByte(fakeGuid[i]);
    }
    
    const packet = writer.toBuffer();
    console.log(`Sending ${packet.length} bytes:`);
    this.hexDump(packet);
    
    this.socket.send(packet, this.serverPort, this.serverAddress, (err) => {
      if (err) console.error('Send error:', err);
      else console.log('Sent!');
    });
  }

  sendQuery(): void {
    console.log(`\nSending query to ${this.serverAddress}:${this.serverPort}`);
    
    const writer = new BitStreamWriter(64);
    writer.writeUInt32(CONNECTION_MAGIC);
    writer.writeBits(ConnectionRequestType.QUERY, 3);
    
    const packet = writer.toBuffer();
    console.log(`Sending ${packet.length} bytes:`);
    this.hexDump(packet);
    
    this.socket.send(packet, this.serverPort, this.serverAddress, (err) => {
      if (err) console.error('Send error:', err);
      else console.log('Sent!');
    });
  }

  sendRawPacket(data: Buffer): void {
    console.log(`\nSending raw packet (${data.length} bytes):`);
    this.hexDump(data);
    
    this.socket.send(data, this.serverPort, this.serverAddress, (err) => {
      if (err) console.error('Send error:', err);
      else console.log('Sent!');
    });
  }

  close(): void {
    this.socket.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'connect';
  const address = args[1] || '127.0.0.1';
  const port = parseInt(args[2] || String(DEFAULT_PORT), 10);

  console.log('='.repeat(50));
  console.log('  FoM Test Client');
  console.log('='.repeat(50));
  console.log(`Target: ${address}:${port}`);

  const client = new TestClient(address, port);

  switch (command) {
    case 'connect':
      client.sendConnectionRequest();
      break;
    case 'query':
      client.sendQuery();
      break;
    default:
      console.log('Usage: npx tsx src/tools/TestClient.ts [connect|query] [address] [port]');
      client.close();
      return;
  }

  setTimeout(() => {
    console.log('\nTimeout - closing');
    client.close();
  }, 5000);
}

main();
