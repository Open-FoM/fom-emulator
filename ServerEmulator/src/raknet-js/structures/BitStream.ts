import * as fs from 'fs';

import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);

/**
 * The BitStream class used for reading data from a Buffer.
 */
export default class BitStream {
    readonly bitOrder: 'msb' = 'msb';
    #data: Buffer;
    #byteCount: number;

    #readBytePosition: number;
    #readBitPosition: number;

    #writeBytePosition: number;
    #writeBitPosition: number;

    #byte: number | undefined;

    readonly #mask: Array<number>;

    /**
     * Creates a new instance of the BitStream class and sets up the default values for some variables
     * @param {Buffer} data
     */
    constructor(data?: Buffer) {
        this.#data = data ?? Buffer.alloc(0);

        this.#byteCount = this.#data.length;
        //for reading data
        this.#readBytePosition = 0;
        this.#readBitPosition = 7;
        //for writing data
        this.#writeBytePosition = 0;
        this.#writeBitPosition = 7;
        this.#mask = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80];

        this.#byte = this.#byteCount ? this.#data.readUInt8(0) : undefined;
    }

    /**
     * Returns the Buffer
     */
    get data(): Buffer {
        return this.#data;
    }

    /**
     * Returns the length of this BitStream
     * @returns {number}
     */
    length(): number {
        return this.#byteCount;
    }

    resetRead(): void {
        this.#readBytePosition = 0;
        this.#readBitPosition = 7;
        this.#byte = this.#byteCount ? this.#data.readUInt8(0) : undefined;
    }

    /**
     * Current read offset in bits from start of stream.
     */
    readOffsetBits(): number {
        return this.#readBytePosition * 8 + (7 - this.#readBitPosition);
    }

    /**
     * Remaining unread bits in the stream.
     */
    remainingReadBits(): number {
        const remaining = this.#byteCount * 8 - this.readOffsetBits();
        return remaining < 0 ? 0 : remaining;
    }

    /**
     * Gets the number of bits in this stream
     * @returns {number}
     */
    bits(): number {
        return this.#writeBytePosition * 8 + (8 - this.#writeBitPosition) - 1;
    }

    /**
     * Returns true if we are at the end of the stream
     * @returns {boolean}
     */
    allRead(): boolean {
        return this.#readBytePosition * 8 + this.#readBitPosition >= this.#byteCount * 8 - 1;
    }

