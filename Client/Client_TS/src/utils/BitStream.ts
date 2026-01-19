export class BitStreamReader {
  private buffer: Buffer;
  private bitPos: number;

  constructor(buffer: Buffer, bitOffset: number = 0) {
    this.buffer = buffer;
    this.bitPos = Math.max(0, bitOffset | 0);
  }

  get position(): number {
    return this.bitPos;
  }

  get remainingBits(): number {
    return Math.max(0, this.buffer.length * 8 - this.bitPos);
  }

  readBool(): boolean {
    return this.readBits(1) === 1;
  }

  readBits(bits: number): number {
    const count = Math.max(0, bits | 0);
    let result = 0;
    for (let i = 0; i < count; i += 1) {
      if (this.bitPos >= this.buffer.length * 8) {
        break;
      }
      const byteIndex = this.bitPos >> 3;
      const bitIndex = this.bitPos & 7;
      const bit = (this.buffer[byteIndex] >> bitIndex) & 1;
      result |= bit << i;
      this.bitPos += 1;
    }
    return result >>> 0;
  }

  readBytes(count: number): Buffer {
    const length = Math.max(0, count | 0);
    const out = Buffer.alloc(length);
    for (let i = 0; i < length; i += 1) {
      out[i] = this.readBits(8) & 0xff;
    }
    return out;
  }

  readUInt16(): number {
    const buf = this.readBytes(2);
    return buf.readUInt16LE(0);
  }

  readUInt32(): number {
    const buf = this.readBytes(4);
    return buf.readUInt32LE(0);
  }
}

export class BitStreamWriter {
  private bytes: number[];
  private bitPos: number;

  constructor(_initialBits: number = 128) {
    this.bytes = [];
    this.bitPos = 0;
  }

  writeBits(value: number, bits: number): void {
    const count = Math.max(0, bits | 0);
    const val = value >>> 0;
    for (let i = 0; i < count; i += 1) {
      const bit = (val >> i) & 1;
      const byteIndex = this.bitPos >> 3;
      const bitIndex = this.bitPos & 7;
      if (this.bytes.length <= byteIndex) {
        this.bytes[byteIndex] = 0;
      }
      if (bit) {
        this.bytes[byteIndex] |= 1 << bitIndex;
      }
      this.bitPos += 1;
    }
  }

  toBuffer(): Buffer {
    return Buffer.from(this.bytes);
  }
}
