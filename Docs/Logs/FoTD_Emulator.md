# FoTD Emulator Log

- [ ] [12/28/25-11:02PM] M1 Transport capture + decision
  - Context: Docs\Specs\FoTD_Emulator.md (Solution Sketch #1)
  - Acceptance: First login packets captured and transport path confirmed (RakNet vs CUDPDriver).
  - Validation: PCAP + summary attached; decision recorded (magic 0x9919D9C7 vs RakNet IDs).
  - Dependencies: FoTD client runnable; SharkMCP (Wireshark/tshark MCP) or emulator logging.
  - Status: Not started.

- [ ] [12/28/25-11:02PM] M2 Protocol framing alignment (BitStream + constants)
  - Context: Docs\Specs\FoTD_Emulator.md (Inputs / Facts, Solution Sketch #2)
  - Acceptance: Bit order is MSB-first, compressed ints match FoTD, default port aligns with FoTD capture.
  - Validation: Unit decode of captured packet; emulator logs show correct parsing with no bit overruns.
  - Tasks: Update BitStream order + endian; implement FoTD compressed ints; fix constants and header parsing.
  - Dependencies: M1 decision; AddressMap_FoTD.md bitstream section.
  - Status: Not started.

- [ ] [12/28/25-11:02PM] M3 Master login path (LOGIN_REQUEST -> 0x6D)
  - Context: Docs\Specs\FoTD_Emulator.md (Solution Sketch #3)
  - Acceptance: LOGIN_REQUEST parsed from capture; LOGIN_REQUEST_RETURN sent and ACKed.
  - Validation: Emulator logs show login success; client proceeds to world connect; ACK observed.
  - Tasks: Identify LOGIN_REQUEST layout; implement parser; build 0x6D response with world IP/port.
  - Dependencies: M1, M2; capture data for LOGIN_REQUEST layout.
  - Status: Not started.

- [ ] [12/28/25-11:02PM] M4 World accept + ID/MessageGroup scaffold
  - Context: Docs\Specs\FoTD_Emulator.md (Solution Sketch #4)
  - Acceptance: World connection established; client processes ID packet (msg 12) and MessageGroup (msg 14) without disconnect.
  - Validation: Client stays connected 60s; emulator logs show successful dispatch.
  - Tasks: Accept world password; send ID packet; emit minimal MessageGroup; verify handler dispatch.
  - Dependencies: M2, M3; AddressMap_FoTD.md message handlers.
  - Status: Not started.

- [ ] [12/28/25-11:02PM] M5 Minimum world state for character visible
  - Context: Docs\Specs\FoTD_Emulator.md (Solution Sketch #5)
  - Acceptance: Client renders character in-world (even with minimal state).
  - Validation: Manual client observation + emulator logs; capture of required packet IDs recorded.
  - Tasks: Identify packet IDs required for render; implement stubs; iterate via capture + IDA.
  - Dependencies: M4; incremental packet decode from CShell handlers.
  - Status: In progress. [12/29/25-3:21AM] Decoded Packet_ID_AF/B0/B1/B2 bit layouts + helpers in CShell; updated AddressMap_FoTD.md; applied IDA renames. [12/29/25-3:32AM] Decoded Packet_ID_MARKET + Packet_ID_PLAYERFILE bit layouts + helpers; updated AddressMap_FoTD.md; applied IDA renames.