    /**
     * Reads a single bit from the Buffer
     * @returns {number}
     */
    readBit(): number {
        if (this.#readBytePosition >= this.#byteCount) {
            this.#writeBytePosition = this.#readBytePosition;
            this.writeByte(0);
        }

        let byte = this.#data.readUInt8(this.#readBytePosition);
        let bit = (byte & this.#mask[this.#readBitPosition]) >> this.#readBitPosition;
        if (--this.#readBitPosition === -1) {
            this.#readBitPosition = 7;
            this.#readBytePosition++;
        }
        return bit;
    }

    /**
     * Writes a single bit to the buffer
     * @param {boolean} b The bit to write
     */
    writeBit(b: boolean): void {
        if (typeof b !== 'boolean') {
            throw new Error('BitStream writeBit was not passed a boolean');
        }
        //if the wBitPos is in the first bit position, we have rolled over
        if (this.#writeBitPosition === 7) {
            //increase the buffer size...
            let old = this.#data;
            this.#data = Buffer.alloc(this.#writeBytePosition + 1);
            this.#byteCount = this.#writeBytePosition + 1;

            old.copy(this.#data);

            this.#data.writeUInt8(0, this.#writeBytePosition);
        }
        //now we need to get the current byte...
        let byte = this.#data.readUInt8(this.#writeBytePosition);

        //set the bit
        byte |= Number(b) << this.#writeBitPosition;

        //write the byte
        this.#data.writeUInt8(byte, this.#writeBytePosition);

        //move to next bit
        this.#writeBitPosition--;

        //if we are done writing this byte, move to the next one
        if (this.#writeBitPosition < 0) {
            this.#writeBitPosition = 7;
            this.#writeBytePosition++;
        }
    }

    /**
     * Reads multiple bits from the buffer
     * @param {Number} n The number of bits to read
     * @returns {Number}
     */
    readBits(n: number): number {
        let val = 0;
        if (this.#readBytePosition < this.#byteCount)
            this.#byte = this.#data.readUInt8(this.#readBytePosition);

        while (n--) {
            let bit = this.readBit();
            val = (val << 1) | bit;
        }
        return val;
    }

    /**
     * Writes number to stream with a certain amount of bits
     * @param {Number} n The number to write to the stream
     * @param {Number} b The number of bits to write
     */
    writeBits(n: number, b: number): void {
        for (let i = b; i > 0; i--) {
            let temp = (n >> (i - 1)) & 0x01;
            this.writeBit(temp === 1);
        }
    }

    /**
     * Reads bits in reverse
     * @param {Number} n The number of bits to read
     * @returns {Number}
     */
    readBitsReversed(n: number): number {
        let val = 0;

        // Don't know why I need this here, but I do
        for (let i = 0; i < n; i++) {
            let bit = this.readBit();
            val |= bit << i;
        }
        return val;
    }

    /**
     * Don't ask...
     * @param ret
     * @param n
     * @param b
     * @returns {*}
     */
    readBitsStream(ret: BitStream, n: number, b: boolean = true) {
        if (n <= 0) return undefined;
        if (this.#readBytePosition + Math.floor(n / 8) > this.#byteCount) return undefined;

        let c = 0;
        while (n > 0) {
            if (n >= 8) {
                ret.writeByteOffset(this.readByte(), c);
                n -= 8;
                c++;
            } else {
                let neg = n - 8;
                if (neg < 0) {
                    if (b) {
                        ret.writeByteOffset(ret.readByteOffset(c) >> -neg, c);
                        this.#readBytePosition += 8 + neg;
                    } else {
                        this.#readBytePosition += 8;
                    }
                }
                n = 0;
            }
        }
        return ret;
    }

    /**
     * Reads a byte from the buffer
     * @returns {Number}
     */
    readByte(): number {
        return this.readBits(8);
    }

    /**
     * Read a byte at a given offset
     * @param {Number} o Offset byte
     * @returns {Number}
     */
    readByteOffset(o: number): number {
        return this.#data.readUInt8(o);
    }

    /**
     * Read number of bytes to a new stream
     * @param {Number} n Number of bytes
     * @returns {BitStream}
     */
    readBytes(n: number): BitStream {
        let val = new BitStream();
        while (n-- && this.#readBytePosition < this.length()) {
            val.writeByte(this.readByte());
        }
        return val;
    }

    /**
     * Writes a byte to the stream
     * @param {Number} n The byte to write to the stream
     */
    writeByte(n: number): void {
        //we have to build an array of true and false... or we can just left shift it and do it that way
        for (let i = 0; i < 8; i++) {
            let t = (n & 0x80) >>> 7; //get the leftmost bit and put it on the right
            this.writeBit(t === 1);
            n <<= 1; //move to next bit...
            n &= 0xff; //ensure we are only looking at a byte...
        }
    }

    /**
     * Writes a signed byte to the stream
     * @param {Number} n The byte to write to the stream
     */
    writeSignedByte(n: number): void {
        // write the sign bit and correct
        this.writeBit(n < 0);
        n = Math.abs(n);

        //we have to build an array of true and false... or we can just left shift it and do it that way
        for (let i = 0; i < 7; i++) {
            let t = (n & 0x80) >>> 7; //get the leftmost bit and put it on the right
            this.writeBit(t === 1);
            n <<= 1; //move to next bit...
            n &= 0xff; //ensure we are only looking at a byte...
        }
    }

    /**
     * Writes a byte a offset
     * @param {Number} n Byte to write
     * @param {Number} o Offset to write at
     */
    writeByteOffset(n: number, o: number): void {
        let old = this.#data;
        if (o + 1 > this.length()) {
            //we are trying to write outside the current size... resizing to fix...
            this.#data = Buffer.alloc(o + 1, 0);
            this.#byteCount = this.#writeBytePosition + 1;

            for (let i = 0; i < this.#writeBytePosition; i++) {
                this.#data.writeUInt8(old.readUInt8(i), i); //copy over into new Buffer
            }
            this.#byteCount = o + 1;
        }
        this.#data.writeUInt8(n, o);
    }

    /**
     * Reads a character from the stream
     * @returns {number}
     */
    readChar(): number {
        return this.readBits(8);
    }

    /**
     * Writes a boolean to the stream
     * @param {boolean} n
     */
    writeBoolean(n: boolean): void {
        if (n === true) {
            this.writeByte(1);
        } else {
            this.writeByte(0);
        }
    }

    /**
     * Reads a boolean from the stream
     * @returns {boolean}
     */
    readBoolean(): boolean {
        return Boolean(this.readByte());
    }

    /**
     * Writes a character to the stream
     * @param {number} n Character to write
     */
    writeChar(n: number): void {
        this.writeByte(n);
    }

    /**
     * Reads a signed character from the stream
     * @returns {number}
     */
    readSignedChar(): number {
        if (this.readBit()) {
            return -this.readBits(7);
        }
        return this.readBits(7);
    }

    /**
     * Reads an unsigned short from the stream
     * @returns {number}
     */
    readShort(): number {
        return this.readByte() + (this.readByte() << 8);
    }

    /**
     * Writes an unsigned short to the stream
     * @param {number} n The number to write
     */
    writeShort(n: number): void {
        this.writeByte(n & 0xff); //write the bottom byte
        this.writeByte((n & 0xff00) >>> 8); //write the top byte
    }

    /**
     * Writes an signed short to the stream
     * @param {number} n The number to write
     */
    writeSignedShort(n: number): void {
        this.writeByte(n & 0xff); //write the bottom byte
        this.writeSignedByte((n & 0xff00) >>> 8); //write the top byte
    }

    /**
     * Writes a compressed short to this stream
     * @param {number} n The short to compress
     */
    writeCompressedShort(n: number): void {
        this.writeCompressed(n, 2);
    }

    /**
     * Reads a signed short from the stream
     * @returns {number}
     */
    readSignedShort(): number {
        let firstByte = this.readByte();
        if (this.readBit()) {
            return -(firstByte & (this.readBits(7) << 7));
        }
        return firstByte & (this.readBits(7) << 7);
    }

    /**
     * Reads an unsigned long from the stream
     * @returns {number}
     */
    readLong(): number {
        return (
            this.readByte() +
            (this.readByte() << 8) +
            (this.readByte() << 16) +
            this.readByte() * 16777216
        ); // Had to do this because shifting it over 24 places causes it to return a signed value because JavsScript treats numbers in bitshift as 32bit
    }

    /**
     * Writes an unsigned long to the stream
     * @param {number} n The number to write
     */
    writeLong(n: number): void {
        this.writeShort(n & 0xffff); //write the lower two bytes...
        this.writeShort((n & 0xffff0000) >>> 16); //write the top two bytes
    }

    /**
     * Writes a compressed long to this stream
     * @param {number} n The long to compress and write to to this stream
     */
    writeCompressedLong(n: number): void {
        this.writeCompressed(n, 4);
    }

    /**
     * Currently not implemented
     * @todo Implement
     */
    readSignedLong() {
        throw 'Not Implemented';
    }

    /**
     * Writes a signed long to the stream
     * @param {number} n The signed long to write
     */
    writeSignedLong(n: number): void {
        this.writeShort(n & 0xffff); //write the lower two bytes...
        this.writeSignedShort((n & 0xffff0000) >>> 16); //write the top two bytes
    }

    /**
     * Reads an unsigned long long from the stream
     * @returns {BigInt}
     */
    readLongLong(): bigint {
        return BigInt(
            this.readByte() +
                (this.readByte() << 8) +
                (this.readByte() << 16) +
                this.readByte() * 16777216 +
                this.readByte() * 4294967296 +
                this.readByte() * 1099511627776 +
                this.readByte() * 281474976710656 +
                this.readByte() * 72057594037927936,
        );
    }

    /**
     * Writes an unsigned long long to the stream
     * @param {BigInt} n The top of the number
     */
    writeLongLong(n: bigint): void {
        this.writeLong(Number(n & 0xffffffffn));
        this.writeLong(Number((n & 0xffffffff00000000n) >> 32n));
    }

    /**
     * Reads a float from the stream
     * @returns {number}
     */
    readFloat(): number {
        let mantissa = this.readShort();
        let exponent = this.readBit();
        mantissa += this.readBits(7) << 16;
        let sign = this.readBit();
        if (sign) {
            sign = -1;
        } else {
            sign = 1;
        }
        exponent += this.readBits(7) << 1;
        exponent -= 127;

        return Math.pow(2, exponent) * (mantissa * 1.1920928955078125e-7 + 1) * sign;
    }

    /**
     * Writes a float to the stream
     * @param {number} n
     */
    writeFloat(n: number): void {
        let sign = n < 0;
        let exponent = Math.floor(Math.log2(Math.abs(n)));
        let mantissa = Math.ceil((Math.abs(n) / Math.pow(2, exponent) - 1) / 1.1920928955078125e-7); // 1.1920928955078125e-7 = 2^-23
        exponent += 127;

        this.writeByte(mantissa & 0xff);
        this.writeByte((mantissa & 0xff00) >> 8);
        this.writeBit((exponent & 0x01) === 1);
        this.writeBits((mantissa & 0x7f0000) >> 16, 7);
        this.writeBit(sign);
        this.writeBits((exponent & 0xfe) >> 1, 7);
    }

    /**
     * Writes a BitStream to this BitStream
     * @param {BitStream} bs
     */
    writeBitStream(bs: BitStream): void {
        for (let i = 0; i < bs.bits(); i++) {
            this.writeBit(bs.readBit() === 1);
        }
    }

    /**
     * Reads compressed data from the stream
     * @param {number} size The size of the data to read
     * @returns {BitStream}
     */
    readCompressed(size: number): BitStream {
        let currentByte = size - 1;
        let ret = new BitStream();

        while (currentByte > 0) {
            let b = this.readBit();

            if (b) {
                currentByte--;
            } else {
                for (let i = 0; i < currentByte + 1; i++) {
                    ret.writeByte(this.readByte());
                }
                for (let i = 0; i < size - currentByte - 1; i++) {
                    ret.writeByte(0);
                }
                return ret;
            }
        }

        let b = this.readBit();

        if (b) {
            ret.writeByte(this.readBits(4));
        } else {
            ret.writeByte(this.readByte());
        }
        for (let i = 0; i < size - 1; i++) {
            ret.writeByte(0);
        }
        return ret;
    }

    /**
     *
     * @param {number} data The number to write
     * @param {number} size The number of bytes to write it in
     */
    writeCompressed(data: number, size: number): void {
        let currentByte = size - 1;
        let mask = [
            0xff, 0xff00, 0xff0000, 0xff000000, 0xff00000000, 0xff0000000000, 0xff000000000000,
            0xff00000000000000,
        ];

        while (currentByte > 0) {
            let zero = (data & mask[currentByte]) === 0;
            this.writeBit(zero);
            if (!zero) {
                // Now we write all the bits from beginning to the current byte
                for (let i = 0; i < currentByte + 1; i++) {
                    this.writeByte((data & mask[i]) >> (i * 8));
                }
                return;
            }
            currentByte--;
        }

        let zero = (data & 0xf0) === 0;
        this.writeBit(zero);
        if (zero) {
            this.writeBits(data & 0x0f, 4);
        } else {
            this.writeByte(data & 0xff);
        }
    }

    /**
     * Reads a string from the stream
     * @param {number} [size]
     * @returns {string}
     */
    readString(size: number = 33): string {
        let text = '';

        for (let i = 0; i < size; i++) {
            text += String.fromCharCode(this.readByte());
        }
        return text;
    }

    /**
     *
     * @param {string} string
     * @param {number} [size]
     */
    writeString(string: string, size: number = 33): void {
        while (string.length < size) {
            string += '\0';
        }

        for (let i = 0; i < string.length; i++) {
            this.writeByte(string.charCodeAt(i));
        }
    }

    /**
     *
     * @param {number} [size]
     * @returns {string}
     */
    readWString(size: number = 33): string {
        let write = true;
        let text = '';
        let temp = this.readShort();
        write = temp !== 0;
        for (let i = 0; i < size - 1; i++) {
            if (write) {
                text += String.fromCharCode(temp);
                temp = this.readShort();
                write = temp !== 0;
            } else {
                temp = this.readShort();
            }
        }
        return text;
    }

    /**
     *
     * @param {string} string
     * @param {number} [size]
     */
    writeWString(string: string, size: number = 33): void {
        while (string.length < size) {
            string += '\0';
        }

        for (let i = 0; i < size; i++) {
            this.writeByte(string.charCodeAt(i));
            this.writeByte(0);
        }
    }

    /**
     * Aligns the current reading bit to the next available byte
     */
    alignRead(): void {
        if (this.#readBitPosition !== 7) {
            this.#readBitPosition = 7;
            this.#readBytePosition++;
        }
    }

    /**
     * Aligns the current writing bit to the next available byte
     */
    alignWrite(): void {
        if (this.#writeBitPosition !== 7) {
            this.#writeBitPosition = 7;
            this.#writeBytePosition++;
        }
    }

    /**
     * Adds a BitStream to the end of this BitStream
     * @param {BitStream} bs The BitStream to add on
     */
    concat(bs: BitStream): void {
        this.#data = Buffer.concat([this.#data, bs.data]);
        this.#byteCount = this.#data.length;
    }

    /**
     * Gets the binary string representation of this BitStream
     * @returns {string}
     */
    toBinaryString(): string {
        let output = '';
        let temp = [
            '0000',
            '0001',
            '0010',
            '0011',
            '0100',
            '0101',
            '0110',
            '0111',
            '1000',
            '1001',
            '1010',
            '1011',
            '1100',
            '1101',
            '1110',
            '1111',
        ];

        for (let i = 0; i < this.#byteCount; i++) {
            let byte = this.#data.readUInt8(i);
            let partone = (byte & 0xf0) >> 4;
            let parttwo = byte & 0x0f;

            if (i === this.#readBytePosition) {
                for (let j = 7; j >= 0; j--) {
                    let bit = (byte & this.#mask[j]) >> j;
                    if (j === this.#readBitPosition) {
                        output += ' -> ';
                    }
                    output += bit;
                }
                output += ' ';
            } else if (i === this.#writeBytePosition) {
                for (let j = 7; j >= 0; j--) {
                    let bit = (byte & this.#mask[j]) >> j;
                    if (j === this.#writeBitPosition) {
                        output += ' <- ';
                    }
                    output += bit;
                }
                output += ' ';
            } else {
                output += temp[partone] + temp[parttwo] + ' ';
            }
        }
        return output;
    }

    /**
     * Returns the Hex representation of this BitStream
     * @return {string}
     */
    toHexString(): string {
        let output = '';
        let temp = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];

        for (let i = 0; i < this.#byteCount; i++) {
            let byte = this.#data.readUInt8(i);
            let partone = (byte & 0xf0) >> 4;
            let parttwo = byte & 0x0f;

            output += temp[partone] + temp[parttwo] + ' ';
        }
        return output;
    }

    /**
     * Writes this BitStream to a file
     * @param {String} filename
     */
    toFile(filename: string) {
        return writeFile(filename, this.#data);
    }
}

/**
 * Turns Unicode into a number
 * @param {string} string
 * @returns {number}
 */
function ord(string: string): number {
    //  discuss at: http://locutus.io/php/ord/
    // original by: Kevin van Zonneveld (http://kvz.io)
    // bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
    // improved by: Brett Zamir (http://brett-zamir.me)
    //    input by: incidence
    //   example 1: ord('K')
    //   returns 1: 75
    //   example 2: ord('\uD800\uDC00'); // surrogate pair to create a single Unicode character
    //   returns 2: 65536
    let str = string + '';
    let code = str.charCodeAt(0);
    if (code >= 0xd800 && code <= 0xdbff) {
        // High surrogate (could change last hex to 0xDB7F to treat
        // high private surrogates as single characters)
        let hi = code;
        if (str.length === 1) {
            // This is just a high surrogate with no following low surrogate,
            // so we return its value;
            return code;
            // we could also throw an error as it is not a complete character,
            // but someone may want to know
        }
        let low = str.charCodeAt(1);
        return (hi - 0xd800) * 0x400 + (low - 0xdc00) + 0x10000;
    }
    if (code >= 0xdc00 && code <= 0xdfff) {
        // Low surrogate
        // This is just a low surrogate with no preceding high surrogate,
        // so we return its value;
        return code;
        // we could also throw an error as it is not a complete character,
        // but someone may want to know
    }
    return code;
}
