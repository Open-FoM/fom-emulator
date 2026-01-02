"""
Quick RakNet DataBlockEncryptor decryptor for Client captures.

Algorithm per RakNet 3.5 DataBlockEncryptor (reverse-chained AES-128 ECB + pad/checksum).
Inputs:
  - key: 16-byte session key (peer+0x1408 from HandleSecureConnResponse_SetSessionKey)
  - cipher: encrypted payload (length must be multiple of 16)

Output:
  - plaintext payload after stripping checksum/pad/random header
"""
from Crypto.Cipher import AES


def raknet_decrypt(cipher: bytes, key: bytes) -> bytes:
    assert len(key) == 16, "key must be 16 bytes"
    assert len(cipher) % 16 == 0, "ciphertext length must be multiple of 16"

    aes = AES.new(key, AES.MODE_ECB)
    blocks = [cipher[i : i + 16] for i in range(0, len(cipher), 16)]
    plain = [b""] * len(blocks)

    # decrypt blocks 1..n-1, xor with next ciphertext (or C0 for last)
    for i in range(1, len(blocks)):
        dec = aes.decrypt(blocks[i])
        xor_with = blocks[i + 1] if i + 1 < len(blocks) else blocks[0]
        plain[i] = bytes(a ^ b for a, b in zip(dec, xor_with))

    # decrypt block 0 last
    plain[0] = aes.decrypt(blocks[0])

    data = b"".join(plain)
    checksum = int.from_bytes(data[0:4], "little")
    padlen = data[5] & 0x0F
    payload = data[6 + padlen :]

    # Verify RakNet additive checksum over bytes [4:]
    calc = (sum(data[4:]) & 0xFFFFFFFF)
    if calc != checksum:
        raise ValueError(f"checksum mismatch: expected 0x{checksum:08x} got 0x{calc:08x}")
    return payload


if __name__ == "__main__":
    import argparse, sys

    ap = argparse.ArgumentParser(description="RakNet DataBlockEncryptor decryptor")
    ap.add_argument("--key", required=True, help="16-byte session key hex")
    ap.add_argument("--in", dest="inf", required=True, help="ciphertext hex or @file (binary)")
    args = ap.parse_args()

    key = bytes.fromhex(args.key)
    if args.inf.startswith("@"):
        with open(args.inf[1:], "rb") as f:
            cipher = f.read()
    else:
        cipher = bytes.fromhex(args.inf)

    plain = raknet_decrypt(cipher, key)
    sys.stdout.buffer.write(plain)
