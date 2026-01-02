// TODO: At some point in my poor future, I will have to implement ack packets

import { RangeList } from './structures/RangeList';
import BitStream from './structures/BitStream';
import * as dgram from 'dgram';

export const Reliability = {
    UNRELIABLE: 0,
    UNRELIABLE_SEQUENCED: 1,
    RELIABLE: 2,
    RELIABLE_ORDERED: 3,
    RELIABLE_SEQUENCED: 4,
};

const MTU_SIZE = 1228;
const UDP_HEADER_SIZE = 28;

type SplitPacketInfo = {
    id: number;
    index: number;
    count: number;
};

type SendQueueItem = {
    packet: BitStream;
    reliability: number;
    orderingIndex?: number;
    splitPacketInfo?: SplitPacketInfo;
    callback: (packet: BitStream) => void;
};

/**
 * The ReliabilityLayer class used for sending and receiving data to a single client.
 */
export class ReliabilityLayer {
    #server: dgram.Socket;
    #connection: dgram.RemoteInfo;

    #srrt?: number;
    #rttVar?: number;
    #rto: number;
    #last: number;
    #remoteSystemTime: number;
    #resends: SendQueueItem[];
    #acks: RangeList;
    #queue: Array<Array<BitStream | undefined>>;
    #sequencedReadIndex: number;
    #sequencedWriteIndex: number;
    #orderedReadIndex: number;
    #orderedWriteIndex: number;
    #outOfOrderPackets: Array<BitStream | undefined>;
    #sends: SendQueueItem[];
    #congestionWindow: number;
    #packetsSent: number;
    #sendMessageNumberIndex: number;
    #interval: NodeJS.Timeout;
    #splitPacketId: number;

