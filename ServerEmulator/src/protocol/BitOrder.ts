export type BitOrder = 'lsb' | 'msb';

export type BitOrderTagged = {
    bitOrder?: BitOrder;
};

export type BitOrderLogger = (message: string) => void;

export function assertBitOrder(
    actual: BitOrder | undefined,
    expected: BitOrder,
    context: string,
    strict: boolean,
    log?: BitOrderLogger,
): void {
    if (!actual) return;
    if (actual === expected) return;
    const msg = `[BitOrder] ${context} expected=${expected} actual=${actual}`;
    if (log) {
        log(msg);
    } else {
        // eslint-disable-next-line no-console
        console.warn(msg);
    }
    if (strict) {
        throw new Error(msg);
    }
}
