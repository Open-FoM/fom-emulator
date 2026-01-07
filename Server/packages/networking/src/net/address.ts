export interface SystemAddressLike {
    binaryAddress: number;
    port: number;
}

// Convert the packed RakNet binary address into a dotted IPv4 string.
export function addressToIp(address: SystemAddressLike): string {
    const parts = [
        (address.binaryAddress >> 0) & 0xff,
        (address.binaryAddress >> 8) & 0xff,
        (address.binaryAddress >> 16) & 0xff,
        (address.binaryAddress >> 24) & 0xff,
    ];
    return parts.join('.');
}

// Standardize printable address formatting for logs and keys.
export function addressToString(address: SystemAddressLike): string {
    return `${addressToIp(address)}:${address.port}`;
}

// Connection map key format. Keep aligned with addressToString for log clarity.
export function addressToKey(address: SystemAddressLike): string {
    return addressToString(address);
}
