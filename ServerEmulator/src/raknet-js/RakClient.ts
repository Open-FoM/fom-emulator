import {ReliabilityLayer} from "./ReliabilityLayer";
import * as data from 'dgram';
import * as events from "events";
import BitStream from "./structures/BitStream";
import RakMessages from "./RakMessages";

export default class RakClient extends events.EventEmitter {
    #ip : string;
    #port : number;
    #connection : ReliabilityLayer;
    #password : string;
    readonly #client : data.Socket;
    #startTime : number;

    constructor(ip : string, port : number, password : string) {
        super();

        this.#ip = ip;

        this.#port = port;

        this.#password = password;

        this.#client = data.createSocket('udp4');

        this.#startTime = Date.now();

        this.#client.on('error', (err) => {
            this.onError(err);
        });

        this.#client.on('message', (msg, senderInfo) => {
            let data = new BitStream(msg);
            try {
                this.onMessage(data, senderInfo)
            }
            catch(e) {
                console.warn(`Something went wrong while handling packet! ${e.message}`);
                console.warn(e.stack);
            }
        });

        this.#connection = new ReliabilityLayer(this.#client, {port: this.#port, address: this.#ip});
    }

    onError(error) {
        console.log(`client error:\n${error.stack}`);
    }

    onMessage(data, senderInfo) {
        if(data.length() !== 1) {
            const packets = this.#connection.handle_data(data);
            let finished = false;

            while(!finished) {
                let next = packets.next();
                if(next.value !== undefined) {
                    let packet = next.value;
                    this.onPacket(packet, senderInfo);
                }

                if(next.done) {
                    finished = true;
                }
            }
        }
    }

    onPacket(packet : BitStream, senderInfo : Object) : void {
        let type = packet.readByte();
        if(this.listenerCount(String(type)) > 0) {
            this.emit(String(type), packet, senderInfo);
        } else {
            console.log(`No listeners found for ID: ${RakMessages.key(type)} (${type})`);
        }
    }

    getServer() {
        return this.#connection;
    }

    get client() {
        return this.#client;
    }

    get port() : number {
        return this.#port;
    }

    get ip() : string {
        return this.#ip;
    }

    get password() : string {
        return this.#password;
    }

    get startTime() : number {
        return this.#startTime;
    }
}