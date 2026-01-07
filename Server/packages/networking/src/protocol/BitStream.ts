/**
 * BitStream - LithTech-compatible bit-level serialization
 *
 * The game uses bit-packed messages for efficient bandwidth usage.
 * This class mimics CLTMessage_ReadBits/WriteBits from the client.
 *
 * Note: This is LSB-first order, different from MsbBitStream (MSB-first).
 * Use this for LithTech game layer messages.
 * Use MsbBitStream (in HuffmanCodec.ts) for RakNet transport layer messages.
 */

export class LsbBitStreamReader {
    readonly bitOrder: 'lsb' = 'lsb';
    private buffer: Buffer;
    private bitPosition: number = 0;
    private bytePosition: number = 0;
    private currentByte: number = 0;
    private bitsInCurrentByte: number = 0;

    constructor(buffer: Buffer, startBit: number = 0) {
        this.buffer = buffer;
        this.bitPosition = startBit;
        this.bytePosition = Math.floor(startBit / 8);
        const bitOffset = startBit % 8;
        if (this.bytePosition < buffer.length) {
            this.currentByte = buffer[this.bytePosition];
            this.bitsInCurrentByte = 8 - bitOffset;
            this.currentByte >>= bitOffset;
        }
    }

    get position(): number {
        return this.bitPosition;
    }

    get remainingBits(): number {
        return this.buffer.length * 8 - this.bitPosition;
    }

    /**
     * Read N bits from the stream (up to 32 bits)
     * Mirrors CLTMessage_ReadBits at 0x0047C7F0
     */
    readBits(numBits: number): number {
        if (numBits === 0) return 0;
        if (numBits > 32) throw new Error('Cannot read more than 32 bits at once');

        let result = 0;
        let bitsRead = 0;

        while (bitsRead < numBits) {
            if (this.bitsInCurrentByte === 0) {
                this.bytePosition++;
                if (this.bytePosition >= this.buffer.length) {
                    throw new Error('BitStream: Read past end of buffer');
                }
                this.currentByte = this.buffer[this.bytePosition];
                this.bitsInCurrentByte = 8;
            }

            const bitsToRead = Math.min(numBits - bitsRead, this.bitsInCurrentByte);
            const mask = (1 << bitsToRead) - 1;
            result |= (this.currentByte & mask) << bitsRead;

            this.currentByte >>= bitsToRead;
            this.bitsInCurrentByte -= bitsToRead;
            bitsRead += bitsToRead;
            this.bitPosition += bitsToRead;
        }

        return result >>> 0; // Ensure unsigned
    }

    readByte(): number {
        return this.readBits(8);
    }

    readUInt16(): number {
        return this.readBits(16);
    }

    readUInt32(): number {
        return this.readBits(32);
    }

    readBool(): boolean {
        return this.readBits(1) !== 0;
    }

    /**
     * Read a null-terminated string
     */
    readString(maxLength: number = 256): string {
        const chars: number[] = [];
        for (let i = 0; i < maxLength; i++) {
            const char = this.readBits(8);
            if (char === 0) break;
            chars.push(char);
        }
        return String.fromCharCode(...chars);
    }

    /**
     * Read fixed-length bytes
     */
    readBytes(count: number): Buffer {
        const bytes = Buffer.alloc(count);
        for (let i = 0; i < count; i++) {
            bytes[i] = this.readBits(8);
        }
        return bytes;
    }
}

export class LsbBitStreamWriter {
    readonly bitOrder: 'lsb' = 'lsb';
    private buffer: Buffer;
    private bitPosition: number = 0;
    private bytePosition: number = 0;
    private currentByte: number = 0;
    private bitsInCurrentByte: number = 0;

    constructor(initialSize: number = 1024) {
        this.buffer = Buffer.alloc(initialSize);
    }

    get position(): number {
        return this.bitPosition;
    }

    get length(): number {
        return Math.ceil(this.bitPosition / 8);
    }

    private ensureCapacity(additionalBits: number): void {
        // Grow the backing buffer to fit upcoming writes.
        const requiredBytes = Math.ceil((this.bitPosition + additionalBits) / 8);
        if (requiredBytes > this.buffer.length) {
            const newBuffer = Buffer.alloc(Math.max(requiredBytes, this.buffer.length * 2));
            this.buffer.copy(newBuffer);
            this.buffer = newBuffer;
        }
    }

    /**
     * Write N bits to the stream (up to 32 bits)
     * Mirrors CLTMessage_WriteBits at 0x0047CB20
     */
    writeBits(value: number, numBits: number): void {
        if (numBits === 0) return;
        if (numBits > 32) throw new Error('Cannot write more than 32 bits at once');

        this.ensureCapacity(numBits);

        // Mask to ensure we only use the specified number of bits
        const mask = numBits === 32 ? 0xffffffff : (1 << numBits) - 1;
        value = (value & mask) >>> 0;

        let bitsWritten = 0;

        while (bitsWritten < numBits) {
            const bitsToWrite = Math.min(numBits - bitsWritten, 8 - this.bitsInCurrentByte);
            const bitMask = (1 << bitsToWrite) - 1;

            this.currentByte |= ((value >> bitsWritten) & bitMask) << this.bitsInCurrentByte;

            this.bitsInCurrentByte += bitsToWrite;
            bitsWritten += bitsToWrite;
            this.bitPosition += bitsToWrite;

            if (this.bitsInCurrentByte === 8) {
                this.buffer[this.bytePosition] = this.currentByte;
                this.bytePosition++;
                this.currentByte = 0;
                this.bitsInCurrentByte = 0;
            }
        }
    }

    writeByte(value: number): void {
        this.writeBits(value, 8);
    }

    writeUInt16(value: number): void {
        this.writeBits(value, 16);
    }

    writeUInt32(value: number): void {
        this.writeBits(value, 32);
    }

    writeBool(value: boolean): void {
        this.writeBits(value ? 1 : 0, 1);
    }

    writeString(str: string, includeNull: boolean = true): void {
        for (let i = 0; i < str.length; i++) {
            this.writeBits(str.charCodeAt(i), 8);
        }
        if (includeNull) {
            this.writeBits(0, 8);
        }
    }

    writeBytes(data: Buffer): void {
        for (let i = 0; i < data.length; i++) {
            this.writeBits(data[i], 8);
        }
    }

    /**
     * Get the final buffer (trimmed to actual size)
     */
    toBuffer(): Buffer {
        // Flush any remaining bits and trim to size.
        if (this.bitsInCurrentByte > 0) {
            this.buffer[this.bytePosition] = this.currentByte;
        }
        return this.buffer.subarray(0, this.length);
    }
}

export { LsbBitStreamReader as BitStreamReader, LsbBitStreamWriter as BitStreamWriter };
