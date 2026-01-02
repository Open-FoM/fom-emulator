# Security and Encryption

## Overview
RakPeerInterface exposes secure-connection setup and an exception list. Crypto primitives live in the Security headers for key generation and block encryption.

## RakPeerInterface Security Hooks
- `InitializeSecurity(const char* pubKeyE, const char* pubKeyN, const char* privKeyP, const char* privKeyQ)`
- `DisableSecurity()`
- `AddToSecurityExceptionList(const char* ip)`
- `RemoveFromSecurityExceptionList(const char* ip)`
- `IsInSecurityExceptionList(const char* ip)`

Header notes indicate a combination of SHA1, AES128, SYN Cookies, and RSA is used for secure connections.

## DataBlockEncryptor
- `SetKey` / `UnsetKey` for AES key management.
- `Encrypt` and `Decrypt` for block encryption and checksum validation.

## RSA and Hashing
- `RSACrypt` exposes key generation and encryption helpers.
- `SHA1` provides hashing utilities used during security handshakes.

## Reference
- RakPeerInterface
- DataBlockEncryptor
- RSACrypt
- Rijndael
- SHA1