    /**
     * Constructs a new instance of ReliabilityLayer and set default values for the object
     * @param server
     * @param address
     */
    constructor(server: dgram.Socket, address: dgram.RemoteInfo) {
        this.#server = server;
        this.#connection = address;

        this.#srrt = undefined;
        this.#rttVar = undefined;
        this.#rto = 1;
        this.#last = Date.now();
        this.#remoteSystemTime = 0;
        this.#resends = []; //i assume to keep track of what messages needed to be resent?
        this.#acks = new RangeList();
        this.#queue = [];
        this.#sequencedReadIndex = 0;
        this.#sequencedWriteIndex = 0;
        this.#orderedReadIndex = 0;
        this.#orderedWriteIndex = 0;
        this.#outOfOrderPackets = [];
        this.#sends = [];
        this.#congestionWindow = 0;
        this.#packetsSent = 0;
        this.#sendMessageNumberIndex = 0;
        this.#splitPacketId = 0;
        let layer = this;
        this.#interval = setInterval(function () {
            layer.sendLoop();
        }, 30);
    }

    /**
     * Handles a new packet when we receive one
     * @param {BitStream} data The packet
     */
    *handle_data(data: BitStream): Generator<BitStream> {
        if (this.handle_data_header(data)) return;
        yield* this.parse_packets(data);
    }

    /**
     * Handles the acks packets and other header parts of the packet
     * @param {BitStream} data The packet
     * @returns {Boolean}
     */
    handle_data_header(data: BitStream): boolean {
        console.log(`[ReliabilityLayer] handle_data_header: raw = ${data.data.toString('hex')}`);

        const hasAcks = data.readBit();
        console.log(`[ReliabilityLayer] hasAcks = ${hasAcks}`);

        if (hasAcks) {
            let yeOldenTime = data.readLong();
            console.log(`[ReliabilityLayer] ACK time = ${yeOldenTime}`);
            let rtt = (Date.now() - this.#last) / 1000 - yeOldenTime / 1000;
            this.#last = Date.now();
            if (this.#srrt === undefined) {
                this.#srrt = rtt;
                this.#rttVar = rtt / 2;
            } else {
                let alpha = 0.125;
                let beta = 0.25;
                const srrt = this.#srrt ?? rtt;
                const rttVar = this.#rttVar ?? rtt / 2;
                this.#rttVar = (1 - beta) * rttVar + beta * Math.abs(srrt - rtt);
                this.#srrt = (1 - alpha) * srrt + alpha * rtt;
            }
            const srrt = this.#srrt ?? 0;
            const rttVar = this.#rttVar ?? 0;
            this.#rto = Math.max(1, srrt + 4 * rttVar);

            let acks = new RangeList();
            acks.deserialize(data);
            console.log(`[ReliabilityLayer] ACKs = ${acks.toArray()}`);
        }

        if (data.allRead()) {
            console.log(`[ReliabilityLayer] all data read after header`);
            return true;
        }

        const hasRemoteTime = data.readBit();
        console.log(`[ReliabilityLayer] hasRemoteSystemTime = ${hasRemoteTime}`);

        if (hasRemoteTime) {
            this.#remoteSystemTime = data.readLong();
            console.log(`[ReliabilityLayer] remoteSystemTime = ${this.#remoteSystemTime}`);
        }
        return false;
    }

    /**
     * Parses the rest of the packet out so we can handle it later
     * TODO: Find out why I keep on reaching the end of the stream
     * @param {BitStream} data The packet
     * @yields {GBitStream}
     */
    *parse_packets(data: BitStream): Generator<BitStream> {
        console.log(
            `[ReliabilityLayer] parse_packets: remaining data = ${data.data.toString('hex')}`,
        );

        while (!data.allRead()) {
            let messageNumber = data.readLong();
            console.log(
                `[ReliabilityLayer] messageNumber = ${messageNumber} (0x${messageNumber.toString(16)})`,
            );

            let reliability = data.readBits(3);
            console.log(`[ReliabilityLayer] reliability = ${reliability}`);

            let orderingChannel;
            let orderingIndex;
            if (
                reliability === Reliability.UNRELIABLE_SEQUENCED ||
                reliability === Reliability.RELIABLE_ORDERED
            ) {
                orderingChannel = data.readBits(5);
                orderingIndex = data.readLong();
                console.log(
                    `[ReliabilityLayer] orderingChannel = ${orderingChannel}, orderingIndex = ${orderingIndex}`,
                );
            }

            let isSplit = data.readBit();
            console.log(`[ReliabilityLayer] isSplit = ${isSplit}`);

            let splitPacketId;
            let splitPacketIndex;
            let splitPacketCount;
            if (isSplit) {
                splitPacketId = data.readShort();
                splitPacketIndex = data.readCompressed(4).readLong();
                splitPacketCount = data.readCompressed(4).readLong();
                console.log(
                    `[ReliabilityLayer] split: id=${splitPacketId}, index=${splitPacketIndex}, count=${splitPacketCount}`,
                );

                if (this.#queue[splitPacketId] === undefined) {
                    this.#queue[splitPacketId] = new Array<BitStream | undefined>(splitPacketCount);
                }
            }

            let lengthBits = data.readCompressed(2).readShort();
            console.log(
                `[ReliabilityLayer] data length = ${lengthBits} bits (${Math.ceil(lengthBits / 8)} bytes)`,
            );

            data.alignRead();

            let packet = new BitStream();
            let bitsToRead = lengthBits;
            while (bitsToRead--) {
                packet.writeBit(data.readBit() === 1);
            }
            console.log(`[ReliabilityLayer] extracted packet: ${packet.data.toString('hex')}`);
            console.log(
                `[ReliabilityLayer] first byte of packet: 0x${packet.data.length > 0 ? packet.data[0].toString(16) : 'N/A'}`,
            );

            if (
                reliability === Reliability.RELIABLE ||
                reliability === Reliability.RELIABLE_ORDERED
            ) {
                this.#acks.add(messageNumber);
            }

            if (isSplit) {
                if (splitPacketId !== undefined && splitPacketIndex !== undefined) {
                    this.#queue[splitPacketId][splitPacketIndex] = packet;
                    let ready = true;
                    for (let i = 0; i < this.#queue[splitPacketId].length; i++) {
                        if (this.#queue[splitPacketId][i] === undefined) {
                            ready = false;
                            break;
                        }
                    }
                    if (ready) {
                        //concatenate all the split packets together
                        packet = new BitStream();
                        for (let i = 0; i < this.#queue[splitPacketId].length; i++) {
                            const part = this.#queue[splitPacketId][i];
                            if (part) {
                                packet.concat(part);
                            }
                        }
                    } else {
                        continue;
                    }
                }
            }
            if (reliability === Reliability.UNRELIABLE_SEQUENCED) {
                if (orderingIndex !== undefined) {
                    if (orderingIndex >= this.#sequencedReadIndex) {
                        this.#sequencedReadIndex = orderingIndex + 1;
                    } else {
                        continue;
                    }
                }
            } else if (reliability === Reliability.RELIABLE_ORDERED) {
                if (orderingIndex !== undefined && orderingChannel !== undefined) {
                    if (orderingIndex === this.#orderedReadIndex) {
                        this.#orderedReadIndex++;
                        let ord = orderingIndex + 1;
                        for (let i = ord; i < this.#orderedReadIndex; i++) {}
                    } else if (orderingIndex < this.#orderedReadIndex) {
                        continue;
                    } else {
                        // We can't release this packet because we are waiting for an earlier one?
                        this.#outOfOrderPackets[orderingIndex] = packet;
                    }
                }
            }
            //yield packet;
            yield packet;
        }
    }

    /**
     * Sends a packet to a user
     * @param {BitStream} packet
     * @param {Number} reliability
     */
    send(packet: BitStream, reliability: number): Promise<BitStream | BitStream[]> {
        let orderingIndex;
        if (reliability === Reliability.UNRELIABLE_SEQUENCED) {
            orderingIndex = this.#sequencedWriteIndex;
            this.#sequencedWriteIndex++;
        } else if (reliability === Reliability.RELIABLE_ORDERED) {
            orderingIndex = this.#orderedWriteIndex;
            this.#orderedWriteIndex++;
        } else {
            orderingIndex = undefined;
        }

        if (
            ReliabilityLayer.packetHeaderLength(reliability, false) + packet.length() >=
            MTU_SIZE - UDP_HEADER_SIZE
        ) {
            let dataOffset = 0;
            const chunks: BitStream[] = [];
            while (dataOffset < packet.length()) {
                let dataLength =
                    MTU_SIZE -
                    UDP_HEADER_SIZE -
                    ReliabilityLayer.packetHeaderLength(reliability, true);
                let chunk = Buffer.alloc(dataLength);
                packet.data.copy(chunk, 0, dataOffset, dataOffset + dataLength);
                chunks.push(new BitStream(chunk));
                dataOffset += dataLength;
            }

            let splitPacketId = this.#splitPacketId;
            this.#splitPacketId++;
            const packets: Array<Promise<BitStream>> = [];
            for (let i = 0; i < chunks.length; i++) {
                packets.push(
                    new Promise<BitStream>((res) => {
                        let messageNumber = this.#sendMessageNumberIndex;
                        this.#sendMessageNumberIndex++;
                        this.#sends.push({
                            packet: chunks[i],
                            reliability: reliability,
                            orderingIndex: orderingIndex,
                            splitPacketInfo: {
                                id: splitPacketId,
                                index: i,
                                count: chunks.length,
                            },
                            callback: res,
                        });
                    }),
                );
            }

            return Promise.all(packets);
        } else {
            return new Promise<BitStream>((res) => {
                this.#sends.push({
                    packet: packet,
                    reliability: reliability,
                    orderingIndex: orderingIndex,
                    splitPacketInfo: undefined,
                    callback: res,
                });
            });
        }
    }

    /**
     * This loops until the connection is closed. Think of it as a sending thread
     */
    sendLoop(): void {
        while (this.#sends.length > 0) {
            // TODO: Need to actually do resends for my own packets. This is related
            // if (this.packetsSent > this.congestionWindow) break;
            const packet = this.#sends.pop();
            if (!packet) {
                break;
            }

            this.#packetsSent++;
            let index = this.#sendMessageNumberIndex;
            this.#sendMessageNumberIndex++;

            this.sendMessage(
                packet.packet,
                index,
                packet.reliability,
                packet.orderingIndex,
                packet.splitPacketInfo,
                packet.callback,
            );
        }

        if (!this.#acks.isEmpty()) {
            let send = new BitStream();
            send.writeBit(true);
            send.writeLong(this.#remoteSystemTime);
            send.writeBitStream(this.#acks.serialize());
            this.#acks.empty();
            this.#server.send(send.data, this.#connection.port, this.#connection.address);
        }
    }

    /**
     * This is to send a message to a client. Used internally
     * @param {BitStream} data
     * @param {Number} messageNumber
     * @param {Number} reliability
     * @param {Number} index
     * @param {Object} splitPacketInfo
     * @param {Function} callback
     */
    sendMessage(
        data: BitStream,
        messageNumber: number,
        reliability: number,
        index: number | undefined,
        splitPacketInfo: SplitPacketInfo | undefined,
        callback: (packet: BitStream) => void,
    ): void {
        let send = new BitStream();
        send.writeBit(!this.#acks.isEmpty() && false);
        if (!this.#acks.isEmpty() && false) {
            send.writeLong(this.#remoteSystemTime);
            send.writeBitStream(this.#acks.serialize());
            this.#acks.empty();
        }

        // assert(ReliabilityLayer.packetHeaderLength(reliability, splitPacketInfo !== undefined) + data.length() <= MTU_SIZE - UDP_HEADER_SIZE, 'Packet sent was too large!');

        // TODO: Actually keep track of system time
        let hasRemoteSystemTime = true;
        send.writeBit(hasRemoteSystemTime);
        send.writeLong(this.#remoteSystemTime);

        // Write the message "index"
        send.writeLong(messageNumber);

        // Write the reliability here
        send.writeBits(reliability, 3);

        // If this packet needs the index because of its reliability
        if (
            reliability === Reliability.UNRELIABLE_SEQUENCED ||
            reliability === Reliability.RELIABLE_ORDERED
        ) {
            send.writeBits(0, 5);
            send.writeLong(index ?? 0);
        }

        send.writeBit(splitPacketInfo !== undefined);

        if (splitPacketInfo !== undefined) {
            send.writeShort(splitPacketInfo.id);
            send.writeCompressedLong(splitPacketInfo.index);
            send.writeCompressedLong(splitPacketInfo.count);
        }
        send.writeCompressedShort(data.length() * 8);

        send.alignWrite();

        for (let i = 0; i < data.length(); i++) {
            send.writeByte(data.readByte());
        }

        this.#server.send(send.data, this.#connection.port, this.#connection.address, () => {
            callback(send);
        });
        // Sends actual data to client here
    }

    /**
     *
     * @param {Number} reliability
     * @param {Boolean} split
     * @returns {number}
     */
    static packetHeaderLength(reliability: number, split: boolean): number {
        let length = 32;
        length += 3;
        if (
            reliability === Reliability.UNRELIABLE_SEQUENCED ||
            reliability === Reliability.RELIABLE_ORDERED
        ) {
            length += 5;
            length += 32;
        }
        length += 1;

        if (split) {
            length += 16;
            length += 32;
            length += 32;
        }

        length += 16;
        return Math.ceil(length / 8);
    }
}
