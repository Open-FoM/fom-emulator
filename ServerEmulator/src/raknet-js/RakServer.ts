import RakMessages from './RakMessages';
import BitStream from './structures/BitStream';
import { ReliabilityLayer } from './ReliabilityLayer';
import * as data from 'dgram';
import * as events from 'events';

export default class RakServer extends events.EventEmitter {
    #ip: string;
    #port: number;
    readonly #connections: Record<string, ReliabilityLayer>;
    #password: string;
    readonly #server: data.Socket;
    #startTime: number;

    /**
     *
     * @param {String} ip
     * @param {number} port
     * @param {String} password
     */
    constructor(ip: string, port: number, password: string) {
        super();

        this.#ip = ip;

        this.#port = port;

        this.#connections = {};

        this.#password = password;

        this.#server = data.createSocket('udp4');

        this.#startTime = Date.now();

        this.#server.on('error', (err) => {
            this.onError(err);
        });

        this.#server.on('message', (msg, senderInfo) => {
            const packet = new BitStream(msg);
            try {
                this.onMessage(packet, senderInfo);
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                const stack = err instanceof Error ? err.stack : undefined;
                console.warn(`Something went wrong while handling packet! ${message}`);
                if (stack) {
                    console.warn(stack);
                }
            }
        });

        this.#server.on('listening', () => {
            this.onListening();
        });

        this.#server.bind(port, ip);
    }

    /**
     * This is called when we receive a new message from a client.
     * @param {BitStream} data
     * @param senderInfo
     */
    onMessage(data: BitStream, senderInfo: data.RemoteInfo): void {
        let messageId = data.readByte();

        if (messageId === RakMessages.ID_OPEN_CONNECTION_REQUEST) {
            console.log(
                `[RakServer] ID_OPEN_CONNECTION_REQUEST from ${senderInfo.address}:${senderInfo.port} (${data.length()} bytes)`,
            );
            this.#connections[senderInfo.address] = new ReliabilityLayer(this.server, senderInfo);
            let ret = Buffer.alloc(1);
            ret.writeInt8(RakMessages.ID_OPEN_CONNECTION_REPLY, 0);
            this.server.send(ret, senderInfo.port, senderInfo.address);
            return;
        }

        if (this.#connections[senderInfo.address] !== undefined) {
            console.log(
                `[RakServer] Reliable packet from ${senderInfo.address}:${senderInfo.port}, first byte: 0x${messageId.toString(16)}, length: ${data.length()}`,
            );
            console.log(`[RakServer] Raw hex: ${data.data.toString('hex').substring(0, 80)}...`);

            data.resetRead();
            try {
                const packets = this.#connections[senderInfo.address].handle_data(data);
                let finished = false;
                let packetCount = 0;

                while (!finished) {
                    let next = packets.next();
                    if (next.value !== undefined) {
                        let packet = next.value;
                        packetCount++;
                        console.log(
                            `[RakServer] Parsed inner packet #${packetCount}, length: ${packet.length()}, first byte: 0x${packet.readByte().toString(16)}`,
                        );
                        packet.resetRead();
                        this.onPacket(packet, senderInfo);
                    }

                    if (next.done) {
                        finished = true;
                    }
                }
                console.log(`[RakServer] Parsed ${packetCount} inner packet(s)`);
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                const stack = err instanceof Error ? err.stack : undefined;
                console.error(`[RakServer] Error parsing reliable packet: ${message}`);
                if (stack) {
                    console.error(stack);
                }
            }
        } else {
            console.warn(
                `Got message from unconnected user! First byte: 0x${messageId.toString(16)}`,
            );
        }
    }

    /**
     * This is called by onMessage after it breaks down the packets into what gets done when
     * @param {BitStream} packet
     * @param {Object} senderInfo
     */
    onPacket(packet: BitStream, senderInfo: data.RemoteInfo): void {
        let type = packet.readByte();
        if (this.listenerCount(String(type)) > 0) {
            this.emit(String(type), packet, senderInfo);
        } else {
            console.log(`No listeners found for ID: ${RakMessages.key(type)} (${type})`);
        }
    }

    /**
     * If the server throws an error, this gets called
     * @param {Error} error
     */
    onError(error: Error): void {
        console.log(`server error:\n${error.stack}`);
        this.#server.close();
    }

    /**
     * When the server first starts up
     */
    onListening(): void {
        const address = this.#server.address();
        console.log(`server listening ${address.address}:${address.port}`);
    }

    /**
     *
     * @param {string} ip
     * @returns {ReliabilityLayer}
     */
    getClient(ip: string): ReliabilityLayer | undefined {
        return this.#connections[ip];
    }

    /**
     * @returns {data.Socket}
     */
    get server(): data.Socket {
        return this.#server;
    }

    get port(): number {
        return this.#port;
    }

    get ip(): string {
        return this.#ip;
    }

    get password(): string {
        return this.#password;
    }

    get startTime(): number {
        return this.#startTime;
    }

    get connections(): Record<string, ReliabilityLayer> {
        return this.#connections;
    }
}
