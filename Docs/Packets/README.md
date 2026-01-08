# Packet Index (Login / World)

Standard format: every packet doc should include **Summary**, **On-wire encoding**, **Field Table**, **Read/Write (decomp)**, **IDA Anchors**, **Validation**, and **Notes**.

| ID | Name | Direction | Module | File | Notes |
|---|---|---|---|---|---|
| 0x04 | ID_CONNECTION_REQUEST | client -> server | RakNet (fom_client) | ID_CONNECTION_REQUEST.md | RakNet 3.611 offline handshake |
| 0x0E | ID_CONNECTION_REQUEST_ACCEPTED | server -> client | RakNet (fom_client) | ID_CONNECTION_REQUEST_ACCEPTED.md | Parse path spotted in IDA disasm |
| 0x10 | ID_NEW_INCOMING_CONNECTION | server -> client | RakNet (fom_client) | ID_NEW_INCOMING_CONNECTION.md | RakNet 3.611 online handshake |
| 0x6C | ID_LOGIN_REQUEST | client -> master | fom_client | ID_LOGIN_REQUEST.md | Huffman + LT BitStream |
| 0x6D | ID_LOGIN_REQUEST_RETURN | master -> client | fom_client + CShell | ID_LOGIN_REQUEST_RETURN.md | Status encoding mismatch noted |
| 0x6E | ID_LOGIN | client -> master | fom_client | ID_LOGIN.md | Huffman + bounded strings |
| 0x6F | ID_LOGIN_RETURN | master -> client | CShell | ID_LOGIN_RETURN.md | Large payload (apartment, items) |
| 0x70 | ID_LOGIN_TOKEN_CHECK | bidirectional | CShell | ID_LOGIN_TOKEN_CHECK.md | From-server bit flips layout |
| 0x72 | ID_WORLD_LOGIN | client -> world | CShell | ID_WORLD_LOGIN.md | Uses worldConst 0x13BC52 |
| 0x73 | ID_WORLD_LOGIN_RETURN | server -> client | CShell | ID_WORLD_LOGIN_RETURN.md | u32c worldIp/u16c worldPort |
| 0x78 (msgId) | REGISTER_CLIENT | client -> world | Object.lto | ID_REGISTER_CLIENT.md | Precursor to 0x79 WORLD_LOGIN_DATA |
| 0x7B | ID_WORLD_SELECT | server -> client | CShell | ID_WORLD_SELECT.md | SubId 4/7 set worldId/worldInst |
| 0x79 (msgId) | WORLD_LOGIN_DATA | world -> client | Object.lto | ID_WORLD_LOGIN_DATA.md | RakNet/BitStream payload dispatched via game-message path (not CShell packet ID) |
