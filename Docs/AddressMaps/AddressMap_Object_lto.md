### Object.lto (image base 0x10000000)

#### Critical Globals
| VA | Symbol | Purpose | Notes |
|---|---|---|---|
| 0x101b445c | g_pLTServer | ILTServer interface pointer | NULL on pure client (no local server) |
| 0x101b4514 | dword_101B4514 | SharedMem context pointer | Used by TravelMgr/Vortex system |
| 0x101b44fc | dword_101B44FC | Local player context | Used by vortex state machine |

#### g_pLTServer NULL Crash Functions
These functions dereference g_pLTServer without NULL checks - crash on pure client:
| VA | RVA | Symbol | Crash Risk | Evidence |
|---|---|---|---|---|
| 0x10013c90 | 0x00013c90 | UpdateVortexActiveFx | HIGH - direct deref | decomp confirmed |
| 0x10015240 | 0x00015240 | Actor_ActivateVortexFx | HIGH - calls UpdateVortexActiveFx | decomp confirmed |
| 0x10030420 | 0x00030420 | Play_VortexActive_Periodic | HIGH - direct deref | decomp confirmed |
| 0x10079960 | 0x00079960 | Tick_VortexActiveState | HIGH - cases 8,9,11,13 crash | decomp confirmed |
| 0x10079e10 | 0x00079e10 | TravelMgrSrv_OnMessage | MED - log call uses g_pLTServer | decomp confirmed |

#### Vortex/TravelMgr System
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10041200 | 0x00041200 | GameMaster_HandleMessage | Object message dispatcher (switch 102-159) | decomp/rename | high |
| 0x10079960 | 0x00079960 | Tick_VortexActiveState | Vortex travel state machine (triggered by msg 111) | decomp/rename | high |
| 0x10079e10 | 0x00079e10 | TravelMgrSrv_OnMessage | Handles object msg 111, calls Tick_VortexActiveState | decomp/rename | high |
| 0x1005aa90 | 0x0005aa90 | SharedMem_SetVortexActive | Sets vortex state via SharedMem | decomp/rename | med |
| 0x1005ab30 | 0x0005ab30 | NPC_TickVortexTimer | NPC vortex timer tick | decomp/rename | med |
| 0x10001304 | 0x00001304 | ObjectDLLSetup | Sets g_pLTServer from engine parameter | decomp/rename | high |

#### Function Table
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10001080 | 0x00001080 | ClientObj_OnMessageDispatch_WithSender | Client object handler | decomp/rename | med |
| 0x10001390 | 0x00001390 | ClientObj_OnMessageDispatch | Client object handler | decomp/rename | med |
| 0x10001400 | 0x00001400 | ClientObj_OnMessage_Thunk | Client object handler | decomp/rename | med |
| 0x10001440 | 0x00001440 | ClientObj_OnMessage_SetObjFlagOnMsg1 | Client object handler | decomp/rename | med |
| 0x10001520 | 0x00001520 | ClientObj_OnMessage_SetScaleOrCall1C4 | Client object handler | decomp/rename | med |
| 0x100015F0 | 0x000015F0 | ClientObj_OnMessage_ApplyObjTransformOnMsg1 | Client object handler | decomp/rename | med |
| 0x10001F90 | 0x00001F90 | Prop_Read_AttenuationType | Prop handler | decomp/rename | med |
| 0x10002400 | 0x00002400 | Prop_Read_TypeOrLighting | Prop handler | decomp/rename | med |
| 0x10003400 | 0x00003400 | Brush_Ctor | Brush/prop helper | decomp/rename | low |
| 0x10003440 | 0x00003440 | Obj_OnMessage_UpdateBounds | Renamed during deobf | decomp/rename | low |
| 0x10004D50 | 0x00004D50 | List_InsertAfterHeadMaybe | Struct/container helper | decomp/rename | low |
| 0x10004D90 | 0x00004D90 | List_RemoveNode | Struct/container helper | decomp/rename | low |
| 0x100084B0 | 0x000084B0 | Vec3_Scale | Vector math | decomp/rename | low |
| 0x10008730 | 0x00008730 | Vec3_EqualsEpsilon | Vector math | decomp/rename | low |
| 0x100091B0 | 0x000091B0 | Msg_Read_ObjAndFloat4 | Network/bitstream or packet helper | decomp/rename | med |
| 0x10009290 | 0x00009290 | Msg_Read_String60 | Network/bitstream or packet helper | decomp/rename | med |
| 0x100092B0 | 0x000092B0 | Msg_Write_StructA | Network/bitstream or packet helper | decomp/rename | med |
| 0x100093D0 | 0x000093D0 | Msg_Read_StructA | Network/bitstream or packet helper | decomp/rename | med |
| 0x10009740 | 0x00009740 | Msg_Write_TrailFloats | Network/bitstream or packet helper | decomp/rename | med |
| 0x100097E0 | 0x000097E0 | Msg_Read_TrailFloats | Network/bitstream or packet helper | decomp/rename | med |
| 0x10009870 | 0x00009870 | Msg_Write_BaseCall10 | Network/bitstream or packet helper | decomp/rename | med |
| 0x100098A0 | 0x000098A0 | Msg_Read_ByteFlagsAndFloat | Network/bitstream or packet helper | decomp/rename | med |
| 0x10009BC0 | 0x00009BC0 | Msg_Read_StructB | Network/bitstream or packet helper | decomp/rename | med |
| 0x10009EE0 | 0x00009EE0 | SharedMem_InitMapping | Shared memory helper | decomp/rename | med |
| 0x10009F80 | 0x00009F80 | SharedMem_ShutdownMapping | Shared memory helper | decomp/rename | med |
| 0x1000A0C0 | 0x0000A0C0 | SharedMem_Lock | Shared memory helper | decomp/rename | med |
| 0x1000A0D0 | 0x0000A0D0 | SharedMem_Unlock | Shared memory helper | decomp/rename | med |
| 0x1000A130 | 0x0000A130 | SharedMem_ReadU16ByIdx | Shared memory helper | decomp/rename | med |
| 0x1000A170 | 0x0000A170 | SharedMem_ReadDword_Locked | Shared memory helper | decomp/rename | med |
| 0x1000A650 | 0x0000A650 | SharedMem_IsFlagSet | Shared memory helper | decomp/rename | med |
| 0x1000A690 | 0x0000A690 | SharedMem_ReadFloatByIdx | Shared memory helper | decomp/rename | med |
| 0x1000A720 | 0x0000A720 | SharedMem_ReadU32ByIdx | Shared memory helper | decomp/rename | med |
| 0x1000A760 | 0x0000A760 | SharedMem_GetPtrByIdx | Shared memory helper | decomp/rename | med |
| 0x1000A7F0 | 0x0000A7F0 | SharedMem_ReadBlock | Shared memory helper | decomp/rename | med |
| 0x1000A8D0 | 0x0000A8D0 | SharedMem_ReadStringAtIdx | Shared memory helper | decomp/rename | med |
| 0x1000A9D0 | 0x0000A9D0 | SharedMem_ReadBlock_Locked | Shared memory helper | decomp/rename | med |
| 0x1000AA80 | 0x0000AA80 | SharedMem_ReadVec4ByIdx | Shared memory helper | decomp/rename | med |
| 0x1000AB20 | 0x0000AB20 | SharedMem_WriteU16ByIdx | Shared memory helper | decomp/rename | med |
| 0x1000AB60 | 0x0000AB60 | SharedMem_WriteDword_Locked | Shared memory helper | decomp/rename | med |
| 0x1000B000 | 0x0000B000 | SharedMem_WriteU8_Locked | Shared memory helper | decomp/rename | med |
| 0x1000B0B0 | 0x0000B0B0 | SharedMem_WriteDword_Locked_Global | Shared memory helper | decomp/rename | med |
| 0x1000B0E0 | 0x0000B0E0 | SharedMem_WriteBlock | Shared memory helper | decomp/rename | med |
| 0x1000B230 | 0x0000B230 | SharedMem_WriteBlock_Locked | Shared memory helper | decomp/rename | med |
| 0x1000B280 | 0x0000B280 | SharedMem_WriteVec3ByIdx | Shared memory helper | decomp/rename | med |
| 0x1000B2E0 | 0x0000B2E0 | SharedMem_WriteVec4ByIdx | Shared memory helper | decomp/rename | med |
| 0x1000B6B0 | 0x0000B6B0 | Obj_GetCategoryCode | Renamed during deobf | decomp/rename | low |
| 0x1000C780 | 0x0000C780 | Obj_OnMessage_HandleType | Renamed during deobf | decomp/rename | low |
| 0x1000D290 | 0x0000D290 | Obj_SetAlphaAndHiddenFlag | Renamed during deobf | decomp/rename | low |
| 0x1000D350 | 0x0000D350 | Obj_OnMessage_SetAlpha | Renamed during deobf | decomp/rename | low |
| 0x1000EC90 | 0x0000EC90 | FxSlot_IsActive | FX slot helper | decomp/rename | low |
| 0x1000ECE0 | 0x0000ECE0 | FxSlot_SetByName | FX slot helper | decomp/rename | low |
| 0x1000EE50 | 0x0000EE50 | FxSlot_SetByName_Enable | FX slot helper | decomp/rename | low |
| 0x1000EEC0 | 0x0000EEC0 | FxSlot_SetByParts | FX slot helper | decomp/rename | low |
| 0x10012490 | 0x00012490 | Update_TimeB68 | Update helper | decomp/rename | med |
| 0x10012AF0 | 0x00012AF0 | SharedMem_CheckRange_2BE2 | Shared memory helper | decomp/rename | med |
| 0x10012BE0 | 0x00012BE0 | Update_ClientFX_State1E1F | Update helper | decomp/rename | med |
| 0x10012CD0 | 0x00012CD0 | Update_ClientFX_StateFlags | Update helper | decomp/rename | med |
| 0x10013070 | 0x00013070 | Update_AnimState_37C | Update helper | decomp/rename | med |
| 0x10013E30 | 0x00013E30 | Vec3_LengthSq | Vector math | decomp/rename | low |
| 0x10014180 | 0x00014180 | BitStream_WriteBit | Network/bitstream or packet helper | decomp/rename | med |
| 0x10014680 | 0x00014680 | Obj_SetFlags2_WithHighBit | Renamed during deobf | decomp/rename | low |
| 0x100147C0 | 0x000147C0 | BitStream_Read_u32 | Network/bitstream or packet helper | decomp/rename | med |
| 0x10014850 | 0x00014850 | Vec3_Length | Vector math | decomp/rename | low |
| 0x10014890 | 0x00014890 | Vec3_AddInPlace | Vector math | decomp/rename | low |
| 0x100149E0 | 0x000149E0 | RBTree_SpliceNode | std::rb_tree helper | decomp/rename | low |
| 0x10014AD0 | 0x00014AD0 | RBTree_FixupRoot | std::rb_tree helper | decomp/rename | low |
| 0x10014B30 | 0x00014B30 | Vec3_Normalize | Vector math | decomp/rename | low |
| 0x10014BD0 | 0x00014BD0 | BitStream_ReadU64 | Network/bitstream or packet helper | decomp/rename | med |
| 0x10014C80 | 0x00014C80 | BitStream_Write_f64 | Network/bitstream or packet helper | decomp/rename | med |
| 0x10014CE0 | 0x00014CE0 | BitStream_WriteBool | Network/bitstream or packet helper | decomp/rename | med |
| 0x10015300 | 0x00015300 | Update_ClientFX_ActionById | Update helper | decomp/rename | med |
| 0x10015690 | 0x00015690 | Update_ItemVisualFlags | Update helper | decomp/rename | med |
| 0x10015740 | 0x00015740 | Update_ClientFX_State | Update helper | decomp/rename | med |
| 0x10015B80 | 0x00015B80 | Vec3_DistSquared | Vector math | decomp/rename | low |
| 0x100161B0 | 0x000161B0 | Packet_ID_OBJECT_DETAILS_Ctor | Network/bitstream or packet helper | decomp/rename | med |
| 0x10016250 | 0x00016250 | BitStream_ReadBit_Checked | Network/bitstream or packet helper | decomp/rename | med |
| 0x100162F0 | 0x000162F0 | Packet_ReadEncodedString_0x800 | Network/bitstream or packet helper | decomp/rename | med |
| 0x10016320 | 0x00016320 | BitReader_ReadBit | Network/bitstream or packet helper | decomp/rename | med |
| 0x10016370 | 0x00016370 | BitStream_Read_u32c | Network/bitstream or packet helper | decomp/rename | med |
| 0x100163D0 | 0x000163D0 | BitStream_Read_u16c | Network/bitstream or packet helper | decomp/rename | med |
| 0x100165E0 | 0x000165E0 | RBTree_SpliceNode_Alt | std::rb_tree helper | decomp/rename | low |
| 0x10016750 | 0x00016750 | BitStream_Write_u16c | Network/bitstream or packet helper | decomp/rename | med |
| 0x10016860 | 0x00016860 | BitStream_ReadU8Compressed | Network/bitstream or packet helper | decomp/rename | med |
| 0x10016880 | 0x00016880 | BitStream_WriteCompressed_u8 | Network/bitstream or packet helper | decomp/rename | med |
| 0x100168B0 | 0x000168B0 | BitStream_Write_u32c | Network/bitstream or packet helper | decomp/rename | med |
| 0x10016910 | 0x00016910 | Obj_GetForwardVector | Renamed during deobf | decomp/rename | low |
| 0x10017470 | 0x00017470 | Packet_ID_OBJECT_DETAILS_Read | Network/bitstream or packet helper | decomp/rename | med |
| 0x1001BD10 | 0x0001BD10 | Packet_ID_PLAYER2PLAYER_Dtor | Network/bitstream or packet helper | decomp/rename | med |
| 0x1001BF20 | 0x0001BF20 | Packet_ID_PLAYER2PLAYER_Ctor | Network/bitstream or packet helper | decomp/rename | med |
| 0x1001BFD0 | 0x0001BFD0 | Packet_ID_PLAYER2PLAYER_Read | Network/bitstream or packet helper | decomp/rename | med |
| 0x1001C100 | 0x0001C100 | Packet_ID_PLAYER2PLAYER_Write | Network/bitstream or packet helper | decomp/rename | med |
| 0x1001D000 | 0x0001D000 | Movement_HandleState_00 | Movement/physics helper | decomp/rename | med |
| 0x1001D0D0 | 0x0001D0D0 | Movement_HandleState_01 | Movement/physics helper | decomp/rename | med |
| 0x1001D1E0 | 0x0001D1E0 | Movement_GetMaxSpeed_State01 | Movement/physics helper | decomp/rename | med |
| 0x1001D270 | 0x0001D270 | Movement_HandleState_02 | Movement/physics helper | decomp/rename | med |
| 0x1001D380 | 0x0001D380 | Movement_GetMaxSpeed_State02 | Movement/physics helper | decomp/rename | med |
| 0x1001D3F0 | 0x0001D3F0 | Movement_HandleState_20 | Movement/physics helper | decomp/rename | med |
| 0x1001D510 | 0x0001D510 | Movement_HandleState_17 | Movement/physics helper | decomp/rename | med |
| 0x1001D540 | 0x0001D540 | Movement_HandleState_18 | Movement/physics helper | decomp/rename | med |
| 0x1001D640 | 0x0001D640 | Movement_GetMaxSpeed_State17_19 | Movement/physics helper | decomp/rename | med |
| 0x1001D730 | 0x0001D730 | Movement_HandleState_08 | Movement/physics helper | decomp/rename | med |
| 0x1001D790 | 0x0001D790 | Movement_HandleState_SetStateIfGrounded | Movement/physics helper | decomp/rename | med |
| 0x1001D810 | 0x0001D810 | Movement_HandleState_09 | Movement/physics helper | decomp/rename | med |
| 0x1001D840 | 0x0001D840 | Movement_HandleState_10 | Movement/physics helper | decomp/rename | med |
| 0x1001D870 | 0x0001D870 | Movement_HandleState_11 | Movement/physics helper | decomp/rename | med |
| 0x1001D8C0 | 0x0001D8C0 | Movement_HandleState_12 | Movement/physics helper | decomp/rename | med |
| 0x1001D970 | 0x0001D970 | Movement_HandleState_21 | Movement/physics helper | decomp/rename | med |
| 0x1001DB10 | 0x0001DB10 | Vec3_Cross | Vector math | decomp/rename | low |
| 0x1001DBB0 | 0x0001DBB0 | Vec3_ScaleInv | Vector math | decomp/rename | low |
| 0x1001DBE0 | 0x0001DBE0 | Movement_HandleState_19 | Movement/physics helper | decomp/rename | med |
| 0x1001DCA0 | 0x0001DCA0 | Movement_HandleState_SetState08BySurfaceDot | Movement/physics helper | decomp/rename | med |
| 0x1001DD60 | 0x0001DD60 | Movement_HandleState_04 | Movement/physics helper | decomp/rename | med |
| 0x1001DD80 | 0x0001DD80 | Movement_HandleState_05 | Movement/physics helper | decomp/rename | med |
| 0x1001DDA0 | 0x0001DDA0 | Movement_HandleState_06 | Movement/physics helper | decomp/rename | med |
| 0x1001DDF0 | 0x0001DDF0 | Movement_HandleState_07 | Movement/physics helper | decomp/rename | med |
| 0x1001DE40 | 0x0001DE40 | Movement_HandleState_ApplySpeedAndStateWithDropSound | Movement/physics helper | decomp/rename | med |
| 0x1001DFC0 | 0x0001DFC0 | Movement_UpdateOrientationMatrix | Movement/physics helper | decomp/rename | med |
| 0x1001E140 | 0x0001E140 | Movement_GetMaxSpeed_State20 | Movement/physics helper | decomp/rename | med |
| 0x1001E210 | 0x0001E210 | Movement_HandleState_03 | Movement/physics helper | decomp/rename | med |
| 0x1001E670 | 0x0001E670 | Movement_SetRotationFromVectors | Movement/physics helper | decomp/rename | med |
| 0x1001E820 | 0x0001E820 | Movement_HandleState_13 | Movement/physics helper | decomp/rename | med |
| 0x1001E860 | 0x0001E860 | Movement_HandleState_14 | Movement/physics helper | decomp/rename | med |
| 0x1001E8A0 | 0x0001E8A0 | Movement_HandleState_15 | Movement/physics helper | decomp/rename | med |
| 0x1001E8D0 | 0x0001E8D0 | Movement_HandleState_16 | Movement/physics helper | decomp/rename | med |
| 0x1001E900 | 0x0001E900 | Movement_HandleState_SetRotationOnly_13 | Movement/physics helper | decomp/rename | med |
| 0x1001E920 | 0x0001E920 | Movement_HandleState_SetRotationOnly_14 | Movement/physics helper | decomp/rename | med |
| 0x1001E940 | 0x0001E940 | Movement_HandleState_SetRotationOnly_15 | Movement/physics helper | decomp/rename | med |
| 0x1001E960 | 0x0001E960 | Movement_HandleState_SetRotationOnly_16 | Movement/physics helper | decomp/rename | med |
| 0x1001F880 | 0x0001F880 | Update_TracerFX | Update helper | decomp/rename | med |
| 0x10020800 | 0x00020800 | Alloc_Node3 | std::vector helper | decomp/rename | low |
| 0x100214A0 | 0x000214A0 | SharedMem_SetFlag2BE1 | Shared memory helper | decomp/rename | med |
| 0x100214E0 | 0x000214E0 | SharedMem_InitMapping_Wrap | Shared memory helper | decomp/rename | med |
| 0x10023140 | 0x00023140 | BitStream_Write_u16c_into | Network/bitstream or packet helper | decomp/rename | med |
| 0x10023410 | 0x00023410 | Msg_Write_IntAndString2048 | Network/bitstream or packet helper | decomp/rename | med |
| 0x10023480 | 0x00023480 | Msg_Write_List_U32String2048_0x24 | Network/bitstream or packet helper | decomp/rename | med |
| 0x10023560 | 0x00023560 | Msg_Write_ByteU32 | Network/bitstream or packet helper | decomp/rename | med |
| 0x100235D0 | 0x000235D0 | Msg_Write_ByteString2048_AndLists | Network/bitstream or packet helper | decomp/rename | med |
| 0x10023700 | 0x00023700 | Msg_Write_StructList_0x44_WithPtrList | Network/bitstream or packet helper | decomp/rename | med |
| 0x10023850 | 0x00023850 | Msg_Write_U16x6 | Network/bitstream or packet helper | decomp/rename | med |
| 0x100238B0 | 0x000238B0 | Msg_Write_StructEntry_0x34 | Network/bitstream or packet helper | decomp/rename | med |
| 0x100239E0 | 0x000239E0 | Msg_Write_StructList_0x34_WithVec3s | Network/bitstream or packet helper | decomp/rename | med |
| 0x10023D40 | 0x00023D40 | Msg_Write_StructEntry_0x2C_WithFlags | Network/bitstream or packet helper | decomp/rename | med |
| 0x10023E60 | 0x00023E60 | Msg_Write_StructList_0x2C | Network/bitstream or packet helper | decomp/rename | med |
| 0x10023F10 | 0x00023F10 | Msg_Write_ByteBitPairs | Network/bitstream or packet helper | decomp/rename | med |
| 0x10023F90 | 0x00023F90 | Msg_Write_StructLarge_0x298 | Network/bitstream or packet helper | decomp/rename | med |
| 0x100241C0 | 0x000241C0 | Msg_Write_StructList_0x298 | Network/bitstream or packet helper | decomp/rename | med |
| 0x10024230 | 0x00024230 | Msg_Write_Entry_0x4C_StringFlags | Network/bitstream or packet helper | decomp/rename | med |
| 0x100243B0 | 0x000243B0 | Msg_Write_List_Entry0x4C | Network/bitstream or packet helper | decomp/rename | med |
| 0x10024430 | 0x00024430 | Msg_Write_Struct_0x80_WithList | Network/bitstream or packet helper | decomp/rename | med |
| 0x10024610 | 0x00024610 | Msg_Write_Entry_0x20_U32Str_U32U32 | Network/bitstream or packet helper | decomp/rename | med |
| 0x10024700 | 0x00024700 | Msg_Write_StructWithList_0x20 | Network/bitstream or packet helper | decomp/rename | med |
| 0x100247F0 | 0x000247F0 | Packet_WriteTypeA | Network/bitstream or packet helper | decomp/rename | med |
| 0x10024870 | 0x00024870 | Packet_WriteTypeB | Network/bitstream or packet helper | decomp/rename | med |
| 0x10024A70 | 0x00024A70 | Packet_WriteTypeC | Network/bitstream or packet helper | decomp/rename | med |
| 0x10024D40 | 0x00024D40 | Vector_Alloc_0x24 | std::vector helper | decomp/rename | low |
| 0x10024DB0 | 0x00024DB0 | Vector_Alloc_0x8 | std::vector helper | decomp/rename | low |
| 0x10024E80 | 0x00024E80 | List_Alloc_InitHead | Struct/container helper | decomp/rename | low |
| 0x10024EA0 | 0x00024EA0 | List_DestroyAndClear | Struct/container helper | decomp/rename | low |
| 0x10025020 | 0x00025020 | Vector_Alloc_0x2 | std::vector helper | decomp/rename | low |
| 0x100250E0 | 0x000250E0 | Vector_Alloc_0x4C | std::vector helper | decomp/rename | low |
| 0x10025370 | 0x00025370 | Vector_ResetToBegin | std::vector helper | decomp/rename | low |
| 0x100258E0 | 0x000258E0 | Vector_EraseRange_0x24 | std::vector helper | decomp/rename | low |
| 0x100259A0 | 0x000259A0 | Vector_EraseRange_0x34 | std::vector helper | decomp/rename | low |
| 0x100259F0 | 0x000259F0 | Vector_EraseRange_0x2C | std::vector helper | decomp/rename | low |
| 0x10025AB0 | 0x00025AB0 | Vector_EraseRange_0x4C | std::vector helper | decomp/rename | low |
| 0x10025B00 | 0x00025B00 | Vector_EraseRange_0x20 | std::vector helper | decomp/rename | low |
| 0x10025CD0 | 0x00025CD0 | Vector_Clear_0x8 | std::vector helper | decomp/rename | low |
| 0x10025DE0 | 0x00025DE0 | Vector_Assign_0x8 | std::vector helper | decomp/rename | low |
| 0x10025FD0 | 0x00025FD0 | Struct_Reset_AndClearVec0x34 | Struct/container helper | decomp/rename | low |
| 0x10026200 | 0x00026200 | Vector_Assign_0x4C | std::vector helper | decomp/rename | low |
| 0x10026570 | 0x00026570 | Struct_Reset_AndClearVec0x4C | Struct/container helper | decomp/rename | low |
| 0x100267D0 | 0x000267D0 | Packet_ID_WORLDSERVICE_Write | Network/bitstream or packet helper | decomp/rename | med |
| 0x100269D0 | 0x000269D0 | CopyRange_0x44_WithVec4 | std::vector helper | decomp/rename | low |
| 0x10026A30 | 0x00026A30 | Struct_Assign_0x90 | Struct/container helper | decomp/rename | low |
| 0x10026BD0 | 0x00026BD0 | CopyRange_0x90 | std::vector helper | decomp/rename | low |
| 0x100272A0 | 0x000272A0 | Struct_Reset_AndClearArray0x90 | Struct/container helper | decomp/rename | low |
| 0x100272F0 | 0x000272F0 | Packet_ID_BACKPACK_CONTENTS_Ctor | Network/bitstream or packet helper | decomp/rename | med |
| 0x100273C0 | 0x000273C0 | Packet_ID_BACKPACK_CONTENTS_Read | Network/bitstream or packet helper | decomp/rename | med |
| 0x10027440 | 0x00027440 | Packet_ID_BACKPACK_CONTENTS_Dtor | Network/bitstream or packet helper | decomp/rename | med |
| 0x100274E0 | 0x000274E0 | Packet_ID_WORLDSERVICE_Ctor | Network/bitstream or packet helper | decomp/rename | med |
| 0x10027A40 | 0x00027A40 | Msg_Read_U16x6 | Network/bitstream or packet helper | decomp/rename | med |
| 0x10027CB0 | 0x00027CB0 | FillN_0x34 | std::vector helper | decomp/rename | low |
| 0x10027CE0 | 0x00027CE0 | FillN_0x20 | std::vector helper | decomp/rename | low |
| 0x10027E30 | 0x00027E30 | FillN_0x34_ReturnEnd | std::vector helper | decomp/rename | low |
| 0x10027E70 | 0x00027E70 | FillN_0x20_ReturnEnd | std::vector helper | decomp/rename | low |
| 0x100283C0 | 0x000283C0 | Vector_Insert_0x34 | std::vector helper | decomp/rename | low |
| 0x10028470 | 0x00028470 | Vector_PushBack_0x34 | std::vector helper | decomp/rename | low |
| 0x10028570 | 0x00028570 | Msg_Read_ListEntries_0x34 | Network/bitstream or packet helper | decomp/rename | med |
| 0x10028740 | 0x00028740 | Msg_Read_ListEntries_0x20_WithHeader | Network/bitstream or packet helper | decomp/rename | med |
| 0x100288E0 | 0x000288E0 | Packet_ID_WORLDSERVICE_Read | Network/bitstream or packet helper | decomp/rename | med |
| 0x10028AA0 | 0x00028AA0 | Packet_ID_WORLDSERVICE_Dtor | Network/bitstream or packet helper | decomp/rename | med |
| 0x10028BD0 | 0x00028BD0 | Packet_ID_BOUNTY_Dtor | Network/bitstream or packet helper | decomp/rename | med |
| 0x10028D20 | 0x00028D20 | Struct_Reset_AndClearArray0x44 | Struct/container helper | decomp/rename | low |
| 0x10028EC0 | 0x00028EC0 | Packet_ID_BOUNTY_Ctor | Network/bitstream or packet helper | decomp/rename | med |
| 0x10029490 | 0x00029490 | Msg_Read_Entry_0x2C_Flags | Network/bitstream or packet helper | decomp/rename | med |
| 0x10029550 | 0x00029550 | Msg_Read_Entry_0x4C_StringFlags | Network/bitstream or packet helper | decomp/rename | med |
| 0x100296C0 | 0x000296C0 | FillN_0x2C | std::vector helper | decomp/rename | low |
| 0x100296F0 | 0x000296F0 | FillN_0x4C | std::vector helper | decomp/rename | low |
| 0x100298A0 | 0x000298A0 | FillN_0x2C_ReturnEnd | std::vector helper | decomp/rename | low |
| 0x100298E0 | 0x000298E0 | FillN_0x4C_ReturnEnd | std::vector helper | decomp/rename | low |
| 0x10029CF0 | 0x00029CF0 | Vector_Insert_0x4C | std::vector helper | decomp/rename | low |
| 0x10029FA0 | 0x00029FA0 | Struct_Assign_WithVec76 | Struct/container helper | decomp/rename | low |
| 0x1002A090 | 0x0002A090 | Vector_PushBack_0x4C | std::vector helper | decomp/rename | low |
| 0x1002A120 | 0x0002A120 | Vector_Insert_0x2C | std::vector helper | decomp/rename | low |
| 0x1002A1A0 | 0x0002A1A0 | Msg_Read_ListEntries_0x4C | Network/bitstream or packet helper | decomp/rename | med |
| 0x1002A220 | 0x0002A220 | Msg_Read_Struct_WithList0x4C | Network/bitstream or packet helper | decomp/rename | med |
| 0x1002A2E0 | 0x0002A2E0 | Vector_PushBack_0x2C | std::vector helper | decomp/rename | low |
| 0x1002A460 | 0x0002A460 | Msg_Read_ListEntries_0x2C | Network/bitstream or packet helper | decomp/rename | med |
| 0x1002AAB0 | 0x0002AAB0 | Vector_Insert_0x90 | std::vector helper | decomp/rename | low |
| 0x1002AB50 | 0x0002AB50 | Vector_PushBack_0x90 | std::vector helper | decomp/rename | low |
| 0x1002AD70 | 0x0002AD70 | Packet_Read_TypeD | Network/bitstream or packet helper | decomp/rename | med |
| 0x1002B040 | 0x0002B040 | Packet_ID_APARTMENTS_Ctor | Network/bitstream or packet helper | decomp/rename | med |
| 0x1002BB90 | 0x0002BB90 | Msg_Read_IntAndString2048 | Network/bitstream or packet helper | decomp/rename | med |
| 0x1002BEC0 | 0x0002BEC0 | FillN_0x24 | std::vector helper | decomp/rename | low |
| 0x1002BEF0 | 0x0002BEF0 | FillN_0x8 | std::vector helper | decomp/rename | low |
| 0x1002BF20 | 0x0002BF20 | FillN_0x2 | std::vector helper | decomp/rename | low |
| 0x1002C380 | 0x0002C380 | FillN_0x24_ReturnEnd | std::vector helper | decomp/rename | low |
| 0x1002C3C0 | 0x0002C3C0 | FillN_0x8_ReturnEnd | std::vector helper | decomp/rename | low |
| 0x1002C400 | 0x0002C400 | FillN_0x2_ReturnEnd | std::vector helper | decomp/rename | low |
| 0x1002CCA0 | 0x0002CCA0 | Vector_Insert_0x24 | std::vector helper | decomp/rename | low |
| 0x1002D1E0 | 0x0002D1E0 | Vector_Assign_0x2 | std::vector helper | decomp/rename | low |
| 0x1002D3A0 | 0x0002D3A0 | Struct_Reset_ZeroAndClearVecs | Struct/container helper | decomp/rename | low |
| 0x1002D410 | 0x0002D410 | Vector_Assign_0x24 | std::vector helper | decomp/rename | low |
| 0x1002D550 | 0x0002D550 | Vector_PushBack_0x24 | std::vector helper | decomp/rename | low |
| 0x1002D790 | 0x0002D790 | Msg_Read_U32String_List | Network/bitstream or packet helper | decomp/rename | med |
| 0x1002DD00 | 0x0002DD00 | Msg_Read_U8Bool_List | Network/bitstream or packet helper | decomp/rename | med |
| 0x1002EF90 | 0x0002EF90 | Msg_Read_SkillsAndU32List | Network/bitstream or packet helper | decomp/rename | med |
| 0x1002F380 | 0x0002F380 | Packet_Dtor_WorldServiceBackpack | Network/bitstream or packet helper | decomp/rename | med |
| 0x1002F780 | 0x0002F780 | Dispatch_ActionByCode | Renamed during deobf | decomp/rename | low |
| 0x1002FDB0 | 0x0002FDB0 | Msg_Read_BackpackContainerList | Network/bitstream or packet helper | decomp/rename | med |
| 0x1002FE70 | 0x0002FE70 | Packet_ReadTypeC | Network/bitstream or packet helper | decomp/rename | med |
| 0x10030080 | 0x00030080 | Prop_Read_ID_Type | Prop handler | decomp/rename | med |
| 0x10030100 | 0x00030100 | Obj_Update_RenderFlags | Renamed during deobf | decomp/rename | low |
| 0x10030270 | 0x00030270 | Update_RightShoulderFX | Update helper | decomp/rename | med |
| 0x100302F0 | 0x000302F0 | LTServer_RemoveHandle_This2 | LithTech server API helper | decomp/rename | low |
| 0x10030590 | 0x00030590 | Obj_OnMessage_Handle105 | Renamed during deobf | decomp/rename | low |
| 0x10030600 | 0x00030600 | Obj_Update_TimedFX | Renamed during deobf | decomp/rename | low |
| 0x10030860 | 0x00030860 | NPC_AnimSound_UpdateState | NPC | decomp/rename | med |
| 0x10030B10 | 0x00030B10 | NPC_Update_MoveAnimStrings | NPC | decomp/rename | med |
| 0x10030D70 | 0x00030D70 | NPC_Update_AnimState | NPC | decomp/rename | med |
| 0x10031400 | 0x00031400 | Obj_OnMessage_Switch | Renamed during deobf | decomp/rename | low |
| 0x100315C0 | 0x000315C0 | Obj_Update_GroundAlign | Renamed during deobf | decomp/rename | low |
| 0x10032DA0 | 0x00032DA0 | Obj_OnMessage_ResetOn1 | Renamed during deobf | decomp/rename | low |
| 0x10032F60 | 0x00032F60 | Obj_OnMessage_RemoveCmd | Renamed during deobf | decomp/rename | low |
| 0x10033250 | 0x00033250 | Prop_Read_DamageRadius_RemoveWhenDone | Prop handler | decomp/rename | med |
| 0x100336D0 | 0x000336D0 | ClientObj_OnMessageDispatch_ResetVel | Client object handler | decomp/rename | med |
| 0x100344A0 | 0x000344A0 | ClientObj_UpdateTimers | Client object handler | decomp/rename | med |
| 0x10034600 | 0x00034600 | Brush_ReadProps_SetDefaultName | Brush/prop helper | decomp/rename | low |
| 0x10034BB0 | 0x00034BB0 | ClientObj_OnMessageDispatch_Handle2 | Client object handler | decomp/rename | med |
| 0x10034C30 | 0x00034C30 | Obj_UpdateOnStateChange | Renamed during deobf | decomp/rename | low |
| 0x10036440 | 0x00036440 | Vector_ThrowLengthError_Generic | std::vector helper | decomp/rename | low |
| 0x100364C0 | 0x000364C0 | Vector_ThrowLengthError_Generic2 | std::vector helper | decomp/rename | low |
| 0x10036560 | 0x00036560 | Vector_ThrowLengthError_Generic3 | std::vector helper | decomp/rename | low |
| 0x10036680 | 0x00036680 | Vector_ThrowLengthError_Generic4 | std::vector helper | decomp/rename | low |
| 0x10036720 | 0x00036720 | Vector_ThrowLengthError_Generic5 | std::vector helper | decomp/rename | low |
| 0x100367F0 | 0x000367F0 | RBTree_MaxNode | std::rb_tree helper | decomp/rename | low |
| 0x10036810 | 0x00036810 | RBTree_MinNode | std::rb_tree helper | decomp/rename | low |
| 0x100369B0 | 0x000369B0 | Alloc_0x140Array | std::vector helper | decomp/rename | low |
| 0x10036A10 | 0x00036A10 | Alloc_0x34Array | std::vector helper | decomp/rename | low |
| 0x10036A70 | 0x00036A70 | Alloc_0x24Array | std::vector helper | decomp/rename | low |
| 0x10036AE0 | 0x00036AE0 | Alloc_0x4CArray | std::vector helper | decomp/rename | low |
| 0x10036B40 | 0x00036B40 | Alloc_0x914Array | std::vector helper | decomp/rename | low |
| 0x100373B0 | 0x000373B0 | BitStream_WriteBitArray6 | Network/bitstream or packet helper | decomp/rename | med |
| 0x100373F0 | 0x000373F0 | Struct_Reset_Defaults_374 | Struct/container helper | decomp/rename | low |
| 0x10037560 | 0x00037560 | Msg_Write_BitMatrix4x6 | Network/bitstream or packet helper | decomp/rename | med |
| 0x10037760 | 0x00037760 | RBTree_RotateLeft | std::rb_tree helper | decomp/rename | low |
| 0x100377C0 | 0x000377C0 | RBTree_RotateRight | std::rb_tree helper | decomp/rename | low |
| 0x10037830 | 0x00037830 | RBTree_NextNode | std::rb_tree helper | decomp/rename | low |
| 0x10037AB0 | 0x00037AB0 | CopyRange_0x4C_Alt2 | std::vector helper | decomp/rename | low |
| 0x10037B50 | 0x00037B50 | CopyRange_0x4C | std::vector helper | decomp/rename | low |
| 0x10037BA0 | 0x00037BA0 | CopyRange_0x4C_Alt | std::vector helper | decomp/rename | low |
| 0x100383D0 | 0x000383D0 | Msg_Write_Entry0x140 | Network/bitstream or packet helper | decomp/rename | med |
| 0x10038560 | 0x00038560 | Msg_Write_List_0x140 | Network/bitstream or packet helper | decomp/rename | med |
| 0x10038600 | 0x00038600 | Msg_Write_StructA_Complex | Network/bitstream or packet helper | decomp/rename | med |
| 0x100387A0 | 0x000387A0 | Msg_Write_EntryU32StringU32List | Network/bitstream or packet helper | decomp/rename | med |
| 0x100388A0 | 0x000388A0 | Msg_Write_U32List_AndEntry52List | Network/bitstream or packet helper | decomp/rename | med |
| 0x100389B0 | 0x000389B0 | Msg_Write_StructB_WithU16x6 | Network/bitstream or packet helper | decomp/rename | med |
| 0x10038A80 | 0x00038A80 | Msg_Write_EntryU32U32Flag_StringVec | Network/bitstream or packet helper | decomp/rename | med |
| 0x10038B40 | 0x00038B40 | Msg_Write_StructC_WithList0x24 | Network/bitstream or packet helper | decomp/rename | med |
| 0x10038CC0 | 0x00038CC0 | Msg_Write_Struct_BytesU16U32String | Network/bitstream or packet helper | decomp/rename | med |
| 0x10038DC0 | 0x00038DC0 | Msg_Write_Struct_U32_SubDDC50_SubDB8E0_U32 | Network/bitstream or packet helper | decomp/rename | med |
| 0x10038E70 | 0x00038E70 | Msg_Write_StructD | Network/bitstream or packet helper | decomp/rename | med |
| 0x10038F50 | 0x00038F50 | Packet_WriteTypeD | Network/bitstream or packet helper | decomp/rename | med |
| 0x10038FF0 | 0x00038FF0 | Packet_WriteTypeE | Network/bitstream or packet helper | decomp/rename | med |
| 0x10039300 | 0x00039300 | Packet_WriteTypeF2 | Network/bitstream or packet helper | decomp/rename | med |
| 0x10039680 | 0x00039680 | Vector_Reserve_0x4C | std::vector helper | decomp/rename | low |
| 0x100396F0 | 0x000396F0 | Vector_Reserve_LargeStructA | std::vector helper | decomp/rename | low |
| 0x10039770 | 0x00039770 | Alloc_Struct48_WithString | std::vector helper | decomp/rename | low |
| 0x10039860 | 0x00039860 | RBTree_AllocNode | std::rb_tree helper | decomp/rename | low |
| 0x10039D20 | 0x00039D20 | CopyRange_0x4C_Wrap2 | std::vector helper | decomp/rename | low |
| 0x1003A0B0 | 0x0003A0B0 | Vector_Clear_U32 | std::vector helper | decomp/rename | low |
| 0x1003A0E0 | 0x0003A0E0 | Msg_Write_MapU32String | Network/bitstream or packet helper | decomp/rename | med |
| 0x1003A220 | 0x0003A220 | Msg_Write_LargeStructA | Network/bitstream or packet helper | decomp/rename | med |
| 0x1003A4B0 | 0x0003A4B0 | Msg_Write_List_LargeStructA_0x914 | Network/bitstream or packet helper | decomp/rename | med |
| 0x1003A550 | 0x0003A550 | Msg_Write_LargeStructB | Network/bitstream or packet helper | decomp/rename | med |
| 0x1003A760 | 0x0003A760 | Packet_WriteTypeF | Network/bitstream or packet helper | decomp/rename | med |
| 0x1003AA40 | 0x0003AA40 | RBTree_DeleteSubtree | std::rb_tree helper | decomp/rename | low |
| 0x1003AAA0 | 0x0003AAA0 | RBTree_EraseNode | std::rb_tree helper | decomp/rename | low |
| 0x1003AD80 | 0x0003AD80 | RBTree_CopyNodeRecursive | std::rb_tree helper | decomp/rename | low |
| 0x1003AF50 | 0x0003AF50 | Vector_EraseRange_0x24_MoveTail | std::vector helper | decomp/rename | low |
| 0x1003B000 | 0x0003B000 | RBTree_EraseRange | std::rb_tree helper | decomp/rename | low |
| 0x1003B100 | 0x0003B100 | Vector_EraseRange_0x4C_MoveTail | std::vector helper | decomp/rename | low |
| 0x1003B180 | 0x0003B180 | Vector_Assign_0x4C_FromRange | std::vector helper | decomp/rename | low |
| 0x1003B250 | 0x0003B250 | RBTree_CopyFromOther | std::rb_tree helper | decomp/rename | low |
| 0x1003B2E0 | 0x0003B2E0 | CopyRange_0x34 | std::vector helper | decomp/rename | low |
| 0x1003B520 | 0x0003B520 | RBTree_InitAndPopulate | std::rb_tree helper | decomp/rename | low |
| 0x1003B650 | 0x0003B650 | Vector_Assign_0x4C_Alt | std::vector helper | decomp/rename | low |
| 0x1003B850 | 0x0003B850 | LargeStructA_Clear | Struct/container helper | decomp/rename | low |
| 0x1003B950 | 0x0003B950 | LargeStructA_ClearContainers | Struct/container helper | decomp/rename | low |
| 0x1003B9F0 | 0x0003B9F0 | Packet_ID_FRIENDS_Ctor | Network/bitstream or packet helper | decomp/rename | med |
| 0x1003BB20 | 0x0003BB20 | BitStream_ReadCompressedU32 | Network/bitstream or packet helper | decomp/rename | med |
| 0x1003BBD0 | 0x0003BBD0 | CopyRangeBackward_0x140 | std::vector helper | decomp/rename | low |
| 0x1003BEB0 | 0x0003BEB0 | CopyRange_0x140 | std::vector helper | decomp/rename | low |
| 0x1003BF20 | 0x0003BF20 | FillN_0x140 | std::vector helper | decomp/rename | low |
| 0x1003BFF0 | 0x0003BFF0 | FillN_0x140_ReturnEnd | std::vector helper | decomp/rename | low |
| 0x1003C030 | 0x0003C030 | CopyRange_0x140_Wrap | std::vector helper | decomp/rename | low |
| 0x1003C060 | 0x0003C060 | Vector_Insert_0x140_Fill | std::vector helper | decomp/rename | low |
| 0x1003C310 | 0x0003C310 | Packet_ID_FRIENDS_Dtor | Network/bitstream or packet helper | decomp/rename | med |
| 0x1003C3C0 | 0x0003C3C0 | Vector_Insert_0x140_ReturnIter | std::vector helper | decomp/rename | low |
| 0x1003C4F0 | 0x0003C4F0 | Update_SharedMem_AndFriendsPing | Update helper | decomp/rename | med |
| 0x1003C720 | 0x0003C720 | Struct_Init_ZeroAndClear | Struct/container helper | decomp/rename | low |
| 0x1003C7A0 | 0x0003C7A0 | RBTree_Clear | std::rb_tree helper | decomp/rename | low |
| 0x1003C830 | 0x0003C830 | LargeStructA_Reset | Struct/container helper | decomp/rename | low |
| 0x1003C910 | 0x0003C910 | Packet_ID_DEPLOY_ITEM_Ctor | Network/bitstream or packet helper | decomp/rename | med |
| 0x1003CAA0 | 0x0003CAA0 | BitReader_ReadBoolMatrix6x4 | Network/bitstream or packet helper | decomp/rename | med |
| 0x1003CBD0 | 0x0003CBD0 | Vector_PushBack_0x140 | std::vector helper | decomp/rename | low |
| 0x1003CCA0 | 0x0003CCA0 | LargeStructA_CopyFromDeep | Struct/container helper | decomp/rename | low |
| 0x1003CDE0 | 0x0003CDE0 | Msg_Read_EntryList_SubCBD0 | Network/bitstream or packet helper | decomp/rename | med |
| 0x1003CEB0 | 0x0003CEB0 | Packet_ID_FRIENDS_Read | Network/bitstream or packet helper | decomp/rename | med |
| 0x1003CF50 | 0x0003CF50 | Packet_ID_DEPLOY_ITEM_Read | Network/bitstream or packet helper | decomp/rename | med |
| 0x1003D220 | 0x0003D220 | LargeStructA_CopyFrom | Struct/container helper | decomp/rename | low |
| 0x1003D370 | 0x0003D370 | CopyRange_LargeStructA | std::vector helper | decomp/rename | low |
| 0x1003D3C0 | 0x0003D3C0 | LargeStructA_CopyFrom_IfNotNull | Struct/container helper | decomp/rename | low |
| 0x1003D4C0 | 0x0003D4C0 | CopyRange_LargeStructA_Wrap | std::vector helper | decomp/rename | low |
| 0x1003D540 | 0x0003D540 | LargeStructA_UninitCopy_CleanupThrow | Struct/container helper | decomp/rename | low |
| 0x1003D6F0 | 0x0003D6F0 | Struct_Reset_Vectors | Struct/container helper | decomp/rename | low |
| 0x1003D770 | 0x0003D770 | Struct_Destroy_Vectors | Struct/container helper | decomp/rename | low |
| 0x1003D7D0 | 0x0003D7D0 | Packet_ID_DEPLOY_ITEM_Dtor | Network/bitstream or packet helper | decomp/rename | med |
| 0x1003D850 | 0x0003D850 | LargeStructA_UninitCopy_WrapThrow | Struct/container helper | decomp/rename | low |
| 0x1003D880 | 0x0003D880 | Struct_Init_WithD6F0 | Struct/container helper | decomp/rename | low |
| 0x1003D8E0 | 0x0003D8E0 | Packet_ID_TERRITORY_Ctor | Network/bitstream or packet helper | decomp/rename | med |
| 0x1003DBB0 | 0x0003DBB0 | BitReader_ReadBoolArray6 | Network/bitstream or packet helper | decomp/rename | med |
| 0x1003DDB0 | 0x0003DDB0 | CopyRange_0x24 | std::vector helper | decomp/rename | low |
| 0x1003DF90 | 0x0003DF90 | CopyRangeBackward_0x24 | std::vector helper | decomp/rename | low |
| 0x1003DFC0 | 0x0003DFC0 | FillN_0x24_Alt | std::vector helper | decomp/rename | low |
| 0x1003E0D0 | 0x0003E0D0 | FillN_0x24_ReturnEnd_Alt | std::vector helper | decomp/rename | low |
| 0x1003E140 | 0x0003E140 | CopyRangeBackward_0x34_Alt | std::vector helper | decomp/rename | low |
| 0x1003E1F0 | 0x0003E1F0 | CopyRange_0x24_Wrap | std::vector helper | decomp/rename | low |
| 0x1003E220 | 0x0003E220 | CopyRangeBackward_0x34 | std::vector helper | decomp/rename | low |
| 0x1003E2A0 | 0x0003E2A0 | Vector_Insert_0x24_Fill | std::vector helper | decomp/rename | low |
| 0x1003E5F0 | 0x0003E5F0 | Vector_Insert_0x24_ReturnIter | std::vector helper | decomp/rename | low |
| 0x1003E720 | 0x0003E720 | Msg_Read_EntryU32StringU32List | Network/bitstream or packet helper | decomp/rename | med |
| 0x1003E800 | 0x0003E800 | Vector_PushBack_0x24_Alt | std::vector helper | decomp/rename | low |
| 0x1003E950 | 0x0003E950 | Msg_Read_EntryList_U32U32Flag_String | Network/bitstream or packet helper | decomp/rename | med |
| 0x1003EBC0 | 0x0003EBC0 | Vector_Insert_0x34_Fill | std::vector helper | decomp/rename | low |
| 0x1003EEB0 | 0x0003EEB0 | Vector_Insert_0x34_ReturnIter | std::vector helper | decomp/rename | low |
| 0x1003EF10 | 0x0003EF10 | Vector_EraseRange_LargeStructA | std::vector helper | decomp/rename | low |
| 0x1003EF80 | 0x0003EF80 | Vector_Clear_LargeStructA | std::vector helper | decomp/rename | low |
| 0x1003EFD0 | 0x0003EFD0 | Vector_PushBack_0x34_Alt | std::vector helper | decomp/rename | low |
| 0x1003F090 | 0x0003F090 | Vector_Assign_LargeStructA | std::vector helper | decomp/rename | low |
| 0x1003F200 | 0x0003F200 | Msg_Read_U32List_AndStructList0x34 | Network/bitstream or packet helper | decomp/rename | med |
| 0x1003F3B0 | 0x0003F3B0 | LargeStructB_Reset | Struct/container helper | decomp/rename | low |
| 0x1003F490 | 0x0003F490 | Packet_ID_TERRITORY_Dtor | Network/bitstream or packet helper | decomp/rename | med |
| 0x1003F500 | 0x0003F500 | Packet_ID_TERRITORY_Read | Network/bitstream or packet helper | decomp/rename | med |
| 0x1003F690 | 0x0003F690 | Vector_Init_LargeStructA | std::vector helper | decomp/rename | low |
| 0x1003F780 | 0x0003F780 | Packet_ID_GAMEMASTER_Ctor | Network/bitstream or packet helper | decomp/rename | med |
| 0x1003FA20 | 0x0003FA20 | RBTree_PrevNode | std::rb_tree helper | decomp/rename | low |
| 0x1003FCA0 | 0x0003FCA0 | Msg_Read_Struct_BytesU16U32String | Network/bitstream or packet helper | decomp/rename | med |
| 0x1003FD60 | 0x0003FD60 | Msg_Read_EntryU32_2B_U32_2Strings | Network/bitstream or packet helper | decomp/rename | med |
| 0x1003FE60 | 0x0003FE60 | CopyRangeBackward_0x4C | std::vector helper | decomp/rename | low |
| 0x1003FE90 | 0x0003FE90 | FillN_0x4C_Alt | std::vector helper | decomp/rename | low |
| 0x1003FEC0 | 0x0003FEC0 | RBTree_InsertNode_WithStringKey | std::rb_tree helper | decomp/rename | low |
| 0x100402F0 | 0x000402F0 | FillN_0x4C_ReturnEnd_Alt | std::vector helper | decomp/rename | low |
| 0x10040430 | 0x00040430 | CopyRange_0x4C_Wrap | std::vector helper | decomp/rename | low |
| 0x10040460 | 0x00040460 | Msg_Read_MapU32String | Network/bitstream or packet helper | decomp/rename | med |
| 0x10040520 | 0x00040520 | Vector_Insert_0x4C_Fill | std::vector helper | decomp/rename | low |
| 0x10040770 | 0x00040770 | Vector_Insert_0x4C_ReturnIter | std::vector helper | decomp/rename | low |
| 0x100407D0 | 0x000407D0 | Vector_PushBack_0x4C_Alt | std::vector helper | decomp/rename | low |
| 0x10040860 | 0x00040860 | CopyRangeBackward_LargeStructA | std::vector helper | decomp/rename | low |
| 0x100408A0 | 0x000408A0 | LargeStructA_Read | Struct/container helper | decomp/rename | low |
| 0x10040B90 | 0x00040B90 | LargeStructA_FillN_CleanupThrow | Struct/container helper | decomp/rename | low |
| 0x10040CA0 | 0x00040CA0 | LargeStructA_FillN_WrapThrow | Struct/container helper | decomp/rename | low |
| 0x10040D10 | 0x00040D10 | LargeStructA_UninitCopy_WrapThrow2 | Struct/container helper | decomp/rename | low |
| 0x10040D40 | 0x00040D40 | Vector_Insert_LargeStructA_Fill | std::vector helper | decomp/rename | low |
| 0x100410B0 | 0x000410B0 | Vector_Insert_LargeStructA_ReturnIter | std::vector helper | decomp/rename | low |
| 0x10041120 | 0x00041120 | LargeStructB_CopyFrom | Struct/container helper | decomp/rename | low |
| 0x10041200 | 0x00041200 | GameMaster_HandleMessage | Game master handler | decomp/rename | med |
| 0x10043B60 | 0x00043B60 | Vector_PushBack_LargeStructA | std::vector helper | decomp/rename | low |
| 0x10043BF0 | 0x00043BF0 | Msg_Read_LargeStructA_List | Network/bitstream or packet helper | decomp/rename | med |
| 0x10043CC0 | 0x00043CC0 | LargeStructB_Read | Struct/container helper | decomp/rename | low |
| 0x10043E10 | 0x00043E10 | Packet_ID_GAMEMASTER_Read | Network/bitstream or packet helper | decomp/rename | med |
| 0x100441C0 | 0x000441C0 | Ventilator_Ctor | Gameplay object/handler | decomp/rename | med |
| 0x10044210 | 0x00044210 | GameStartPoint_Ctor | Gameplay object/handler | decomp/rename | med |
| 0x10044280 | 0x00044280 | GameStartPointPrison_Ctor | Gameplay object/handler | decomp/rename | med |
| 0x100442D0 | 0x000442D0 | GameStartPointNewPlayers_Ctor | Gameplay object/handler | decomp/rename | med |
| 0x10044320 | 0x00044320 | GameStartPointGameMasters_Ctor | Gameplay object/handler | decomp/rename | med |
| 0x10044440 | 0x00044440 | Brush_ReadProps_Rotation | Brush/prop helper | decomp/rename | low |
| 0x100445C0 | 0x000445C0 | GameStartPoint_OnMessage | Gameplay object/handler | decomp/rename | med |
| 0x10044B00 | 0x00044B00 | GameStartPointPrison_OnMessage | Gameplay object/handler | decomp/rename | med |
| 0x10045030 | 0x00045030 | GameStartPointNewPlayers_OnMessage | Gameplay object/handler | decomp/rename | med |
| 0x10045560 | 0x00045560 | Ventilator_OnMessage | Gameplay object/handler | decomp/rename | med |
| 0x10045760 | 0x00045760 | Group_Dtor | Gameplay object/handler | decomp/rename | med |
| 0x100457F0 | 0x000457F0 | Group_SendMessageToChildrenByName | Gameplay object/handler | decomp/rename | med |
| 0x10045960 | 0x00045960 | Group_Ctor | Gameplay object/handler | decomp/rename | med |
| 0x10045980 | 0x00045980 | Group_ReadProps | Gameplay object/handler | decomp/rename | med |
| 0x10045AD0 | 0x00045AD0 | CHHWeaponModel_HideHandHeld | Gameplay object/handler | decomp/rename | med |
| 0x10045B70 | 0x00045B70 | CHHWeaponModel_Ctor | Gameplay object/handler | decomp/rename | med |
| 0x10045B90 | 0x00045B90 | CHHWeaponModel_OnMessage | Gameplay object/handler | decomp/rename | med |
| 0x10045D40 | 0x00045D40 | InteractiveObject_UpdateLastUse | Gameplay object/handler | decomp/rename | med |
| 0x10045D80 | 0x00045D80 | InteractiveObject_Ctor | Gameplay object/handler | decomp/rename | med |
| 0x10045E00 | 0x00045E00 | InteractiveObject_PlayAlarm | Gameplay object/handler | decomp/rename | med |
| 0x10045E40 | 0x00045E40 | Terminal_ReadProps | Gameplay object/handler | decomp/rename | med |
| 0x10045F80 | 0x00045F80 | InteractiveObject_OnCreateVisuals | Gameplay object/handler | decomp/rename | med |
| 0x10046140 | 0x00046140 | InteractiveObject_OnDestroyVisuals | Gameplay object/handler | decomp/rename | med |
| 0x100461A0 | 0x000461A0 | Terminal_OnMessage | Gameplay object/handler | decomp/rename | med |
| 0x100461E0 | 0x000461E0 | InteractiveObject_TriggerAction | Gameplay object/handler | decomp/rename | med |
| 0x10046310 | 0x00046310 | InteractiveObject_SetActive | Gameplay object/handler | decomp/rename | med |
| 0x100464C0 | 0x000464C0 | InteractiveObject_OnMessage_Command | Gameplay object/handler | decomp/rename | med |
| 0x10046640 | 0x00046640 | RBTree_MaxNode_Variant | std::rb_tree helper | decomp/rename | low |
| 0x10046660 | 0x00046660 | RBTree_MinNode_Variant | std::rb_tree helper | decomp/rename | low |
| 0x100466A0 | 0x000466A0 | RBTree_RotateLeft_Variant | std::rb_tree helper | decomp/rename | low |
| 0x10046800 | 0x00046800 | RBTree_NextNode_Variant | std::rb_tree helper | decomp/rename | low |
| 0x10046850 | 0x00046850 | RBTree_PrevNode_Variant | std::rb_tree helper | decomp/rename | low |
| 0x10046BD0 | 0x00046BD0 | RBTree_RotateRight_Variant | std::rb_tree helper | decomp/rename | low |
| 0x10046D00 | 0x00046D00 | RBTree_DeleteSubtree_Variant | std::rb_tree helper | decomp/rename | low |
| 0x10046E50 | 0x00046E50 | SharedMem_ClearNotifications | Shared memory helper | decomp/rename | med |
| 0x10046EF0 | 0x00046EF0 | SharedMem_ClearBlocks | Shared memory helper | decomp/rename | med |
| 0x10047110 | 0x00047110 | SharedMem_AddNotification | Shared memory helper | decomp/rename | med |
| 0x10047380 | 0x00047380 | RBTree_AllocNode_Variant | std::rb_tree helper | decomp/rename | low |
| 0x100473C0 | 0x000473C0 | RBTree_AllocNodeWithData_Variant | std::rb_tree helper | decomp/rename | low |
| 0x10047450 | 0x00047450 | SharedMem_ClearAudioEvents | Shared memory helper | decomp/rename | med |
| 0x100474E0 | 0x000474E0 | RBTree_EraseNode_VariantA | std::rb_tree helper | decomp/rename | low |
| 0x100477A0 | 0x000477A0 | RBTree_LowerBound_Variant | std::rb_tree helper | decomp/rename | low |
| 0x10047820 | 0x00047820 | RBTree_EraseRange_Variant | std::rb_tree helper | decomp/rename | low |
| 0x10047910 | 0x00047910 | RBTree_InsertNode_VariantA | std::rb_tree helper | decomp/rename | low |
| 0x10047AD0 | 0x00047AD0 | Struct_Init_Sub46E50 | Struct/container helper | decomp/rename | low |
| 0x10047B30 | 0x00047B30 | Struct_Init_Sub46EF0 | Struct/container helper | decomp/rename | low |
| 0x10047B80 | 0x00047B80 | RBTree_PurgeExpiredNodes | std::rb_tree helper | decomp/rename | low |
| 0x10047C60 | 0x00047C60 | RBTree_InsertUnique_Variant | std::rb_tree helper | decomp/rename | low |
| 0x10047D30 | 0x00047D30 | Struct_Init_Sub47450 | Struct/container helper | decomp/rename | low |
| 0x10047DF0 | 0x00047DF0 | RBTree_InsertWithHint_Variant | std::rb_tree helper | decomp/rename | low |
| 0x10047F90 | 0x00047F90 | CInventorySrv_Dtor | Inventory service | decomp/rename | med |
| 0x10048070 | 0x00048070 | RBTree_FindOrInsert_Variant | std::rb_tree helper | decomp/rename | low |
| 0x100480F0 | 0x000480F0 | CInventorySrv_Ctor | Inventory service | decomp/rename | med |
| 0x100481C0 | 0x000481C0 | CInventorySrv_SetRecentAction | Inventory service | decomp/rename | med |
| 0x10048300 | 0x00048300 | Key_Ctor | Gameplay object/handler | decomp/rename | med |
| 0x10048320 | 0x00048320 | Key_ReadProps | Gameplay object/handler | decomp/rename | med |
| 0x10048710 | 0x00048710 | LightGroup_Ctor | Gameplay object/handler | decomp/rename | med |
| 0x10048730 | 0x00048730 | LightGroup_SendUpdate | Gameplay object/handler | decomp/rename | med |
| 0x10048930 | 0x00048930 | LightGroup_InitFromName | Gameplay object/handler | decomp/rename | med |
| 0x10048990 | 0x00048990 | LightGroup_HandleCommandList | Gameplay object/handler | decomp/rename | med |
| 0x10048DB0 | 0x00048DB0 | LightGroup_OnMessage | Gameplay object/handler | decomp/rename | med |
| 0x10048DF0 | 0x00048DF0 | LightGroup_OnMessage_HandleId105 | Gameplay object/handler | decomp/rename | med |
| 0x10048E60 | 0x00048E60 | LightGroup_Create | Gameplay object/handler | decomp/rename | med |
| 0x10048ED0 | 0x00048ED0 | ActorList_Create | Object factory/helper | decomp/rename | low |
| 0x10048F40 | 0x00048F40 | ByteFlag_Create | Object factory/helper | decomp/rename | low |
| 0x10048FB0 | 0x00048FB0 | CInventorySrv_Create | Inventory service | decomp/rename | med |
| 0x10049020 | 0x00049020 | Create_Obj24_Sub4C100 | Object factory/helper | decomp/rename | low |
| 0x10049100 | 0x00049100 | ByteFlag_Create2 | Object factory/helper | decomp/rename | low |
| 0x10049170 | 0x00049170 | Create_Obj8_Sub70480 | Object factory/helper | decomp/rename | low |
| 0x100491E0 | 0x000491E0 | Create_Obj96_Sub78620 | Object factory/helper | decomp/rename | low |
| 0x10049250 | 0x00049250 | Create_Obj4_Sub7EEF0 | Object factory/helper | decomp/rename | low |
| 0x100492C0 | 0x000492C0 | Create_Obj4_Unknown104 | Object factory/helper | decomp/rename | low |
| 0x10049330 | 0x00049330 | ByteFlag_Create3 | Object factory/helper | decomp/rename | low |
| 0x10049410 | 0x00049410 | Create_Obj148_Sub6EA60 | Object factory/helper | decomp/rename | low |
| 0x10049AA0 | 0x00049AA0 | MineralSpawn_Ctor | Gameplay object/handler | decomp/rename | med |
| 0x10049B50 | 0x00049B50 | MineralSpawn_StopEffect | Gameplay object/handler | decomp/rename | med |
| 0x10049C90 | 0x00049C90 | MineralSpawn_OnMessage | Gameplay object/handler | decomp/rename | med |
| 0x10049DD0 | 0x00049DD0 | MineralSpawn_OnMessage_HandleId105 | Gameplay object/handler | decomp/rename | med |
| 0x10049F30 | 0x00049F30 | ObjId_IsValidAndNotEqual | Renamed during deobf | decomp/rename | low |
| 0x1004A100 | 0x0004A100 | Movement_GetStanceId | Movement/physics helper | decomp/rename | med |
| 0x1004A150 | 0x0004A150 | Movement_SetObjectRotationMatrix | Movement/physics helper | decomp/rename | med |
| 0x1004A180 | 0x0004A180 | Movement_GetMaxSpeed | Movement/physics helper | decomp/rename | med |
| 0x1004A1D0 | 0x0004A1D0 | Movement_SetHandleStateFunc | Movement/physics helper | decomp/rename | med |
| 0x1004A210 | 0x0004A210 | Movement_SetMaxSpeedFunc | Movement/physics helper | decomp/rename | med |
| 0x1004A2D0 | 0x0004A2D0 | Vec3_ScaleInPlace | Vector math | decomp/rename | low |
| 0x1004A300 | 0x0004A300 | Movement_InitBase | Movement/physics helper | decomp/rename | med |
| 0x1004A310 | 0x0004A310 | Movement_SetMoveVector | Movement/physics helper | decomp/rename | med |
| 0x1004A350 | 0x0004A350 | Movement_SetAccelVector | Movement/physics helper | decomp/rename | med |
| 0x1004A390 | 0x0004A390 | Movement_GetScaleVector | Movement/physics helper | decomp/rename | med |
| 0x1004A440 | 0x0004A440 | Movement_CalcMoveVector | Movement/physics helper | decomp/rename | med |
| 0x1004A7A0 | 0x0004A7A0 | Movement_UpdateVelocity | Movement/physics helper | decomp/rename | med |
| 0x1004AFD0 | 0x0004AFD0 | Movement_UpdateDims | Movement/physics helper | decomp/rename | med |
| 0x1004B270 | 0x0004B270 | Movement_TrySetDimsTo16 | Movement/physics helper | decomp/rename | med |
| 0x1004B2E0 | 0x0004B2E0 | Movement_SetScale | Movement/physics helper | decomp/rename | med |
| 0x1004B390 | 0x0004B390 | Movement_UpdateAccelFromRotation | Movement/physics helper | decomp/rename | med |
| 0x1004B790 | 0x0004B790 | Movement_UpdateRotationIfAllowed | Movement/physics helper | decomp/rename | med |
| 0x1004B7E0 | 0x0004B7E0 | Movement_SetDimsByType | Movement/physics helper | decomp/rename | med |
| 0x1004B850 | 0x0004B850 | Movement_Ctor | Movement/physics helper | decomp/rename | med |
| 0x1004B960 | 0x0004B960 | Movement_Update | Movement/physics helper | decomp/rename | med |
| 0x1004BB30 | 0x0004BB30 | Movement_UpdateDimsFromGlobals | Movement/physics helper | decomp/rename | med |
| 0x1004BB50 | 0x0004BB50 | Movement_SetObjectAndInit | Movement/physics helper | decomp/rename | med |
| 0x1004C100 | 0x0004C100 | SharedMemState_Init | Shared memory helper | decomp/rename | med |
| 0x1004C740 | 0x0004C740 | Packet_ID_WORLD_UPDATE_Ctor | Network/bitstream or packet helper | decomp/rename | med |
| 0x1004C810 | 0x0004C810 | Packet_ID_CHAT_Ctor | Network/bitstream or packet helper | decomp/rename | med |
| 0x1004CD30 | 0x0004CD30 | Vector_ThrowLengthError | std::vector helper | decomp/rename | low |
| 0x1004CDD0 | 0x0004CDD0 | Vector_ThrowLengthError_Alt1 | std::vector helper | decomp/rename | low |
| 0x1004CEF0 | 0x0004CEF0 | Vector_ThrowLengthError_Alt2 | std::vector helper | decomp/rename | low |
| 0x1004CF90 | 0x0004CF90 | Vector_ThrowLengthError_Alt3 | std::vector helper | decomp/rename | low |
| 0x1004D030 | 0x0004D030 | Vector_ThrowLengthError_Alt4 | std::vector helper | decomp/rename | low |
| 0x1004D0D0 | 0x0004D0D0 | Vector_ThrowLengthError_Alt5 | std::vector helper | decomp/rename | low |
| 0x1004D210 | 0x0004D210 | RBTree_MinNode_0 | std::rb_tree helper | decomp/rename | low |
| 0x1004D3A0 | 0x0004D3A0 | RBTree_MaxNode_0 | std::rb_tree helper | decomp/rename | low |
| 0x1004D600 | 0x0004D600 | Alloc_0x318Array | std::vector helper | decomp/rename | low |
| 0x1004D6C0 | 0x0004D6C0 | Alloc_0x54Array | std::vector helper | decomp/rename | low |
| 0x1004D720 | 0x0004D720 | Alloc_0xC4Array | std::vector helper | decomp/rename | low |
| 0x1004D820 | 0x0004D820 | BitStream_Read_u16c_signed | Network/bitstream or packet helper | decomp/rename | med |
| 0x1004DD40 | 0x0004DD40 | BitStream_Read4BitsToBools | Network/bitstream or packet helper | decomp/rename | med |
| 0x1004DF00 | 0x0004DF00 | Packet_ID_EXPLOSIVE_Ctor | Network/bitstream or packet helper | decomp/rename | med |
| 0x1004E340 | 0x0004E340 | RBTree_NextNode_Alt | std::rb_tree helper | decomp/rename | low |
| 0x1004E5C0 | 0x0004E5C0 | RBTree_RotateLeft_Alt | std::rb_tree helper | decomp/rename | low |
| 0x1004E620 | 0x0004E620 | RBTree_RotateRight_Alt | std::rb_tree helper | decomp/rename | low |
| 0x1004E6D0 | 0x0004E6D0 | RBTree_CreateNodeWithValue_Alt | std::rb_tree helper | decomp/rename | low |
| 0x1004E930 | 0x0004E930 | Dispatch_ToMgrIfValid | Renamed during deobf | decomp/rename | low |
| 0x1004E990 | 0x0004E990 | WorldObjects_ReadType508_Header | Struct/container helper | decomp/rename | low |
| 0x1004EA70 | 0x0004EA70 | WorldObjects_ReadType508_Entries | Struct/container helper | decomp/rename | low |
| 0x1004EB30 | 0x0004EB30 | WorldObjects_ReadType513_Header | Struct/container helper | decomp/rename | low |
| 0x1004EB90 | 0x0004EB90 | WorldObjects_ReadType513_Entries | Struct/container helper | decomp/rename | low |
| 0x1004F120 | 0x0004F120 | Packet_Read_U32c_U32c | Network/bitstream or packet helper | decomp/rename | med |
| 0x1004F160 | 0x0004F160 | Msg_Write_NetUpdateEntry_Empty | Network/bitstream or packet helper | decomp/rename | med |
| 0x1004F1B0 | 0x0004F1B0 | Packet_ID_HIT_Read | Network/bitstream or packet helper | decomp/rename | med |
| 0x1004F210 | 0x0004F210 | Msg_Write_U32c_2Bytes | Network/bitstream or packet helper | decomp/rename | med |
| 0x1004F270 | 0x0004F270 | Packet_ID_EXPLOSIVE_Read | Network/bitstream or packet helper | decomp/rename | med |
| 0x1004F470 | 0x0004F470 | Packet_ID_CHAT_Read | Network/bitstream or packet helper | decomp/rename | med |
| 0x1004F540 | 0x0004F540 | Msg_Write_Type_U32c_OptionalU32c_Strings | Network/bitstream or packet helper | decomp/rename | med |
| 0x1004F620 | 0x0004F620 | Packet_Read_Byte_U32c | Network/bitstream or packet helper | decomp/rename | med |
| 0x1004F670 | 0x0004F670 | Msg_Write_Byte_U32c | Network/bitstream or packet helper | decomp/rename | med |
| 0x1004F800 | 0x0004F800 | RBTree_DeleteSubtree_Alt2 | std::rb_tree helper | decomp/rename | low |
| 0x1004FAE0 | 0x0004FAE0 | RBTree_EraseNode_AltB | std::rb_tree helper | decomp/rename | low |
| 0x1004FDA0 | 0x0004FDA0 | RBTree_AllocNode_Alt | std::rb_tree helper | decomp/rename | low |
| 0x1004FE10 | 0x0004FE10 | RBTree_CopySubtree_Alt | std::rb_tree helper | decomp/rename | low |
| 0x10051240 | 0x00051240 | WorldObjects_HandleList28_ByType | Struct/container helper | decomp/rename | low |
| 0x100515C0 | 0x000515C0 | WorldObjects_HandleNPCList | Struct/container helper | decomp/rename | low |
| 0x10051AB0 | 0x00051AB0 | RBTree_EraseRange_Alt2 | std::rb_tree helper | decomp/rename | low |
| 0x10051BB0 | 0x00051BB0 | RBTree_CopyFrom_Alt | std::rb_tree helper | decomp/rename | low |
| 0x10051F90 | 0x00051F90 | Struct_Reset_Generic | Struct/container helper | decomp/rename | low |
| 0x100520C0 | 0x000520C0 | RBTree_CopyCtor_Alt | std::rb_tree helper | decomp/rename | low |
| 0x100521C0 | 0x000521C0 | Vector_EraseRange_0x1C_MoveTail | std::vector helper | decomp/rename | low |
| 0x100522D0 | 0x000522D0 | Vector_EraseRange_0x5C_MoveTail | std::vector helper | decomp/rename | low |
| 0x100523F0 | 0x000523F0 | WorldObjects_List792_CopyRangeBackward | Struct/container helper | decomp/rename | low |
| 0x10052470 | 0x00052470 | WorldObjects_List84_CopyRangeBackward | Struct/container helper | decomp/rename | low |
| 0x10052520 | 0x00052520 | WorldObjects_List792_DestroyEntry_0 | Struct/container helper | decomp/rename | low |
| 0x10052560 | 0x00052560 | WorldObjects_List84_DestroyEntry_0 | Struct/container helper | decomp/rename | low |
| 0x100526C0 | 0x000526C0 | WorldObjects_List792_CopyFrom | Struct/container helper | decomp/rename | low |
| 0x100526F0 | 0x000526F0 | WorldObjects_List84_CopyFrom | Struct/container helper | decomp/rename | low |
| 0x10052820 | 0x00052820 | WorldObjects_List792_AssignRange | Struct/container helper | decomp/rename | low |
| 0x100528A0 | 0x000528A0 | WorldObjects_List84_AssignRange | Struct/container helper | decomp/rename | low |
| 0x10052920 | 0x00052920 | Struct_Copy_RBTree_0x30C | Struct/container helper | decomp/rename | low |
| 0x10052990 | 0x00052990 | Struct_Copy_RBTree_0x48 | Struct/container helper | decomp/rename | low |
| 0x10052B40 | 0x00052B40 | Struct_Ctor_Generic | Struct/container helper | decomp/rename | low |
| 0x10052C00 | 0x00052C00 | Struct_Reset_RBTree_Alt | Struct/container helper | decomp/rename | low |
| 0x10052D50 | 0x00052D50 | List792_CopyRange_Helper | Struct/container helper | decomp/rename | low |
| 0x10052D90 | 0x00052D90 | List84_CopyRange_Helper | Struct/container helper | decomp/rename | low |
| 0x10052ED0 | 0x00052ED0 | WorldObjects_List792_DestroyEntry | Struct/container helper | decomp/rename | low |
| 0x10052F10 | 0x00052F10 | WorldObjects_List84_DestroyEntry | Struct/container helper | decomp/rename | low |
| 0x10052F50 | 0x00052F50 | List792_FillN_CleanupThrow | Struct/container helper | decomp/rename | low |
| 0x10053010 | 0x00053010 | List84_FillN_CleanupThrow | Struct/container helper | decomp/rename | low |
| 0x100530D0 | 0x000530D0 | WorldObjects_HandleList800_Type508 | Struct/container helper | decomp/rename | low |
| 0x100535D0 | 0x000535D0 | WorldObjects_HandleList92_Type513 | Struct/container helper | decomp/rename | low |
| 0x100539F0 | 0x000539F0 | WorldObjects_List792_CopyOrThrow | Struct/container helper | decomp/rename | low |
| 0x10053AA0 | 0x00053AA0 | WorldObjects_List84_CopyOrThrow | Struct/container helper | decomp/rename | low |
| 0x10053B50 | 0x00053B50 | WorldObjects_List792_Clear | Struct/container helper | decomp/rename | low |
| 0x10053BA0 | 0x00053BA0 | WorldObjects_List84_Clear | Struct/container helper | decomp/rename | low |
| 0x10053D50 | 0x00053D50 | LargeStructA_FillN_CleanupThrow_Alt | Struct/container helper | decomp/rename | low |
| 0x10053E00 | 0x00053E00 | WorldObjects_List792_CopyOrThrow_Wrap | Struct/container helper | decomp/rename | low |
| 0x10053E40 | 0x00053E40 | WorldObjects_List84_CopyOrThrow_Wrap | Struct/container helper | decomp/rename | low |
| 0x100540B0 | 0x000540B0 | List792_FillN_CleanupThrow_Wrap | Struct/container helper | decomp/rename | low |
| 0x100540E0 | 0x000540E0 | List84_FillN_CleanupThrow_Wrap | Struct/container helper | decomp/rename | low |
| 0x10054280 | 0x00054280 | Vector_Insert_0x318_Fill | std::vector helper | decomp/rename | low |
| 0x100545D0 | 0x000545D0 | Vector_Insert_0x54_Fill | std::vector helper | decomp/rename | low |
| 0x100548F0 | 0x000548F0 | Vector_Assign_LargeStructA_FromRange | std::vector helper | decomp/rename | low |
| 0x10054AE0 | 0x00054AE0 | WorldObjects_List792_AllocAt | Struct/container helper | decomp/rename | low |
| 0x10054B50 | 0x00054B50 | WorldObjects_List84_AllocAt | Struct/container helper | decomp/rename | low |
| 0x10054BD0 | 0x00054BD0 | Vector_Init_Empty_AltA | std::vector helper | decomp/rename | low |
| 0x10054C10 | 0x00054C10 | Vector_Init_Empty_AltB | std::vector helper | decomp/rename | low |
| 0x10054C50 | 0x00054C50 | WorldObjects_List792_Insert | Struct/container helper | decomp/rename | low |
| 0x10054CF0 | 0x00054CF0 | WorldObjects_List84_Insert | Struct/container helper | decomp/rename | low |
| 0x10054D80 | 0x00054D80 | LargeStructC_CopyFrom | Struct/container helper | decomp/rename | low |
| 0x10054E80 | 0x00054E80 | LargeStructC_CopyCtor | Struct/container helper | decomp/rename | low |
| 0x10054F00 | 0x00054F00 | WorldObjects_ReadList_Type508 | Struct/container helper | decomp/rename | low |
| 0x10055090 | 0x00055090 | WorldObjects_ReadList_Type513 | Struct/container helper | decomp/rename | low |
| 0x100551D0 | 0x000551D0 | LargeStructC_CopyRangeBackward | Struct/container helper | decomp/rename | low |
| 0x10055290 | 0x00055290 | LargeStructC_ClearVector | Struct/container helper | decomp/rename | low |
| 0x100552B0 | 0x000552B0 | LargeStructC_CopyRange_CleanupThrow | Struct/container helper | decomp/rename | low |
| 0x10055360 | 0x00055360 | LargeStructC_CopyRange | Struct/container helper | decomp/rename | low |
| 0x10055390 | 0x00055390 | LargeStructC_CopyRange_Helper | Struct/container helper | decomp/rename | low |
| 0x100553C0 | 0x000553C0 | LargeStructC_FillN_CleanupThrow | Struct/container helper | decomp/rename | low |
| 0x10055470 | 0x00055470 | LargeStructC_ClearVectorRange | Struct/container helper | decomp/rename | low |
| 0x10055590 | 0x00055590 | LargeStructC_FillN_CleanupThrow_Wrap | Struct/container helper | decomp/rename | low |
| 0x10055670 | 0x00055670 | LargeStructC_CopyRange_CleanupThrow_Wrap | Struct/container helper | decomp/rename | low |
| 0x100556F0 | 0x000556F0 | Vector_Insert_0xC4_Fill | std::vector helper | decomp/rename | low |
| 0x10055A90 | 0x00055A90 | Packet_ID_WORLD_OBJECTS_Dtor | Network/bitstream or packet helper | decomp/rename | med |
| 0x10055CE0 | 0x00055CE0 | WorldObjects_List196_AllocAt | Struct/container helper | decomp/rename | low |
| 0x10055D50 | 0x00055D50 | Packet_ID_WORLD_OBJECTS_Ctor | Network/bitstream or packet helper | decomp/rename | med |
| 0x10055F80 | 0x00055F80 | Msg_Write_Entry_0x30C | Network/bitstream or packet helper | decomp/rename | med |
| 0x100560A0 | 0x000560A0 | Msg_Write_Entry_0x48 | Network/bitstream or packet helper | decomp/rename | med |
| 0x10056180 | 0x00056180 | Msg_Write_List792_Entry | Network/bitstream or packet helper | decomp/rename | med |
| 0x10056280 | 0x00056280 | Msg_Write_List_0x318 | Network/bitstream or packet helper | decomp/rename | med |
| 0x10056310 | 0x00056310 | Msg_Write_List84_Entry | Network/bitstream or packet helper | decomp/rename | med |
| 0x10056410 | 0x00056410 | Msg_Write_List_0x54 | Network/bitstream or packet helper | decomp/rename | med |
| 0x10056490 | 0x00056490 | Msg_Write_List_0xC4 | Network/bitstream or packet helper | decomp/rename | med |
| 0x10056530 | 0x00056530 | Msg_Write_Subtype_Switch | Network/bitstream or packet helper | decomp/rename | med |
| 0x10056750 | 0x00056750 | WorldObjects_List196_Insert | Struct/container helper | decomp/rename | low |
| 0x100567E0 | 0x000567E0 | WorldObjects_ReadList_NPC | Struct/container helper | decomp/rename | low |
| 0x100568D0 | 0x000568D0 | Packet_ID_WORLD_OBJECTS_Read | Network/bitstream or packet helper | decomp/rename | med |
| 0x10057060 | 0x00057060 | Vtable_Call0 | Renamed during deobf | decomp/rename | low |
| 0x10057070 | 0x00057070 | Brush_ReadProps_SetDefaultName_Wrap | Brush/prop helper | decomp/rename | low |
| 0x10057090 | 0x00057090 | CNPC_ApplyFxFlags | NPC | decomp/rename | med |
| 0x10057120 | 0x00057120 | Obj_UpdateTimer_PlaySound | Renamed during deobf | decomp/rename | low |
| 0x10057220 | 0x00057220 | LTServer_GetObjectType | LithTech server API helper | decomp/rename | low |
| 0x10057280 | 0x00057280 | Vector_ThrowLengthError_Alt6 | std::vector helper | decomp/rename | low |
| 0x10057360 | 0x00057360 | Alloc_0x8Array | std::vector helper | decomp/rename | low |
| 0x10057490 | 0x00057490 | FxSlot_TryStartRandom | FX slot helper | decomp/rename | low |
| 0x10057680 | 0x00057680 | CNPC_UpdateFxSlotName | NPC | decomp/rename | med |
| 0x10057700 | 0x00057700 | CNPC_OnMessage_Command | NPC | decomp/rename | med |
| 0x10057C80 | 0x00057C80 | ClientObj_OnMessageDispatch_HandleMode | Client object handler | decomp/rename | med |
| 0x10057D40 | 0x00057D40 | ClientObj_SendMsg_117 | Client object handler | decomp/rename | med |
| 0x10057E70 | 0x00057E70 | ClientObj_UpdateScaleFromNet | Client object handler | decomp/rename | med |
| 0x10058130 | 0x00058130 | CNPC_Dtor | NPC | decomp/rename | med |
| 0x10058280 | 0x00058280 | CNPC_Ctor | NPC | decomp/rename | med |
| 0x10058360 | 0x00058360 | CNPC_ReadProps | NPC | decomp/rename | med |
| 0x100588D0 | 0x000588D0 | CNPC_Create | NPC | decomp/rename | med |
| 0x10058920 | 0x00058920 | Packet_ID_NPC_Ctor | Network/bitstream or packet helper | decomp/rename | med |
| 0x10058B40 | 0x00058B40 | FillN_0x8_0 | std::vector helper | decomp/rename | low |
| 0x10058BC0 | 0x00058BC0 | CopyRange_0x8 | std::vector helper | decomp/rename | low |
| 0x10058BF0 | 0x00058BF0 | Msg_Write_List8_Entry | Network/bitstream or packet helper | decomp/rename | med |
| 0x10058C70 | 0x00058C70 | Msg_Read_List8_Entry | Network/bitstream or packet helper | decomp/rename | med |
| 0x10058CE0 | 0x00058CE0 | Msg_Write_List_0x8 | Network/bitstream or packet helper | decomp/rename | med |
| 0x10058D80 | 0x00058D80 | CopyRangeBackward_0x8 | std::vector helper | decomp/rename | low |
| 0x10058DB0 | 0x00058DB0 | FillN_0x8_Alt | std::vector helper | decomp/rename | low |
| 0x10058E70 | 0x00058E70 | Packet_ID_NPC_Write | Network/bitstream or packet helper | decomp/rename | med |
| 0x10058FE0 | 0x00058FE0 | Vector_Insert_0x8_Fill_Helper | std::vector helper | decomp/rename | low |
| 0x10059050 | 0x00059050 | CopyRange_0x8_Wrap | std::vector helper | decomp/rename | low |
| 0x10059080 | 0x00059080 | Vector_Insert_0x8_Fill | std::vector helper | decomp/rename | low |
| 0x10059370 | 0x00059370 | Msg_Read_List_0x8 | Network/bitstream or packet helper | decomp/rename | med |
| 0x10059420 | 0x00059420 | Packet_ID_NPC_Dtor | Network/bitstream or packet helper | decomp/rename | med |
| 0x10059500 | 0x00059500 | CNPC_OnMessage | NPC | decomp/rename | med |
| 0x100596B0 | 0x000596B0 | Packet_ID_NPC_Read | Network/bitstream or packet helper | decomp/rename | med |
| 0x10059820 | 0x00059820 | Vtable_Call0_Alt | Renamed during deobf | decomp/rename | low |
| 0x100599F0 | 0x000599F0 | Plant_Ctor | Plant/prop | decomp/rename | med |
| 0x10059A80 | 0x00059A80 | Prop_ReadSeasonFromTokens | Prop handler | decomp/rename | med |
| 0x10059B70 | 0x00059B70 | Plant_ReadSkinsAndRenderStyles | Plant/prop | decomp/rename | med |
| 0x10059C50 | 0x00059C50 | Prop_OnMessage_TypeHandler | Prop handler | decomp/rename | med |
| 0x10059CD0 | 0x00059CD0 | Plant_ReadProps | Plant/prop | decomp/rename | med |
| 0x10059FD0 | 0x00059FD0 | CPlantMgrPlugin_Create | Plant/prop | decomp/rename | med |
| 0x1005A7B0 | 0x0005A7B0 | Vtable_Call0_Alt2 | Renamed during deobf | decomp/rename | low |
| 0x1005A900 | 0x0005A900 | NPC_ResetSpawnTimer | NPC | decomp/rename | med |
| 0x1005A990 | 0x0005A990 | NPC_SetPrimaryItem | NPC | decomp/rename | med |
| 0x1005A9F0 | 0x0005A9F0 | NPC_EnsureCountersInitialized | NPC | decomp/rename | med |
| 0x1005AA30 | 0x0005AA30 | NPC_ResetCounters | NPC | decomp/rename | med |
| 0x1005AA90 | 0x0005AA90 | SharedMem_SetVortexActive | Shared memory helper | decomp/rename | med |
| 0x1005AB30 | 0x0005AB30 | NPC_TickVortexTimer | NPC | decomp/rename | med |
| 0x1005AC30 | 0x0005AC30 | Packet_ID_CHECK_MAIL_Ctor | Network/bitstream or packet helper | decomp/rename | med |
| 0x1005ADA0 | 0x0005ADA0 | Vector_ThrowLengthError_Alt7 | std::vector helper | decomp/rename | low |
| 0x1005AE50 | 0x0005AE50 | Vector_ThrowLengthError_Alt8 | std::vector helper | decomp/rename | low |
| 0x1005B120 | 0x0005B120 | SharedMem_WriteBlock_126515_0x7C | Shared memory helper | decomp/rename | med |
| 0x1005B1E0 | 0x0005B1E0 | NPC_OnMessage | NPC | decomp/rename | med |
| 0x1005B270 | 0x0005B270 | NPC_InitWelcomeVoice | NPC | decomp/rename | med |
| 0x1005B530 | 0x0005B530 | NPC_CollectNearbyActors_SetFlag2000 | NPC | decomp/rename | med |
| 0x1005B880 | 0x0005B880 | NPC_UpdateFadeAndFX | NPC | decomp/rename | med |
| 0x1005BAD0 | 0x0005BAD0 | Packet_ID_NOTIFY_Ctor | Network/bitstream or packet helper | decomp/rename | med |
| 0x1005BBA0 | 0x0005BBA0 | Packet_ID_AVATAR_CHANGE_Ctor | Network/bitstream or packet helper | decomp/rename | med |
| 0x1005C1D0 | 0x0005C1D0 | NPC_UpdateOrientationFromSharedTable | NPC | decomp/rename | med |
| 0x1005D1D0 | 0x0005D1D0 | NPC_HandleSharedMemFlags_A | NPC | decomp/rename | med |
| 0x1005D5C0 | 0x0005D5C0 | NPC_HandleSharedMemFlags_B | NPC | decomp/rename | med |
| 0x1005DA20 | 0x0005DA20 | Packet_ID_NOTIFY_Read | Network/bitstream or packet helper | decomp/rename | med |
| 0x1005DB40 | 0x0005DB40 | Packet_ID_NOTIFY_Write | Network/bitstream or packet helper | decomp/rename | med |
| 0x1005DCD0 | 0x0005DCD0 | Packet_Read_2xU32c_Byte_U32c | Network/bitstream or packet helper | decomp/rename | med |
| 0x1005DD30 | 0x0005DD30 | Packet_Write_2xU32c_Byte_U32c | Network/bitstream or packet helper | decomp/rename | med |
| 0x1005DD90 | 0x0005DD90 | Packet_Read_U32c_ProfileBlockC | Network/bitstream or packet helper | decomp/rename | med |
| 0x1005DDD0 | 0x0005DDD0 | Packet_Write_U32c_ProfileBlockC | Network/bitstream or packet helper | decomp/rename | med |
| 0x1005DFF0 | 0x0005DFF0 | Packet_ID_UNKNOWN_Create | Network/bitstream or packet helper | decomp/rename | med |
| 0x10062260 | 0x00062260 | Packet_ID_ATTRIBUTE_CHANGE_Ctor | Network/bitstream or packet helper | decomp/rename | med |
| 0x100622C0 | 0x000622C0 | Packet_ID_ATTRIBUTE_CHANGE_Read | Network/bitstream or packet helper | decomp/rename | med |
| 0x1006D790 | 0x0006D790 | LTServer_IsLineOfSightClear | LithTech server API helper | decomp/rename | low |
| 0x1007A850 | 0x0007A850 | Packet_ID_WORLD_LOGIN_DATA_Ctor | Network/bitstream or packet helper | decomp/rename | med |
| 0x100854F0 | 0x000854F0 | Packet_ID_WEATHER_Ctor | Network/bitstream or packet helper | decomp/rename | med |
| 0x1008B550 | 0x0008B550 | BitStream_WriteBit0 | Network/bitstream or packet helper | decomp/rename | med |
| 0x1008B590 | 0x0008B590 | BitStream_WriteBit1 | Network/bitstream or packet helper | decomp/rename | med |
| 0x1008B610 | 0x0008B610 | BitStream_ReadBit | Network/bitstream or packet helper | decomp/rename | med |
| 0x1008B940 | 0x0008B940 | BitStream_WriteBits | Network/bitstream or packet helper | decomp/rename | med |
| 0x1008BA90 | 0x0008BA90 | BitStream_WriteCompressed | Network/bitstream or packet helper | decomp/rename | med |
| 0x1008BBB0 | 0x0008BBB0 | BitStream_ReadBits | Network/bitstream or packet helper | decomp/rename | med |
| 0x1008BD20 | 0x0008BD20 | BitStream_ReadCompressed | Network/bitstream or packet helper | decomp/rename | med |
| 0x100DBB10 | 0x000DBB10 | WorldObjects_List28_GetEntry | Struct/container helper | decomp/rename | low |
| 0x100DBC40 | 0x000DBC40 | WorldObjects_List28_Copy | Struct/container helper | decomp/rename | low |
| 0x100DC190 | 0x000DC190 | WorldObjects_List28_Insert | Struct/container helper | decomp/rename | low |
| 0x100DC250 | 0x000DC250 | WorldObjects_ReadList28 | Struct/container helper | decomp/rename | low |
| 0x100DFCB0 | 0x000DFCB0 | BitStream_Read_u32c_into | Network/bitstream or packet helper | decomp/rename | med |
| 0x100E0700 | 0x000E0700 | WorldObjects_Type508_MapInsert_Internal | Struct/container helper | decomp/rename | low |
| 0x100E07C0 | 0x000E07C0 | WorldObjects_Type508_MapLowerBound | Struct/container helper | decomp/rename | low |
| 0x100E08A0 | 0x000E08A0 | WorldObjects_Type508_MapInsert | Struct/container helper | decomp/rename | low |
| 0x100E1740 | 0x000E1740 | WorldObjects_Type513_MapInsert | Struct/container helper | decomp/rename | low |
| 0x100EE8F0 | 0x000EE8F0 | Packet_ID_WEATHER_ReadU32Pair | Network/bitstream or packet helper | decomp/rename | med |
| 0x1000A7A0 | 0x0000A7A0 | SharedMem_MemsetByIdx | Shared memory helper | decomp/rename | med |
| 0x1007C6C0 | 0x0007C6C0 | SharedMem_Write_0x1EA45 | Shared memory helper | decomp/rename | med |
| 0x1007C8A0 | 0x0007C8A0 | TripLaser_TargetListHasValid | Gameplay helper | decomp/rename | med |
| 0x1007C8E0 | 0x0007C8E0 | TripLaser_HasAnyValidTarget | Gameplay helper | decomp/rename | med |
| 0x100C9A20 | 0x000C9A20 | TargetList_HasValidTarget | Gameplay helper | decomp/rename | med |
| 0x1007FA60 | 0x0007FA60 | SharedMem_WriteRandomSlot_Default | Shared memory helper | decomp/rename | med |
| 0x1007FAB0 | 0x0007FAB0 | SharedMemBuffer_InitType | Shared memory helper | decomp/rename | med |
| 0x100801B0 | 0x000801B0 | SharedMem_InitPools | Shared memory helper | decomp/rename | med |
| 0x1007FE10 | 0x0007FE10 | SharedMem_SendNotify | Shared memory helper | decomp/rename | med |
| 0x1007FEE0 | 0x0007FEE0 | SharedMem_CheckAndNotify | Shared memory helper | decomp/rename | med |
| 0x1007F1F0 | 0x0007F1F0 | SharedMemBuffer_IsEqual | Shared memory helper | decomp/rename | med |
| 0x1007F8B0 | 0x0007F8B0 | SharedMemBuffer_Shutdown | Shared memory helper | decomp/rename | med |
| 0x10080850 | 0x00080850 | VolumeBrush_Ctor | World/volume object | decomp/rename | med |
| 0x10080B90 | 0x00080B90 | VolumeBrush_New | World/volume object | decomp/rename | med |
| 0x100805D0 | 0x000805D0 | VolumeBrush_Dtor | World/volume object | decomp/rename | med |
| 0x10080BE0 | 0x00080BE0 | VolumeBrush_ReadProps | World/volume object | decomp/rename | med |
| 0x10080EC0 | 0x00080EC0 | VolumeBrush_OnInitialUpdate | World/volume object | decomp/rename | med |
| 0x10081140 | 0x00081140 | VolumeBrush_OnMessage | World/volume object | decomp/rename | med |
| 0x10080640 | 0x00080640 | VolumeBrush_TurnOn | World/volume object | decomp/rename | med |
| 0x10080690 | 0x00080690 | VolumeBrush_TurnOff | World/volume object | decomp/rename | med |
| 0x100812A0 | 0x000812A0 | VisibilityArea_Ctor | World/visibility object | decomp/rename | med |
| 0x10081880 | 0x00081880 | VisibilityArea_New | World/visibility object | decomp/rename | med |
| 0x10081320 | 0x00081320 | VisibilityArea_Dtor | World/visibility object | decomp/rename | med |
| 0x100818D0 | 0x000818D0 | VisibilityArea_ReadProps | World/visibility object | decomp/rename | med |
| 0x10081A60 | 0x00081A60 | VisibilityArea_WriteCreate | World/visibility object | decomp/rename | med |
| 0x100814B0 | 0x000814B0 | VisibilityArea_AddLinkedArea | World/visibility object | decomp/rename | med |
| 0x10081480 | 0x00081480 | VisibilityArea_HasLinkedArea | World/visibility object | decomp/rename | med |
| 0x10009220 | 0x00009220 | VisibilityArea_Create_WriteToMsg | World/visibility object | decomp/rename | med |
| 0x10081B10 | 0x00081B10 | Weather_Ctor | World/weather object | decomp/rename | med |
| 0x10081B90 | 0x00081B90 | Weather_WriteCreate | World/weather object | decomp/rename | med |
| 0x10081E40 | 0x00081E40 | Weather_OnCommand | World/weather object | decomp/rename | med |
| 0x10081C10 | 0x00081C10 | Weather_TriggerLightning | World/weather object | decomp/rename | med |
| 0x10085F30 | 0x00085F30 | Weather_Update | World/weather object | decomp/rename | med |
| 0x100859A0 | 0x000859A0 | Weather_Init | World/weather object | decomp/rename | med |
| 0x100855B0 | 0x000855B0 | Weather_UpdateTimeOfDay | World/weather object | decomp/rename | med |
| 0x100853D0 | 0x000853D0 | Weather_GetDayPhase | World/weather object | decomp/rename | med |
| 0x100856E0 | 0x000856E0 | Weather_CalcDayAlpha | World/weather object | decomp/rename | med |
| 0x10085290 | 0x00085290 | Weather_SetLightGroupBrightness | World/weather object | decomp/rename | med |
| 0x10085310 | 0x00085310 | Weather_UpdateMood | World/weather object | decomp/rename | med |
| 0x10082980 | 0x00082980 | VortexVolume_Ctor | World/vortex object | decomp/rename | med |
| 0x10082C60 | 0x00082C60 | VortexVolume_New | World/vortex object | decomp/rename | med |
| 0x10084390 | 0x00084390 | VortexVolume_OnMessage_Client | World/vortex object | decomp/rename | med |
| 0x10084170 | 0x00084170 | Packet_ID_VORTEX_GATE_Ctor | Packet/bitstream helper | decomp/rename | med |
| 0x10084240 | 0x00084240 | Packet_ID_VORTEX_GATE_Read | Packet/bitstream helper | decomp/rename | med |
| 0x10082CB0 | 0x00082CB0 | Packet_ID_VORTEX_GATE_Write | Packet/bitstream helper | decomp/rename | med |
| 0x10084060 | 0x00084060 | Packet_ID_VORTEX_GATE_Dtor | Packet/bitstream helper | decomp/rename | med |
| 0x10084120 | 0x00084120 | Packet_ID_VORTEX_GATE_VectorInit | Packet/bitstream helper | decomp/rename | med |
| 0x10087190 | 0x00087190 | WorldProperties_Ctor | World properties object | decomp/rename | med |
| 0x10086E40 | 0x00086E40 | WorldProperties_Dtor | World properties object | decomp/rename | med |
| 0x100870A0 | 0x000870A0 | WorldProperties_OnMessage | World properties object | decomp/rename | med |
| 0x100871B0 | 0x000871B0 | WorldProperties_ReadProps | World properties object | decomp/rename | med |
| 0x10086DE0 | 0x00086DE0 | GlobalSoundFilter_OnProperty | World audio property | decomp/rename | med |
| 0x100887B0 | 0x000887B0 | WorldServiceObject_Ctor | World service object | decomp/rename | med |
| 0x10088860 | 0x00088860 | WorldServiceObject_Dtor | World service object | decomp/rename | med |
| 0x10088AE0 | 0x00088AE0 | WorldServiceObject_New | World service object | decomp/rename | med |
| 0x10089400 | 0x00089400 | WorldServiceObject_ReadProps | World service object | decomp/rename | med |
| 0x10089890 | 0x00089890 | WorldServiceSubObject_Ctor | World service object | decomp/rename | med |
| 0x10089910 | 0x00089910 | WorldServiceSubObject_Dtor | World service object | decomp/rename | med |
| 0x10089BA0 | 0x00089BA0 | WorldServiceSubObject_New | World service object | decomp/rename | med |
| 0x10089D10 | 0x00089D10 | WorldServiceSubObject_OnMessage | World service object | decomp/rename | med |
| 0x10088C00 | 0x00088C00 | WorldServiceSubObject_AddLinked | World service object | decomp/rename | med |
| 0x10089CC0 | 0x00089CC0 | WorldServiceSubObject_AddDest | World service object | decomp/rename | med |
| 0x10088C90 | 0x00088C90 | Preset_FindByName | World service preset | decomp/rename | med |
| 0x10088D00 | 0x00088D00 | Preset_EnumNames | World service preset | decomp/rename | med |
| 0x10089EE0 | 0x00089EE0 | SubObjectPreset_FindByName | World service preset | decomp/rename | med |
| 0x10089F90 | 0x00089F90 | SubObjectPreset_EnumNames | World service preset | decomp/rename | med |
| 0x10088D80 | 0x00088D80 | Preset_GetClientFilename | World service preset | decomp/rename | med |
| 0x1008A010 | 0x0008A010 | SubObjectPreset_GetClientFilename | World service preset | decomp/rename | med |
| 0x1004F360 | 0x0004F360 | Packet_ID_EXPLOSIVE_Write | Packet/bitstream helper | decomp/rename | med |
| 0x10084CA0 | 0x00084CA0 | SendExplosivePacket_FromImpact | Packet/bitstream helper | decomp/rename | med |
| 0x10084BC0 | 0x00084BC0 | ImpactPacket_FillLocalPlayerPos | Packet/bitstream helper | decomp/rename | med |
| 0x10084AD0 | 0x00084AD0 | ImpactPacket_FillLocalPlayerPos_Inc | Packet/bitstream helper | decomp/rename | med |
| 0x100858C0 | 0x000858C0 | Packet_ID_WEATHER_Read | Packet/bitstream helper | decomp/rename | med |
| 0x100858F0 | 0x000858F0 | Packet_ID_WEATHER_Write | Packet/bitstream helper | decomp/rename | med |
| 0x1008D2C0 | 0x0008D2C0 | CStr_Ctor | String utility | decomp/rename | med |
| 0x1008D420 | 0x0008D420 | CStr_AssignRef | String utility | decomp/rename | med |
| 0x1008D4A0 | 0x0008D4A0 | CStr_Release | String utility | decomp/rename | med |
| 0x1008D4C0 | 0x0008D4C0 | CStr_AssignRef_Release | String utility | decomp/rename | med |
| 0x1008D690 | 0x0008D690 | CStr_Append | String utility | decomp/rename | med |
| 0x1008DE90 | 0x0008DE90 | CStr_Length | String utility | decomp/rename | med |
| 0x1008E4A0 | 0x0008E4A0 | CStr_UrlEncode | String utility | decomp/rename | med |
| 0x1008E620 | 0x0008E620 | CStr_UrlDecode | String utility | decomp/rename | med |
| 0x1008D3C0 | 0x0008D3C0 | CStr_Format | String utility | decomp/rename | med |
| 0x1008EE80 | 0x0008EE80 | CStr_AssignCStr | String utility | decomp/rename | med |
| 0x1008D540 | 0x0008D540 | CStr_SetCStr | String utility | decomp/rename | med |
| 0x1008EF60 | 0x0008EF60 | CStr_ClearOrDetach | String utility | decomp/rename | med |
| 0x1008EFD0 | 0x0008EFD0 | CStr_ReleaseRef | String utility | decomp/rename | med |
| 0x1008F150 | 0x0008F150 | CStr_CStr | String utility | decomp/rename | med |
| 0x1008E220 | 0x0008E220 | CStr_EqualsOrWildcard | String utility | decomp/rename | med |
| 0x1008ED40 | 0x0008ED40 | RakString_Allocate | RakNet string utility | decomp/rename | med |
| 0x1008D5C0 | 0x0008D5C0 | RakString_EnsureCapacity | RakNet string utility | decomp/rename | med |
| 0x1008F120 | 0x0008F120 | RakString_CalcCapacity | RakNet string utility | decomp/rename | med |
| 0x1008F100 | 0x0008F100 | RakString_Lock | RakNet string utility | decomp/rename | med |
| 0x1008F110 | 0x0008F110 | RakString_Unlock | RakNet string utility | decomp/rename | med |
| 0x1008F470 | 0x0008F470 | RakString_CreateInternal | RakNet string utility | decomp/rename | med |
| 0x10091150 | 0x00091150 | OrderedList_Init | RakNet container | decomp/rename | med |
| 0x10091180 | 0x00091180 | OrderedList_Free | RakNet container | decomp/rename | med |
| 0x100911B0 | 0x000911B0 | OrderedList_GetPtr | RakNet container | decomp/rename | med |
| 0x100911D0 | 0x000911D0 | OrderedList_PushBack | RakNet container | decomp/rename | med |
| 0x100912C0 | 0x000912C0 | OrderedList_InsertAt | RakNet container | decomp/rename | med |
| 0x10091110 | 0x00091110 | OrderedList_GetSize | RakNet container | decomp/rename | med |
| 0x10090F90 | 0x00090F90 | OrderedList_FindIndex | RakNet container | decomp/rename | med |
| 0x10091060 | 0x00091060 | OrderedList_Insert | RakNet container | decomp/rename | med |
| 0x100910F0 | 0x000910F0 | OrderedList_GetElement | RakNet container | decomp/rename | med |
| 0x10091500 | 0x00091500 | OrderedList_Alloc | RakNet container | decomp/rename | med |
| 0x100914A0 | 0x000914A0 | OrderedList_FreeStorage | RakNet container | decomp/rename | med |
| 0x10090520 | 0x00090520 | StringCompressor_Ctor | RakNet string compression | decomp/rename | med |
| 0x100906B0 | 0x000906B0 | StringCompressor_Dtor | RakNet string compression | decomp/rename | med |
| 0x10090A10 | 0x00090A10 | StringCompressor_InitStats | RakNet string compression | decomp/rename | med |
| 0x10090A70 | 0x00090A70 | StringCompressor_BaseCtor | RakNet string compression | decomp/rename | med |
| 0x10090A90 | 0x00090A90 | StringCompressor_BaseDtor | RakNet string compression | decomp/rename | med |
| 0x10090B70 | 0x00090B70 | StringCompressor_InsertEntry | RakNet string compression | decomp/rename | med |
| 0x10090C90 | 0x00090C90 | StringCompressor_GetEntryData | RakNet string compression | decomp/rename | med |
| 0x10090C30 | 0x00090C30 | StringCompressor_HasOrInsert | RakNet string compression | decomp/rename | med |
| 0x10090AE0 | 0x00090AE0 | StringCompressor_GetOrInsert | RakNet string compression | decomp/rename | med |
| 0x10090CB0 | 0x00090CB0 | StringCompressor_GetCount | RakNet string compression | decomp/rename | med |
| 0x10090CD0 | 0x00090CD0 | StringCompressor_New | RakNet string compression | decomp/rename | med |
| 0x100904A0 | 0x000904A0 | StringCompressor_AddRef | RakNet string compression | decomp/rename | med |
| 0x100904D0 | 0x000904D0 | StringCompressor_Release | RakNet string compression | decomp/rename | med |
| 0x10090E50 | 0x00090E50 | StringCompressor_Delete | RakNet string compression | decomp/rename | med |
| 0x10090D60 | 0x00090D60 | StringCompressor_Free | RakNet string compression | decomp/rename | med |
| 0x10090D90 | 0x00090D90 | HuffmanTable_New | RakNet Huffman table | decomp/rename | med |
| 0x10090E20 | 0x00090E20 | HuffmanTable_Free | RakNet Huffman table | decomp/rename | med |
| 0x10090E80 | 0x00090E80 | HuffmanTable_Dtor | RakNet Huffman table | decomp/rename | med |
| 0x10090510 | 0x00090510 | StringCompressor_GetInstance | RakNet string compression | decomp/rename | med |
| 0x10090860 | 0x00090860 | StringCompressor_DecodeString | RakNet string compression | decomp/rename | med |
| 0x1008B020 | 0x0008B020 | BitStream_InitFromBuffer | RakNet BitStream | decomp/rename | med |
| 0x1008B100 | 0x0008B100 | BitStream_Shutdown | RakNet BitStream | decomp/rename | med |
| 0x1008BE50 | 0x0008BE50 | BitStream_ReserveBits | RakNet BitStream | decomp/rename | med |
| 0x1004DB70 | 0x0004DB70 | BitStream_GetBitCount | RakNet BitStream | decomp/rename | med |
| 0x1008C4D0 | 0x0008C4D0 | BitStream_GetByteCount | RakNet BitStream | decomp/rename | med |
| 0x1004E790 | 0x0004E790 | BitStream_Write_u16c_into_2 | RakNet BitStream | decomp/rename | med |
| 0x10014C60 | 0x00014C60 | BitStream_Write_u8 | RakNet BitStream | decomp/rename | med |
| 0x10014EE0 | 0x00014EE0 | BitStream_Write_u8c | RakNet BitStream | decomp/rename | med |
| 0x1008AFA0 | 0x0008AFA0 | BitStream_Ctor | RakNet BitStream | decomp/rename | med |
| 0x1008B160 | 0x0008B160 | BitStream_WriteBytes | RakNet BitStream | decomp/rename | med |
| 0x1008B660 | 0x0008B660 | BitStream_WriteAlignedBytes | RakNet BitStream | decomp/rename | med |
| 0x1008B8C0 | 0x0008B8C0 | BitStream_AlignWriteToByteBoundary | RakNet BitStream | decomp/rename | med |
| 0x1008B140 | 0x0008B140 | BitStream_Reset | RakNet BitStream | decomp/rename | med |
| 0x1008C220 | 0x0008C220 | BitStream_IgnoreBits | RakNet BitStream | decomp/rename | med |
| 0x1008C240 | 0x0008C240 | BitStream_IgnoreBytes | RakNet BitStream | decomp/rename | med |
| 0x1008C4B0 | 0x0008C4B0 | BitStream_GetBitsUnread | RakNet BitStream | decomp/rename | med |
| 0x10016430 | 0x00016430 | BitStream_Read_u8c | RakNet BitStream | decomp/rename | med |
| 0x1008C6D0 | 0x0008C6D0 | NetAddr_NotEqualsShort | RakNet address | decomp/rename | med |
| 0x1008CAB0 | 0x0008CAB0 | PlayerID_Equals | RakNet address | decomp/rename | med |
| 0x1008C8D0 | 0x0008C8D0 | NetAddr_FromString | RakNet address | decomp/rename | med |
| 0x1008CDE0 | 0x0008CDE0 | RakNetGUID_NotEquals | RakNet GUID | decomp/rename | med |
| 0x1008C760 | 0x0008C760 | NetAddr_LessThanShort | RakNet address | decomp/rename | med |
| 0x100916A0 | 0x000916A0 | NetAddr_CompareShort | RakNet address | decomp/rename | med |
| 0x1008C8A0 | 0x0008C8A0 | NetAddr_SetIPPort | RakNet address | decomp/rename | med |
| 0x1008C7B0 | 0x0008C7B0 | NetAddr_ToString | RakNet address | decomp/rename | med |
| 0x100917A0 | 0x000917A0 | RakPeer_Ctor | RakNet/RakPeer | decomp/rename | med |
| 0x10091B50 | 0x00091B50 | RakPeer_Dtor | RakNet/RakPeer | decomp/rename | med |
| 0x10091D10 | 0x00091D10 | RakPeer_Startup | RakNet/RakPeer | decomp/rename | med |
| 0x100929F0 | 0x000929F0 | RakPeer_Shutdown | RakNet/RakPeer | decomp/rename | med |
| 0x10093370 | 0x00093370 | RakPeer_Receive | RakNet/RakPeer | decomp/rename | med |
| 0x10092D70 | 0x00092D70 | RakPeer_GetConnectionList | RakNet/RakPeer | decomp/rename | med |
| 0x10092ED0 | 0x00092ED0 | RakPeer_Send | RakNet/RakPeer | decomp/rename | med |
| 0x10093020 | 0x00093020 | RakPeer_SendRawPacket | RakNet/RakPeer | decomp/rename | med |
| 0x100930C0 | 0x000930C0 | RakPeer_SendBitStream | RakNet/RakPeer | decomp/rename | med |
| 0x10093220 | 0x00093220 | RakPeer_SendRaw | RakNet/RakPeer | decomp/rename | med |
| 0x100932D0 | 0x000932D0 | RakPeer_HandleDisconnectMessages | RakNet/RakPeer | decomp/rename | med |
| 0x100922F0 | 0x000922F0 | RakPeer_SetSecurity | RakNet/RakPeer | decomp/rename | med |
| 0x100923D0 | 0x000923D0 | RakPeer_ClearSecurity | RakNet/RakPeer | decomp/rename | med |
| 0x10092400 | 0x00092400 | RakPeer_PushEventString | RakNet/RakPeer | decomp/rename | med |
| 0x100924A0 | 0x000924A0 | RakPeer_PruneEvents | RakNet/RakPeer | decomp/rename | med |
| 0x10092720 | 0x00092720 | RakPeer_SetIncomingPassword | RakNet/RakPeer | decomp/rename | med |
| 0x10092780 | 0x00092780 | RakPeer_GetIncomingPassword | RakNet/RakPeer | decomp/rename | med |
| 0x100927F0 | 0x000927F0 | RakPeer_Connect | RakNet/RakPeer | decomp/rename | med |
| 0x100928C0 | 0x000928C0 | RakPeer_ConnectWithParams | RakNet/RakPeer | decomp/rename | med |
| 0x10092670 | 0x00092670 | RakPeer_SetPort | RakNet/RakPeer | decomp/rename | med |
| 0x10092690 | 0x00092690 | RakPeer_GetPort | RakNet/RakPeer | decomp/rename | med |
| 0x100926B0 | 0x000926B0 | RakPeer_GetConnectionCount | RakNet/RakPeer | decomp/rename | med |
| 0x10093970 | 0x00093970 | RakPeer_GetMaxConnections | RakNet/RakPeer | decomp/rename | med |
| 0x100916E0 | 0x000916E0 | RakPeerPacket_New | RakNet/RakPeer | decomp/rename | med |
| 0x1008F890 | 0x0008F890 | ConfigureUDPSocket | RakNet socket | decomp/rename | med |
| 0x1008F960 | 0x0008F960 | CreateBoundUDPSocket | RakNet socket | decomp/rename | med |
| 0x1008F820 | 0x0008F820 | IsPortInUse | RakNet socket | decomp/rename | med |
| 0x1008FB00 | 0x0008FB00 | ResolveHostnameToIP | RakNet socket | decomp/rename | med |
| 0x10090070 | 0x00090070 | GetHostIPList | RakNet socket | decomp/rename | med |
| 0x100901A0 | 0x000901A0 | GetSocketAddr | RakNet socket | decomp/rename | med |
| 0x10090160 | 0x00090160 | GetSocketPort | RakNet socket | decomp/rename | med |
| 0x1008FF60 | 0x0008FF60 | Socket_SendToIPString | RakNet socket | decomp/rename | med |
| 0x1008FE90 | 0x0008FE90 | Socket_SendTo | RakNet socket | decomp/rename | med |
| 0x1008FFA0 | 0x0008FFA0 | Socket_SendToTTL | RakNet socket | decomp/rename | med |
| 0x1008FE30 | 0x0008FE30 | Socket_SendToRaw | RakNet socket | decomp/rename | med |
| 0x1008FDF0 | 0x0008FDF0 | Socket_SendToRaw_Stub | RakNet socket | decomp/rename | med |
| 0x10090940 | 0x00090940 | CS_Lock | Threading/CS | decomp/rename | med |
| 0x10090950 | 0x00090950 | CS_Unlock | Threading/CS | decomp/rename | med |
| 0x10090900 | 0x00090900 | CS_Init | Threading/CS | decomp/rename | med |
| 0x10090920 | 0x00090920 | CS_Destroy | Threading/CS | decomp/rename | med |
| 0x10090930 | 0x00090930 | CS_InitFlagClear | Threading/CS | decomp/rename | med |
| 0x10091690 | 0x00091690 | SleepMs | Timing | decomp/rename | med |
| 0x1008C510 | 0x0008C510 | GetTimeMicros | Timing | decomp/rename | med |
| 0x1008C4F0 | 0x0008C4F0 | GetTimeMs | Timing | decomp/rename | med |
| 0x1008F6D0 | 0x0008F6D0 | itoa_base | Utility | decomp/rename | med |
| 0x10093AD0 | 0x00093AD0 | RakPeer_RPC | RakNet/RakPeer | decomp/rename | med |
| 0x10094320 | 0x00094320 | RakPeer_SendEx | RakNet/RakPeer | decomp/rename | med |
| 0x10094440 | 0x00094440 | RakPeer_SendInternal | RakNet/RakPeer | decomp/rename | med |
| 0x10094510 | 0x00094510 | RakPeer_RemoveConnectionRequestByAddr | RakNet/RakPeer | decomp/rename | med |
| 0x100945F0 | 0x000945F0 | RakPeer_IsConnectedEx | RakNet/RakPeer | decomp/rename | med |
| 0x10094770 | 0x00094770 | RakPeer_GetIndexFromSystemAddress | RakNet/RakPeer | decomp/rename | med |
| 0x10096C40 | 0x00096C40 | RakPeer_GetIndexFromSystemAddressEx | RakNet/RakPeer | decomp/rename | med |
| 0x10094790 | 0x00094790 | RakPeer_GetPlayerIDFromIndex | RakNet/RakPeer | decomp/rename | med |
| 0x10094830 | 0x00094830 | RakPeer_GetGuidFromIndex | RakNet/RakPeer | decomp/rename | med |
| 0x10094910 | 0x00094910 | RakPeer_GetSystemList | RakNet/RakPeer | decomp/rename | med |
| 0x100949E0 | 0x000949E0 | RakPeer_AddToBanList | RakNet/RakPeer | decomp/rename | med |
| 0x10094BB0 | 0x00094BB0 | RakPeer_RemoveFromBanList | RakNet/RakPeer | decomp/rename | med |
| 0x10094D10 | 0x00094D10 | RakPeer_ClearBanList | RakNet/RakPeer | decomp/rename | med |
| 0x10094DD0 | 0x00094DD0 | RakPeer_IsInBanList | RakNet/RakPeer | decomp/rename | med |
| 0x10099460 | 0x00099460 | RakPeer_PingConnected | RakNet/RakPeer | decomp/rename | med |
| 0x10095060 | 0x00095060 | RakPeer_PingConnected_Thunk | RakNet/RakPeer | decomp/rename | med |
| 0x10095090 | 0x00095090 | RakPeer_Ping | RakNet/RakPeer | decomp/rename | med |
| 0x100952B0 | 0x000952B0 | RakPeer_GetAveragePing | RakNet/RakPeer | decomp/rename | med |
| 0x10095350 | 0x00095350 | RakPeer_GetTimeSinceLastPacket | RakNet/RakPeer | decomp/rename | med |
| 0x100953A0 | 0x000953A0 | RakPeer_GetLastPing | RakNet/RakPeer | decomp/rename | med |
| 0x100953E0 | 0x000953E0 | RakPeer_SetOccasionalPing | RakNet/RakPeer | decomp/rename | med |
| 0x10095400 | 0x00095400 | RakPeer_SetOfflinePingResponse | RakNet/RakPeer | decomp/rename | med |
| 0x10095460 | 0x00095460 | RakPeer_GetOfflinePingResponse | RakNet/RakPeer | decomp/rename | med |
| 0x100954B0 | 0x000954B0 | RakPeer_GetInternalID | RakNet/RakPeer | decomp/rename | med |
| 0x10095550 | 0x00095550 | RakPeer_GetExternalID | RakNet/RakPeer | decomp/rename | med |
| 0x100956A0 | 0x000956A0 | RakPeer_GetGuidFromSystemAddress | RakNet/RakPeer | decomp/rename | med |
| 0x10095AF0 | 0x00095AF0 | RakPeer_GetNumberOfAddresses | RakNet/RakPeer | decomp/rename | med |
| 0x10095B30 | 0x00095B30 | RakPeer_GetLocalIP | RakNet/RakPeer | decomp/rename | med |
| 0x10095BA0 | 0x00095BA0 | RakPeer_IsLocalIP | RakNet/RakPeer | decomp/rename | med |
| 0x10095C40 | 0x00095C40 | RakPeer_AllowConnectionResponseIPMigration | RakNet/RakPeer | decomp/rename | med |
| 0x10095C60 | 0x00095C60 | RakPeer_AdvertiseSystem | RakNet/RakPeer | decomp/rename | med |
| 0x10095CA0 | 0x00095CA0 | RakPeer_SetSplitMessageProgressInterval | RakNet/RakPeer | decomp/rename | med |
| 0x10095D10 | 0x00095D10 | RakPeer_GetSplitMessageProgressInterval | RakNet/RakPeer | decomp/rename | med |
| 0x10095D30 | 0x00095D30 | RakPeer_SetUnreliableTimeout | RakNet/RakPeer | decomp/rename | med |
| 0x10095DB0 | 0x00095DB0 | RakPeer_SendTTL | RakNet/RakPeer | decomp/rename | med |
| 0x10095E20 | 0x00095E20 | RakPeer_SetCompileFrequencyTable | RakNet/RakPeer | decomp/rename | med |
| 0x10095E40 | 0x00095E40 | RakPeer_GetOutgoingFrequencyTable | RakNet/RakPeer | decomp/rename | med |
| 0x10095EA0 | 0x00095EA0 | RakPeer_GenerateCompressionLayer | RakNet/RakPeer | decomp/rename | med |
| 0x10095F40 | 0x00095F40 | RakPeer_DeleteCompressionLayer | RakNet/RakPeer | decomp/rename | med |
| 0x10095FE0 | 0x00095FE0 | RakPeer_GetCompressionRatio | RakNet/RakPeer | decomp/rename | med |
| 0x10096040 | 0x00096040 | RakPeer_GetDecompressionRatio | RakNet/RakPeer | decomp/rename | med |
| 0x100960A0 | 0x000960A0 | RakPeer_AttachPlugin | RakNet/RakPeer | decomp/rename | med |
| 0x10096100 | 0x00096100 | RakPeer_DetachPlugin | RakNet/RakPeer | decomp/rename | med |
| 0x100961B0 | 0x000961B0 | RakPeer_PushBackPacket | RakNet/RakPeer | decomp/rename | med |
| 0x10096280 | 0x00096280 | RakPeer_SetRouterInterface | RakNet/RakPeer | decomp/rename | med |
| 0x100962A0 | 0x000962A0 | RakPeer_RemoveRouterInterface | RakNet/RakPeer | decomp/rename | med |
| 0x100962D0 | 0x000962D0 | RakPeer_AllocatePacket | RakNet/RakPeer | decomp/rename | med |
| 0x10096300 | 0x00096300 | RakPeer_GetSocket | RakNet/RakPeer | decomp/rename | med |
| 0x100964B0 | 0x000964B0 | RakPeer_GetSockets | RakNet/RakPeer | decomp/rename | med |
| 0x10096610 | 0x00096610 | RakPeer_ApplyNetworkSimulator | RakNet/RakPeer | decomp/rename | med |
| 0x10096620 | 0x00096620 | RakPeer_SetPerConnectionOutgoingBandwidthLimit | RakNet/RakPeer | decomp/rename | med |
| 0x10096650 | 0x00096650 | RakPeer_GetRPCString | RakNet/RakPeer | decomp/rename | med |
| 0x10096820 | 0x00096820 | RakPeer_WriteOutOfBandHeader | RakNet/RakPeer | decomp/rename | med |
| 0x10096890 | 0x00096890 | RakPeer_SendOutOfBand | RakNet/RakPeer | decomp/rename | med |
| 0x10096AD0 | 0x00096AD0 | RakPeer_GetStatistics | RakNet/RakPeer | decomp/rename | med |
| 0x10096C20 | 0x00096C20 | RakPeer_GetReceiveBufferSize | RakNet/RakPeer | decomp/rename | med |
| 0x10096D80 | 0x00096D80 | RakPeer_SendConnectionRequest | RakNet/RakPeer | decomp/rename | med |
| 0x10096F30 | 0x00096F30 | RakPeer_SendConnectionRequestWithSocket | RakNet/RakPeer | decomp/rename | med |
| 0x10095740 | 0x00095740 | RakPeer_GetSystemAddressFromGuid | RakNet/RakPeer | decomp/rename | med |
| 0x10095850 | 0x00095850 | RakPeer_SetTimeoutTime | RakNet/RakPeer | decomp/rename | med |
| 0x10095940 | 0x00095940 | RakPeer_GetTimeoutTime | RakNet/RakPeer | decomp/rename | med |
| 0x100959B0 | 0x000959B0 | RakPeer_SetMTUSize | RakNet/RakPeer | decomp/rename | med |
| 0x10095A90 | 0x00095A90 | RakPeer_GetMTUSize | RakNet/RakPeer | decomp/rename | med |
| 0x10097160 | 0x00097160 | RakPeer_GetRemoteSystemFromSystemAddress | RakNet/RakPeer | decomp/rename | med |
| 0x1008F380 | 0x0008F380 | BitStream_Write_u16 | RakNet BitStream | decomp/rename | med |
| 0x10097330 | 0x00097330 | RakPeer_ParseConnectionRequestPacket | RakNet/RakPeer | decomp/rename | med |
| 0x10097660 | 0x00097660 | RakPeer_OnConnectionRequest | RakNet/RakPeer | decomp/rename | med |
| 0x100976C0 | 0x000976C0 | RakPeer_SendConnectionRequestAccepted | RakNet/RakPeer | decomp/rename | med |
| 0x10097800 | 0x00097800 | RakPeer_NotifyAndFlagForShutdown | RakNet/RakPeer | decomp/rename | med |
| 0x10098150 | 0x00098150 | RakPeer_ShiftIncomingTimestamp | RakNet/RakPeer | decomp/rename | med |
| 0x10098220 | 0x00098220 | RakPeer_GetBestClockDifferential | RakNet/RakPeer | decomp/rename | med |
| 0x100979E0 | 0x000979E0 | RakPeer_AssignSystemAddressToRemoteSystemList | RakNet/RakPeer | decomp/rename | med |
| 0x100982F0 | 0x000982F0 | RakPeer_HandleRPCPacket | RakNet/RakPeer | decomp/rename | med |
| 0x1008C260 | 0x0008C260 | BitStream_SetWriteOffset | RakNet BitStream | decomp/rename | med |
| 0x10074020 | 0x00074020 | RPCParameters_Init | RakNet/RPC | decomp/rename | med |
| 0x10098C00 | 0x00098C00 | RakPeer_HandleRPCReplyPacket | RakNet/RakPeer | decomp/rename | med |
| 0x10098C90 | 0x00098C90 | RakPeer_IsLoopbackAddress | RakNet/RakPeer | decomp/rename | med |
| 0x10098D90 | 0x00098D90 | RakPeer_GetLoopbackAddress | RakNet/RakPeer | decomp/rename | med |
| 0x10098DC0 | 0x00098DC0 | RakPeer_GenerateSYNCookieRandomNumber | RakNet/RakPeer | decomp/rename | med |
| 0x10098E50 | 0x00098E50 | RakPeer_SecuredConnectionResponse | RakNet/RakPeer | decomp/rename | med |
| 0x10099060 | 0x00099060 | RakPeer_SecuredConnectionConfirmation | RakNet/RakPeer | decomp/rename | med |
| 0x10099590 | 0x00099590 | RakPeer_CloseConnectionInternal | RakNet/RakPeer | decomp/rename | med |
| 0x1008C340 | 0x0008C340 | ReverseBytesInPlace | Utility | decomp/rename | med |
| 0x10099770 | 0x00099770 | RakPeer_IsConnected_ConnectedOnly | RakNet/RakPeer | decomp/rename | med |
| 0x10099840 | 0x00099840 | RakPeer_SendBuffered | RakNet/RakPeer | decomp/rename | med |
| 0x10099950 | 0x00099950 | RakPeer_SendBufferedList | RakNet/RakPeer | decomp/rename | med |
| 0x10099B30 | 0x00099B30 | RakPeer_SendImmediate | RakNet/RakPeer | decomp/rename | med |
| 0x10099FE0 | 0x00099FE0 | RakPeer_ClearBufferedCommands | RakNet/RakPeer | decomp/rename | med |
| 0x1009A070 | 0x0009A070 | RakPeer_ClearSocketQueryOutput | RakNet/RakPeer | decomp/rename | med |
| 0x1009A0B0 | 0x0009A0B0 | RakPeer_ClearRequestedConnectionList | RakNet/RakPeer | decomp/rename | med |
| 0x1009A190 | 0x0009A190 | RakPeer_GenerateGUID | RakNet/RakPeer | decomp/rename | med |
| 0x1009A2F0 | 0x0009A2F0 | ProcessOfflineNetworkPacket | RakNet/NetLoop | decomp/rename | med |
| 0x1008B900 | 0x0008B900 | BitStream_AlignReadToByteBoundary | RakNet BitStream | decomp/rename | med |
| 0x100972A0 | 0x000972A0 | RakPeer_GetRemoteSystemFromGUID | RakNet/RakPeer | decomp/rename | med |
| 0x10099430 | 0x00099430 | RakPeer_AllowIncomingConnections | RakNet/RakPeer | decomp/rename | med |
| 0x1009A2C0 | 0x0009A2C0 | time64 | Utility | decomp/rename | med |
| 0x10097920 | 0x00097920 | RakPeer_GetNumberOfRemoteInitiatedConnections | RakNet/RakPeer | decomp/rename | med |
| 0x1009BC00 | 0x0009BC00 | ProcessNetworkPacket | RakNet/NetLoop | decomp/rename | med |
| 0x1009BE60 | 0x0009BE60 | RakPeer_GenerateSeedFromGuid | RakNet/RakPeer | decomp/rename | med |
| 0x1009BEF0 | 0x0009BEF0 | RakPeer_DerefAllSockets | RakNet/RakPeer | decomp/rename | med |
| 0x1009BF10 | 0x0009BF10 | RakPeer_GetRakNetSocketFromUserConnectionSocketIndex | RakNet/RakPeer | decomp/rename | med |
| 0x1009BF70 | 0x0009BF70 | RakPeer_RunUpdateCycle | RakNet/RakPeer | decomp/rename | med |
| 0x1008F3F0 | 0x0008F3F0 | BitStream_Read_u16 | Read 16-bit value with endian swap | decomp/rename | high |
| 0x10091740 | 0x00091740 | RakPeerPacket_NewWithData | Allocate packet struct with external data ptr | decomp/rename | med |
| 0x1009E1D0 | 0x0009E1D0 | RakPeer_RunUpdateThread | RakPeer network update loop/thread proc | decomp/rename | med |
| 0x1009E360 | 0x0009E360 | RakPeerInterface_ctor | Set vftable | decomp/rename | high |
| 0x1009E3E0 | 0x0009E3E0 | RakPeerInterface_ctor2 | Set vftable (alt) | decomp/rename | med |
| 0x1009E400 | 0x0009E400 | RakPeer_IsActive | Check shutdown flag | decomp/rename | med |
| 0x1009E420 | 0x0009E420 | BitStream_WriteSystemAddressAndGuid | Write optional GUID + addr + index | decomp/rename | med |
| 0x1009E510 | 0x0009E510 | BitStream_WriteSystemAddress | Write ~IP + port | decomp/rename | med |
| 0x1009E550 | 0x0009E550 | BitStream_WriteRakNetGUID | Write 24-byte GUID | decomp/rename | med |
| 0x1009E570 | 0x0009E570 | RakNetStatistics_AddInPlace | Accumulate stats into dest | decomp/rename | med |
| 0x1009E9B0 | 0x0009E9B0 | BitStream_ReadRakNetGUID | Read 24-byte GUID | decomp/rename | med |
| 0x1009E9D0 | 0x0009E9D0 | NetAddr_InitUnassigned | Init net addr to unassigned | decomp/rename | med |
| 0x1009E9F0 | 0x0009E9F0 | BitStream_ReadSystemAddressAndGuid | Read optional GUID + addr + index | decomp/rename | med |
| 0x1009EA80 | 0x0009EA80 | BitStream_ReadSystemAddress | Read ~IP + port | decomp/rename | high |
| 0x1009EAC0 | 0x0009EAC0 | NetAddr_InitAtOffset8 | Init net addr member at +8 | decomp/rename | low |
| 0x1009EAE0 | 0x0009EAE0 | RakPeer_PushIncomingPacket | Enqueue packet to incoming queue | decomp/rename | high |
| 0x1009EB20 | 0x0009EB20 | RakNet_GetTimeMicros | Wrapper for GetTimeMicros | decomp/rename | high |
| 0x1009EB60 | 0x0009EB60 | RakNetSmartPtr_Init | SmartPtr init w/ refcount | decomp/rename | med |
| 0x1009EBA0 | 0x0009EBA0 | RakNetSmartPtr_IsNull | Check smart ptr null | decomp/rename | high |
| 0x1009EBC0 | 0x0009EBC0 | RakNetSmartPtr_Reset | Dec ref + free + null | decomp/rename | med |
| 0x1008B6F0 | 0x0008B6F0 | BitStream_ReadAlignedBytes | Read byte-aligned buffer | decomp/rename | high |
| 0x1009EC40 | 0x0009EC40 | RakNetSmartPtr_Assign | SmartPtr assignment w/ refcount | decomp/rename | med |
| 0x1009ECD0 | 0x0009ECD0 | RakNetSmartPtr_Ctor | SmartPtr default ctor | decomp/rename | med |
| 0x1009ED40 | 0x0009ED40 | DS_List_BinarySearch | Binary search w/ comparator | decomp/rename | med |
| 0x1009EE10 | 0x0009EE10 | DS_OrderedList_Insert | Ordered insert (no dupes) | decomp/rename | med |
| 0x1009EEA0 | 0x0009EEA0 | DS_OrderedList_Remove | Ordered remove by key | decomp/rename | med |
| 0x1009EEF0 | 0x0009EEF0 | DS_List_GetAt | Return element at index | decomp/rename | med |
| 0x1009EF30 | 0x0009EF30 | DS_List_Ctor | Init list fields | decomp/rename | high |
| 0x1009EF60 | 0x0009EF60 | DS_List_Dtor | Free list storage if owned | decomp/rename | med |
| 0x1009EFB0 | 0x0009EFB0 | DS_List_PushBack | Append element, grow if needed | decomp/rename | high |
| 0x1009F090 | 0x0009F090 | DS_List_RemoveAt | Remove element by index | decomp/rename | high |
| 0x1009F0F0 | 0x0009F0F0 | DS_List_Size | Return element count | decomp/rename | high |
| 0x1009F110 | 0x0009F110 | DS_List_Clear | Clear list, optional free | decomp/rename | med |
| 0x1009F180 | 0x0009F180 | DS_List_Ctor2 | Init list fields (alt) | decomp/rename | med |
| 0x1009F1B0 | 0x0009F1B0 | DS_List_Dtor2 | Free list storage (tmpl) | decomp/rename | med |
| 0x1009F200 | 0x0009F200 | DS_List_PushBack2 | Append element (tmpl) | decomp/rename | med |
| 0x1009F2E0 | 0x0009F2E0 | DS_List_DecrementSize | Decrease list size | decomp/rename | med |
| 0x1009F300 | 0x0009F300 | DS_List_IndexOf | Linear search for value | decomp/rename | med |
| 0x1009F350 | 0x0009F350 | DS_List_Size2 | Return element count (tmpl) | decomp/rename | high |
| 0x1009F370 | 0x0009F370 | DS_ListEx_Ctor | Init extended list fields | decomp/rename | low |
| 0x1009F3B0 | 0x0009F3B0 | DS_Queue_Dtor | Free queue storage | decomp/rename | med |
| 0x1009F3E0 | 0x0009F3E0 | DS_Queue_Push | Enqueue element, grow ring | decomp/rename | high |
| 0x1009F540 | 0x0009F540 | DS_Queue_GetAt | Get element pointer by index | decomp/rename | high |
| 0x1009F590 | 0x0009F590 | DS_Queue_RemoveAt | Remove element by index | decomp/rename | med |
| 0x1009F680 | 0x0009F680 | DS_Queue_Pop | Dequeue element (advance head) | decomp/rename | med |
| 0x1009F6E0 | 0x0009F6E0 | DS_Queue_Size | Return queue size | decomp/rename | high |
| 0x1009F720 | 0x0009F720 | DS_Queue_IsEmpty | Check if queue empty | decomp/rename | high |
| 0x1009F740 | 0x0009F740 | SingleProducerConsumer_Ctor | Init SPC queue nodes | decomp/rename | med |
| 0x1009F820 | 0x0009F820 | SingleProducerConsumer_Dtor | Free SPC nodes | decomp/rename | med |
| 0x1009F890 | 0x0009F890 | SingleProducerConsumer_ProducerAcquire | Producer acquire write node | decomp/rename | med |
| 0x1009F920 | 0x0009F920 | SingleProducerConsumer_ProducerCommit | Producer commit write node | decomp/rename | med |
| 0x1009F960 | 0x0009F960 | SingleProducerConsumer_ConsumerPop | Consumer pop read node | decomp/rename | med |
| 0x1009F9B0 | 0x0009F9B0 | SingleProducerConsumer_ConsumerCommit | Consumer commit read node | decomp/rename | med |
| 0x1009F9F0 | 0x0009F9F0 | SingleProducerConsumer_Reset | Reset/trim SPC nodes | decomp/rename | med |
| 0x1009FAD0 | 0x0009FAD0 | DS_List_Ctor3 | Init list fields (tmpl) | decomp/rename | med |
| 0x1009FB00 | 0x0009FB00 | DS_List_Dtor3 | Free list storage (tmpl) | decomp/rename | med |
| 0x1009FB30 | 0x0009FB30 | DS_List_AssignSmartPtr | Copy list of smart ptrs | decomp/rename | med |
| 0x1009FBF0 | 0x0009FBF0 | DS_List_GetAt8 | Get element ptr (8-byte) | decomp/rename | med |
| 0x1009FC10 | 0x0009FC10 | DS_List_PushBackSmartPtr | Append smart ptr element | decomp/rename | med |
| 0x1009FC60 | 0x0009FC60 | DS_List_ClearSmartPtr | Clear list of smart ptrs | decomp/rename | med |
| 0x1009FCD0 | 0x0009FCD0 | SingleProducerConsumer_Ctor2 | Init SPC nodes (alt) | decomp/rename | med |
| 0x1009FDB0 | 0x0009FDB0 | SingleProducerConsumer_Dtor2 | Free SPC nodes (alt) | decomp/rename | med |
| 0x1009FE20 | 0x0009FE20 | SingleProducerConsumer2_ProducerAcquire | Producer acquire node (alt) | decomp/rename | med |
| 0x1009FEB0 | 0x0009FEB0 | SingleProducerConsumer2_ProducerCommit | Producer commit node (alt) | decomp/rename | med |
| 0x1009FEF0 | 0x0009FEF0 | SingleProducerConsumer2_ConsumerPop | Consumer pop node (alt) | decomp/rename | med |
| 0x1009FF40 | 0x0009FF40 | SingleProducerConsumer2_ConsumerCommit | Consumer commit node (alt) | decomp/rename | med |
| 0x1009FF80 | 0x0009FF80 | SingleProducerConsumer2_Reset | Reset/trim nodes (alt) | decomp/rename | med |
| 0x100A0060 | 0x000A0060 | SingleProducerConsumer_Ctor3 | Init SPC nodes (alt2) | decomp/rename | med |
| 0x100A0140 | 0x000A0140 | SingleProducerConsumer_Dtor3 | Free SPC nodes (alt2) | decomp/rename | med |
| 0x100A01B0 | 0x000A01B0 | SingleProducerConsumer3_ProducerAcquire | Producer acquire node (alt3) | decomp/rename | med |
| 0x100A0240 | 0x000A0240 | SingleProducerConsumer3_ProducerCommit | Producer commit node (alt3) | decomp/rename | med |
| 0x100A0280 | 0x000A0280 | SingleProducerConsumer3_ConsumerPop | Consumer pop node (alt3) | decomp/rename | med |
| 0x100A02D0 | 0x000A02D0 | SingleProducerConsumer3_ConsumerCommit | Consumer commit node (alt3) | decomp/rename | med |
| 0x100A0310 | 0x000A0310 | SingleProducerConsumer3_Reset | Reset/trim nodes (alt3) | decomp/rename | med |
| 0x100A03F0 | 0x000A03F0 | DS_Queue_Ctor | Init queue fields | decomp/rename | med |
| 0x100A0430 | 0x000A0430 | DS_Queue_Dtor2 | Free queue storage (tmpl) | decomp/rename | med |
| 0x100A0460 | 0x000A0460 | DS_Queue_Push2 | Enqueue element (tmpl) | decomp/rename | med |
| 0x100A05C0 | 0x000A05C0 | DS_Queue_InsertAt | Insert element at index | decomp/rename | med |
| 0x100A06F0 | 0x000A06F0 | DS_Queue_GetAt2 | Get element ptr by index (tmpl) | decomp/rename | med |
| 0x100A0740 | 0x000A0740 | DS_Queue_RemoveAt2 | Remove element by index (tmpl) | decomp/rename | med |
| 0x100A0830 | 0x000A0830 | DS_Queue_Pop2 | Dequeue element (tmpl) | decomp/rename | med |
| 0x100A0890 | 0x000A0890 | DS_Queue_Size2 | Return queue size (tmpl) | decomp/rename | high |
| 0x100A08D0 | 0x000A08D0 | DS_Queue_Clear | Clear queue, optional free | decomp/rename | med |
| 0x100A0930 | 0x000A0930 | DS_List_Ctor4 | Init list fields (tmpl) | decomp/rename | med |
| 0x100A0960 | 0x000A0960 | DS_List_Dtor4 | Free list storage (tmpl) | decomp/rename | med |
| 0x100A09B0 | 0x000A09B0 | DS_List_PushBackCStr | Append CStr element | decomp/rename | med |
| 0x100A0AA0 | 0x000A0AA0 | DS_List_RemoveAtCStr | Remove CStr element | decomp/rename | med |
| 0x100A0B10 | 0x000A0B10 | DS_List_SizeCStr | Return element count (CStr) | decomp/rename | high |
| 0x100A0B30 | 0x000A0B30 | DS_List_ClearCStr | Clear CStr list | decomp/rename | med |
| 0x100A0BA0 | 0x000A0BA0 | RakNetSocketEntry_New | Allocate socket entry | decomp/rename | low |
| 0x100A25E0 | 0x000A25E0 | RakNetSocketEntry_Ctor | Init socket entry | decomp/rename | low |
| 0x100A0C30 | 0x000A0C30 | RemoteSystemList_Alloc | Allocate RemoteSystem array | decomp/rename | med |
| 0x100A1100 | 0x000A1100 | RemoteSystem_Ctor | Init RemoteSystem fields | decomp/rename | med |
| 0x100A0D10 | 0x000A0D10 | RemoteSystemList_Free | Free RemoteSystem array | decomp/rename | med |
| 0x100A11A0 | 0x000A11A0 | RemoteSystem_Dtor | Destroy RemoteSystem | decomp/rename | med |
| 0x100A1230 | 0x000A1230 | RemoteSystem_DtorBody | Release RemoteSystem members | decomp/rename | med |
| 0x100A0D80 | 0x000A0D80 | RequestedConnection_Delete | Delete requested-connection entry | decomp/rename | low |
| 0x100A11D0 | 0x000A11D0 | RequestedConnection_Dtor | Destroy requested-connection entry | decomp/rename | low |
| 0x100A12A0 | 0x000A12A0 | RequestedConnection_DtorBody | Release requested-connection members | decomp/rename | low |
| 0x100A0DB0 | 0x000A0DB0 | DS_List_PushBackNetAddr | Append NetAddr (8 bytes) | decomp/rename | med |
| 0x100A0DE0 | 0x000A0DE0 | DS_List_ClearNetAddr | Clear NetAddr list | decomp/rename | med |
| 0x100A0E50 | 0x000A0E50 | DS_List_PushBackNetAddr6Dword | Append NetAddr (24 bytes) | decomp/rename | med |
| 0x100A0E80 | 0x000A0E80 | DS_List_ClearNetAddr6Dword | Clear NetAddr6Dword list | decomp/rename | med |
| 0x100A0EF0 | 0x000A0EF0 | BanEntry_New | Allocate ban entry | decomp/rename | med |
| 0x100A0F30 | 0x000A0F30 | BanEntry_Delete | Free ban entry | decomp/rename | med |
| 0x100A0F60 | 0x000A0F60 | BanList_FreeArray | Free ban list array | decomp/rename | med |
| 0x100A0FC0 | 0x000A0FC0 | RequestedConnection_New | Allocate requested-connection struct | decomp/rename | med |
| 0x100A1200 | 0x000A1200 | RequestedConnection_Ctor | Init requested-connection struct | decomp/rename | med |
| 0x100A1050 | 0x000A1050 | RefCount_New | Allocate refcount object | decomp/rename | med |
| 0x100A12C0 | 0x000A12C0 | DS_List_Ctor5 | Init list fields (tmpl) | decomp/rename | med |
| 0x100A12F0 | 0x000A12F0 | DS_List_Dtor5 | Free list storage (tmpl) | decomp/rename | med |
| 0x100A1320 | 0x000A1320 | DS_List_GetAt12 | Get element ptr (12-byte) | decomp/rename | med |
| 0x100A1340 | 0x000A1340 | DS_List_PushBack12 | Append 12-byte element | decomp/rename | med |
| 0x100A1430 | 0x000A1430 | DS_List_InsertAt12 | Insert 12-byte element | decomp/rename | med |
| 0x100A1550 | 0x000A1550 | DS_List_RemoveAt12 | Remove 12-byte element | decomp/rename | med |
| 0x100A1650 | 0x000A1650 | DS_List_DecrementSize12 | Decrease list size | decomp/rename | med |
| 0x100A1670 | 0x000A1670 | Array_FreeWithCount | Free counted array | decomp/rename | low |
| 0x100A16D0 | 0x000A16D0 | Array_AllocDword | Allocate counted dword array | decomp/rename | low |
| 0x100A1750 | 0x000A1750 | Array_FreeWithCount2 | Free counted array (alt) | decomp/rename | low |
| 0x100A17B0 | 0x000A17B0 | Array_AllocDword2 | Allocate counted dword array (alt) | decomp/rename | low |
| 0x100A1830 | 0x000A1830 | Array_FreeWithCount3 | Free counted array (alt) | decomp/rename | low |
| 0x100A1890 | 0x000A1890 | Array_AllocDword3 | Allocate counted dword array (alt) | decomp/rename | low |
| 0x100A1910 | 0x000A1910 | SingleProducerConsumerNode_New | Allocate SPC node (size 0x6C) | decomp/rename | med |
| 0x100A19A0 | 0x000A19A0 | SingleProducerConsumerNode_Delete | Free SPC node | decomp/rename | med |
| 0x100A19D0 | 0x000A19D0 | DS_List_PushBackSmartPtr_Impl | Append smart ptr (impl) | decomp/rename | med |
| 0x100A1AC0 | 0x000A1AC0 | DS_List_FreeSmartPtrArray | Free smart ptr array | decomp/rename | med |
| 0x100A1B30 | 0x000A1B30 | DS_List_AllocSmartPtrArray | Alloc smart ptr array | decomp/rename | med |
| 0x100A1C00 | 0x000A1C00 | SingleProducerConsumerNode2_New | Allocate SPC node (size 0x14) | decomp/rename | med |
| 0x100A1C90 | 0x000A1C90 | SingleProducerConsumerNode3_New | Allocate SPC node (size 0x0C) | decomp/rename | med |
| 0x100A1D20 | 0x000A1D20 | Array_FreeWithCount4 | Free counted array (alt) | decomp/rename | low |
| 0x100A1D80 | 0x000A1D80 | Array_AllocDword4 | Allocate counted dword array (alt) | decomp/rename | low |
| 0x100A1E00 | 0x000A1E00 | DS_List_DecrementSizeCStr | Decrease CStr list size | decomp/rename | med |
| 0x100A1E20 | 0x000A1E20 | DS_List_FreeCStrArray | Free CStr array | decomp/rename | med |
| 0x100A1E90 | 0x000A1E90 | DS_List_AllocCStrArray | Alloc CStr array | decomp/rename | med |
| 0x100A1F60 | 0x000A1F60 | DS_List_PushBackNetAddr_Impl | Append NetAddr (impl) | decomp/rename | med |
| 0x100A2050 | 0x000A2050 | DS_List_FreeNetAddrArray | Free NetAddr array | decomp/rename | med |
| 0x100A20B0 | 0x000A20B0 | DS_List_PushBackNetAddr6Dword_Impl | Append NetAddr6Dword (impl) | decomp/rename | med |
| 0x100A21A0 | 0x000A21A0 | DS_List_FreeNetAddr6DwordArray | Free NetAddr6Dword array | decomp/rename | med |
| 0x100A2200 | 0x000A2200 | NetAddrEx_Copy12 | Copy 12-byte NetAddr+extra | decomp/rename | med |
| 0x100A2230 | 0x000A2230 | RakNetSmartPtr_Destroy | SmartPtr dtor wrapper | decomp/rename | med |
| 0x100A2290 | 0x000A2290 | SingleProducerConsumerNode_Ctor | Init SPC node | decomp/rename | med |
| 0x100A2310 | 0x000A2310 | SingleProducerConsumerNode_CtorBody | Init node fields | decomp/rename | med |
| 0x100A2260 | 0x000A2260 | CStr_Dtor | Release string ref | decomp/rename | med |
| 0x100A22B0 | 0x000A22B0 | SingleProducerConsumerNode2_Ctor | Init SPC node (size 0x14) | decomp/rename | med |
| 0x100A22D0 | 0x000A22D0 | SingleProducerConsumerNode2_CtorBody | Init node body (SPC2) | decomp/rename | med |
| 0x100A22F0 | 0x000A22F0 | SingleProducerConsumerNode3_Ctor | Init SPC node (size 0x0C) | decomp/rename | med |
| 0x100A2340 | 0x000A2340 | DS_List_DecrementSize12_2 | Decrease list size (alt) | decomp/rename | low |
| 0x100A2360 | 0x000A2360 | Array_FreeWithCount5 | Free counted array (alt) | decomp/rename | low |
| 0x100A23C0 | 0x000A23C0 | DS_List_AllocNetAddrEx12 | Alloc NetAddr+extra array | decomp/rename | med |
| 0x100A2490 | 0x000A2490 | DS_List_AllocNetAddrArray | Alloc NetAddr array | decomp/rename | med |
| 0x100A2560 | 0x000A2560 | DS_List_AllocNetAddr6DwordArray | Alloc NetAddr6Dword array | decomp/rename | med |
| 0x100A2610 | 0x000A2610 | RakNetSocketEntry_Close | Close socket + handle | decomp/rename | med |
| 0x100A2650 | 0x000A2650 | HuffmanEncodingTree_Ctor | Init Huffman tree | decomp/rename | med |
| 0x100A2670 | 0x000A2670 | HuffmanEncodingTree_Dtor | Destroy Huffman tree | decomp/rename | med |
| 0x100A2690 | 0x000A2690 | HuffmanEncodingTree_Clear | Clear tree + free nodes | decomp/rename | med |
| 0x100A2790 | 0x000A2790 | HuffmanEncodingTree_Generate | Build tree from frequencies | decomp/rename | med |
| 0x100A2B20 | 0x000A2B20 | HuffmanEncodingTree_EncodeToBitStream | Encode bytes to bitstream | decomp/rename | med |
| 0x100A2C00 | 0x000A2C00 | HuffmanEncodingTree_DecodeFromBitStream | Decode bits to bytes | decomp/rename | med |
| 0x100A2CA0 | 0x000A2CA0 | HuffmanEncodingTree_DecodeToBitStream | Decode buffer to bitstream | decomp/rename | med |
| 0x100A2E80 | 0x000A2E80 | DS_Queue_Ctor3 | Init queue fields (tmpl) | decomp/rename | med |
| 0x100A2EC0 | 0x000A2EC0 | DS_Queue_Dtor3 | Free queue storage (tmpl) | decomp/rename | med |
| 0x100A2EF0 | 0x000A2EF0 | DS_Queue_Push3 | Enqueue element (tmpl) | decomp/rename | med |
| 0x100A3050 | 0x000A3050 | DS_Queue_Pop3 | Dequeue element (tmpl) | decomp/rename | med |
| 0x100A30B0 | 0x000A30B0 | DS_Queue_Size3 | Return queue size (tmpl) | decomp/rename | high |
| 0x100A30F0 | 0x000A30F0 | DS_Queue_FreeStorage | Free queue buffer | decomp/rename | med |
| 0x1008C1C0 | 0x0008C1C0 | BitStream_CopyDataToNewBuffer | Allocate+copy bitstream data | decomp/rename | med |
| 0x100A2DC0 | 0x000A2DC0 | HuffmanQueue_InsertByWeight | Insert node by weight | decomp/rename | low |
| 0x100A2E60 | 0x000A2E60 | DS_LinkedList_CtorWrapper | LinkedList ctor wrapper | decomp/rename | low |
| 0x100A3120 | 0x000A3120 | DS_LinkedList_Ctor | Init linked list | decomp/rename | med |
| 0x100A3150 | 0x000A3150 | DS_LinkedList_InsertBeforeCurrent | Insert before current | decomp/rename | med |
| 0x100A32D0 | 0x000A32D0 | DS_LinkedList_InsertAfterCurrent | Insert after current | decomp/rename | med |
| 0x100A34A0 | 0x000A34A0 | DS_LinkedList_SetCurrentHead | Set current=head | decomp/rename | med |
| 0x100A34C0 | 0x000A34C0 | DS_LinkedList_SetCurrentTail | Set current=tail | decomp/rename | med |
| 0x100A3470 | 0x000A3470 | DS_LinkedList_PopCurrent | Pop current node | decomp/rename | med |
| 0x100A3560 | 0x000A3560 | DS_LinkedList_Next | Advance current | decomp/rename | med |
| 0x100A36C0 | 0x000A36C0 | DS_LinkedList_RemoveCurrent | Remove current node | decomp/rename | med |
| 0x100A34F0 | 0x000A34F0 | DS_LinkedList_Dtor | Destroy linked list | decomp/rename | med |
| 0x100A35A0 | 0x000A35A0 | HuffmanNode_New | Allocate Huffman node | decomp/rename | med |
| 0x100A35E0 | 0x000A35E0 | Array_FreeWithCount6 | Free counted array (alt) | decomp/rename | low |
| 0x100A3640 | 0x000A3640 | Array_AllocDword5 | Allocate counted dword array (alt) | decomp/rename | low |
| 0x100A3540 | 0x000A3540 | DS_LinkedList_ClearWrapper | LinkedList clear wrapper | decomp/rename | med |
| 0x100A37A0 | 0x000A37A0 | DS_LinkedList_Clear | Free all nodes | decomp/rename | med |
| 0x100A3840 | 0x000A3840 | DS_LinkedListNode_New | Allocate linked list node | decomp/rename | med |
| 0x100A3880 | 0x000A3880 | DS_LinkedListNode_Delete | Free linked list node | decomp/rename | med |
| 0x100A38B0 | 0x000A38B0 | RSAKey_Ctor | Init RSA key struct | decomp/rename | med |
| 0x100A3940 | 0x000A3940 | RSAKey_Dtor | RSA key dtor wrapper | decomp/rename | med |
| 0x100A3960 | 0x000A3960 | RSAKey_Clear | Free RSA key buffers | decomp/rename | med |
| 0x100A3AA0 | 0x000A3AA0 | RSAKey_InitFromPrimes | Build RSA key from primes | decomp/rename | low |
| 0x100A3E50 | 0x000A3E50 | RSAKey_SetPublicKey | Set RSA public key | decomp/rename | low |
| 0x100A3EE0 | 0x000A3EE0 | RSAKey_GenerateRandom | Generate RSA keypair | decomp/rename | low |
| 0x100A4000 | 0x000A4000 | RSAKey_GetModulus | Copy modulus to output | decomp/rename | med |
| 0x100A4030 | 0x000A4030 | RSAKey_GetKeySize | Return key size | decomp/rename | med |
| 0x100A4050 | 0x000A4050 | RSAKey_Apply | Apply RSA exponent/modulus | decomp/rename | low |
| 0x100A40B0 | 0x000A40B0 | RSAKey_DecryptCRT | RSA decrypt (CRT) | decomp/rename | low |

### Class definitions / IDs
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x100012F0 | 0x000012F0 | ObjectDLLSetup | Builds class-def pointer array from linked list; sets g_pLTServer and returns array+count | decomp | high |
| 0x1006C150 | 0x0006C150 | CacheObjectClassIds | Caches class IDs by name via g_pLTServer vfunc +0x170 | decomp | high |
| (see Docs/Notes/Object_lto_class_ids.csv) | (abs) | ObjectClassDef list | Object class name -> class_id mapping from .data (93 entries) | IDA script | med |

- ID 14 `SMSG_PACKETGROUP`        -> `OnMessageGroupPacket` VA `0x00426C00` RVA `0x00026C00` (iterates: u8 **bit-length** + subpacket; length includes inner SMSG id bits; dispatched via g_MessageHandlers)
    - OnMessagePacket internals: builds a message object via MessagePacket_Parse (PacketView->MessagePacket_Alloc->MessagePacket_Init) then calls IClientShell_Default vtbl+0x58 with message id; releases object after dispatch.
    - OnMessageGroupPacket: for each subpacket, reads inner msgId via Packet_ReadBits(8) and dispatches g_MessageHandlers[msgId]; decrefs PacketView when done.
  - ID 15 `SMSG_CONSOLEVAR`         -> `OnConsoleVar` VA `0x00426FC0` RVA `0x00026FC0`
  - ID 16 `SMSG_SKYDEF`             -> `OnSkyDef` VA `0x00426360` RVA `0x00026360`
  - ID 17 `SMSG_INSTANTSPECIALEFFECT` -> `OnInstantSpecialEffect` VA `0x00427050` RVA `0x00027050`
  - ID 18 `SMSG_(unused)`           -> no handler set
  - ID 19 `SMSG_PRELOADLIST`        -> `OnPreloadListPacket` VA `0x004270D0` RVA `0x000270D0`
  - ID 20 `SMSG_THREADLOAD`         -> `OnThreadLoadPacket` VA `0x004250F0` RVA `0x000250F0`
  - ID 21 `SMSG_UNLOAD`             -> `OnUnloadPacket` VA `0x00425130` RVA `0x00025130`
  - ID 22 `SMSG_GLOBALLIGHT`        -> `OnGlobalLight` VA `0x00425820` RVA `0x00025820`
  - ID 23 `SMSG_CHANGE_CHILDMODEL`  -> `OnChangeChildModel` VA `0x00425230` RVA `0x00025230`

### CrosshairMgr_OnMessage flag map (MSG_ID 0x6E)
Flags are read as a single u32 and drive icon selection + text parsing:
- 0x00002000: add secondary icon (uses InterfaceMgr slot +24).
- 0x00020000: icon variant A (uses InterfaceMgr slot +48).
- 0x00240000: icon variant B (uses InterfaceMgr slot +40). **Mask test** includes 0x200000; handled before title parsing.
- 0x00100000: title string uses format 13008/13007 with numeric param (u32) ? text buffer.
- 0x00880000: icon variant C (uses InterfaceMgr slot +44) when 0x100000 is **not** set.
- 0x00200000: has title string + timer: reads u32 stringId + 256?byte string + u8 seconds; creates primary text line w/ optional ?(Ns)? suffix; if stringId != 0, adds title line from id+14000.
- 0x00800000: special tagged title parse. If title starts with ?_T*??, strips between `*` markers and may force icon variant A + red/green color logic. Also toggles hostile color when no timer.
- 0x00080000: action text uses LT string 6002 (else 6000/6061).
- 0x00400000: action text uses LT string 6061 with extra param (else 6000/6002).

Inline stream flags (not part of xhairFlags):
- u8 == 1 ? read two extra 256?byte strings (lines 2 & 3).
- bit (1) ? attach icon slot +32 (if set).
- bit (1) ? attach icon slot +20 (if set).
- bit (1) ? prepend formatted LT string 13013 using the current name buffer.
- u8 color code(s) ? Color_GetARGBHexByCode for bracketed tag lines.

### Code (client init + module loading)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x0044C380 | 0x0004C380 | ClientEntry | CEF/bootstrap + single-instance mutex; calls RunClient | decomp + xrefs | high |
| 0x0044BC80 | 0x0004BC80 | RunClient | Main loop + launcher gate (requires dpsmagic); sets CWD; calls InitEngineAndLoadLtmsg | decomp + strings | high |
| 0x0044B580 | 0x0004B580 | ParseCmdLine | Parses command line; expands -cmdfile; builds arg table | decomp | med |
| 0x0044AA60 | 0x0004AA60 | InitClientFromCmdLine | Parses -rez list, workingdir/config/display, +sounddll; calls resource init | decomp + strings | high |
| 0x00450000 | 0x00050000 | InitEngineAndLoadLtmsg | CoInitialize + core init; LoadLibraryA(\"ltmsg.dll\") | decomp | high |
| 0x004B8390 | 0x000B8390 | InitMasterConnection | Init connection to master server (default fom1.fomportal.com); validates install | decomp + strings | high |
| 0x00499960 | 0x00099960 | ClientNetworking_Init | Loads fom_public.key (68 bytes: exp=0x00010001 + 64-byte modulus); creates RakPeer master/world; sets MTU 0x578 | decomp + file inspection | high |
| 0x0043E660 | 0x0003E660 | UDP_BuildSockaddrFromString | Builds local sockaddr; uses BindIP override or gethostname/gethostbyname | decomp + strings | high |
| 0x00446180 | 0x00046180 | CUDPDriver_StartQuery | Binds UDP socket for queries; retries ports; uses BindIP override | decomp + strings | high |
| 0x00449B70 | 0x00049B70 | CUDPDriver_HostSession | Binds UDP socket for hosting; default port 0x6CF0 (27888) | decomp + strings | high |
| 0x0045F930 | 0x0005F930 | LoadLibraryA_ShowError | Wrapper: LoadLibraryA + GetLastError + FormatMessage + MessageBox | decomp + strings | high |
| 0x0044A8E0 | 0x0004A8E0 | LoadClientModule | Loads client module, optional SetMasterDatabase export, then init interface | decomp + xrefs | high |
| 0x0044F6C0 | 0x0004F6C0 | CopyRezFileToTemp | Extracts rez-contained file to temp path; returns temp file path + flag | decomp | med |

### Code (networking / master-world)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x0043DEE0 | 0x0003DEE0 | UDP_ParseHostString_DefaultPort | Parses "host[:port]" -> sockaddr; if no :port uses 0x6CF0 (27888) | decomp | high |
| 0x0043E0E0 | 0x0003E0E0 | UDP_SelectClientPortFromRange | Chooses bind port from IPClientPort/IPClientPortRange/IPClientPortMRU; randomizes when MRU=0 | decomp | med |
| 0x0043E090 | 0x0003E090 | UDP_UpdateClientPortMRU | Writes MRU port string to IPClientPortMRU cvar | decomp | med |
| 0x00449F20 | 0x00049F20 | CUDPDriver_OpenSocket | Binds client UDP socket to selected port; retries within range | decomp | high |
| 0x00442BD0 | 0x00042BD0 | UDP_SendMasterPacket | Builds packet w/ magic 0x9919D9C7 and sends to parsed host/port | decomp | med |
| 0x00447C20 | 0x00047C20 | CUDPDriver_SendPacketWithRetry | Wraps UDP_SendMasterPacket with retry list + msg id | decomp | med |
| 0x0049AB70 | 0x0009AB70 | World_Connect | Logs "Try connecting to world server at {0}:{1}"; calls RakPeer::Connect with password "37eG87Ph" | decomp + strings | high |
| 0x0049AD60 | 0x0009AD60 | CloseMasterConnection | Logs + closes master; resets addr/port to defaults | decomp + strings | med |
| 0x0049AE30 | 0x0009AE30 | CloseWorldConnection | Logs + closes world; resets addr/port to defaults | decomp + strings | med |
| 0x0049AF40 | 0x0009AF40 | SendPacket_LogMasterWorld | Logs "Sent packet {0} to Master/World" | decomp + strings | med |
| 0x0049B990 | 0x0009B990 | Networking_Reset | Resets networking state; clears master/world endpoints | decomp | med |

### Code (socket wrappers / RakNet)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x004E5BA0 | 0x000E5BA0 | Net_RecvFrom | recvfrom wrapper; builds sockaddr, calls __imp_recvfrom | disasm + xrefs | high |
| 0x004E5E30 | 0x000E5E30 | Net_SendTo | sendto wrapper; builds sockaddr, calls __imp_sendto | disasm + xrefs | high |
| 0x005230F0 | 0x001230F0 | Net_Send | send wrapper; calls __imp_send | disasm + xrefs | med |
| 0x00523120 | 0x00123120 | Net_Recv | recv wrapper; calls __imp_recv | disasm + xrefs | med |
| 0x004F4520 | 0x000F4520 | Net_RecvFrom_Caller | upstream caller of Net_RecvFrom | xrefs | med |
| 0x004E5E90 | 0x000E5E90 | Net_SendTo_Caller | upstream caller of Net_SendTo | xrefs | low |
| 0x00522560 | 0x00122560 | Net_SendRecv_Caller | upstream caller of Net_Send/Recv wrappers | xrefs | med |

### Data (network config globals + constants)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x007362F4 | 0x003362F4 | g_MasterServerHost | CVar "MasterServer"; if null/empty defaults to fom1.fomportal.com | decomp + strings | high |
| 0x006BA4A8 | 0x002BA4A8 | s_DefaultMasterServer | "fom1.fomportal.com" | .rdata string | high |
| 0x007362EC | 0x003362EC | g_BindIP | CVar ?BindIP?; overrides local bind address for UDP sockets | decomp + strings | high |
| 0x007362F0 | 0x003362F0 | g_IPOverride | CVar ?IP?; overrides local IP string in UDP_BuildSockaddrFromString | decomp + strings | high |
| 0x006B9D18 | 0x002B9D18 | s_CVar_MasterServer | CVar name string "MasterServer" | .rdata string | high |
| 0x006B9D24 | 0x002B9D24 | s_CVar_IP | CVar name string "IP" | .rdata string | high |
| 0x006B9D28 | 0x002B9D28 | s_CVar_BindIP | CVar name string "BindIP" | .rdata string | high |
| 0x0071A528 | 0x0031A528 | g_QueryPortRange | Port-try count/range for CUDPDriver_StartQuery (retry loop) | decomp | med |
| 0x007363CC | 0x003363CC | g_QueryPortBase | Base port used when retrying StartQuery binds | decomp | med |
| 0x007363D0 | 0x003363D0 | g_QueryPortMRU | Last-used port for StartQuery (MRU cycling) | decomp | med |
| 0x006B31C0 | 0x002B31C0 | s_LauncherMagic | String "dpsmagic" used by RunClient launcher gate | .rdata string + decomp | high |
| 0x006B9724 | 0x002B9724 | s_CVar_IPClientPortMRU | CVar name "IPClientPortMRU" | .rdata string | med |
| 0x006B9734 | 0x002B9734 | s_CVar_IPClientPortRange | CVar name "IPClientPortRange" | .rdata string | med |
| 0x006B9748 | 0x002B9748 | s_CVar_IPClientPort | CVar name "IPClientPort" | .rdata string | med |
| 0x00712954 | 0x00312954 | s_IPClientPortMRU | Duplicate string used by UDP_UpdateClientPortMRU | decomp + hexdump | low |
| 0x006B9224 | 0x002B9224 | s_WorldPassword | "37eG87Ph" world password used in World_Connect | .rdata string + decomp | high |

### Code/Data (LithTech message handlers)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x00427480 | 0x00027480 | Init_MessageHandlers | Initializes g_MessageHandlers table | decomp | high |
| 0x0072AB88 | 0x0032AB88 | g_MessageHandlers | Message handler function table (msg id * 4) | decomp + xrefs | high |
| 0x00424EF0 | 0x00024EF0 | LithTech_HandleIDPacket | Msg ID 12 handler; reads u16 id + u8 flag; logs "Got ID packet (%d)" | decomp + string | high |
| 0x00426C00 | 0x00026C00 | LithTech_OnMessageGroupPacket | Msg ID 14 handler; iterates sub-messages; logs "invalid packet" on overflow | decomp + string | high |

### Message handlers (IDs 4..23)
| ID | VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|---|
| 4 | 0x00425060 | 0x00025060 | OnNetProtocolVersionPacket | Validates protocol version; logs LT_INVALIDNETVERSION on mismatch | decomp + string | high |
| 5 | 0x00424F40 | 0x00024F40 | OnUnloadWorldPacket | Clears client object id; unloads world | decomp + External/LithTech shellnet.cpp | med |
| 6 | 0x004266C0 | 0x000266C0 | OnLoadWorldPacket | Clears client object id; calls ClientShell_DoLoadWorld; sends MSG_ID 0x09 connect stage=0 | decomp + External/LithTech shellnet.cpp | med |
| 7 | 0x00425040 | 0x00025040 | OnClientObjectID | Reads u16 client object id | decomp + External/LithTech shellnet.cpp | high |
| 8 | 0x00426DF0 | 0x00026DF0 | OnUpdatePacket | Parses update entries; validates length; logs LT_INVALIDSERVERPACKET on error | decomp + string | high |
| 9 | 0x00000000 | 0x00000000 | NULL | No handler assigned | Init_MessageHandlers | high |
| 10 | 0x004260D0 | 0x000260D0 | OnUnguaranteedUpdatePacket | Per-object unguaranteed update (pos/rot/animinfo); uses UUF flags | decomp + External/LithTech shellnet.cpp | med |
| 11 | 0x00000000 | 0x00000000 | NULL | No handler assigned | Init_MessageHandlers | high |
| 12 | 0x00424EF0 | 0x00024EF0 | OnYourIDPacket | Reads u16 client id + u8 local flag; logs "Got ID packet (%d)" | decomp + string | high |
| 13 | 0x00426F50 | 0x00026F50 | OnMessagePacket | Wraps CSubMsg_Client and calls client shell OnMessage | decomp + External/LithTech shellnet.cpp | med |
| 14 | 0x00426C00 | 0x00026C00 | OnMessageGroupPacket | SMSG_PACKETGROUP: u8 **bit-length** + subpacket; length includes inner SMSG id bits; dispatched via g_MessageHandlers | decomp + string | high |
| 15 | 0x00426FC0 | 0x00026FC0 | OnConsoleVar | Reads var name + value strings (two reads) then applies via sub_974C90(dword_BF94C8+1184, name, value) | decomp | high |
| 16 | 0x00426360 | 0x00026360 | OnSkyDef | Reads 0x180 bits into sky data, then u16 count<=0x1E and u16 sky object IDs into dword_BF94C8+2444; invalid -> LT_ERROR | decomp + string | high |
| 17 | 0x00427050 | 0x00027050 | OnInstantSpecialEffect | MessagePacket_Parse + IClientShell_Default vtbl+0x64 (SpecialEffectNotify) | decomp | med |
| 18 | 0x00000000 | 0x00000000 | NULL | No handler assigned | Init_MessageHandlers | high |
| 19 | 0x004270D0 | 0x000270D0 | OnPreloadListPacket | subtype u8: 0/1 start/end, 2 model, 3 texture?, 4 sprite, 5 sound, 6 cached model; loads via rez managers, logs "model-rez: client preload ..." | decomp + strings | high |
| 20 | 0x004250F0 | 0x000250F0 | OnThreadLoadPacket | Reads u16 fileId; loads via sub_8EA5A0 (resource type=3) | decomp | med |
| 21 | 0x00425130 | 0x00025130 | OnUnloadPacket | Reads fileType(u8)+fileId(u16): type0 unload cached model via g_ModelRezMap; type2 unloads resource via dword_BFAF8C; else invalid | decomp + strings | med |
| 22 | 0x00425820 | 0x00025820 | OnGlobalLight | Reads 2x vec3 + ambient float (3x32 each) then calls dword_BFAB80 vtbl+0x130/+0x138/+0x140 | decomp | high |
| 23 | 0x00425230 | 0x00025230 | OnChangeChildModel | Reads parent/child model file IDs; resolves via g_ModelRezMap; logs missing object/model; applies via sub_93D8E0 | decomp + strings | high |

### Update sub-handlers (SMSG_UPDATE)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x00425ED0 | 0x00025ED0 | UpdateHandle_Group0 | Group 0: u16 blockId + u8 flags; optional u16+u8 scale fields; optional byte (flag 0x40); optional time-scale (sign bit); optional vec3 from packet or client object pos; ends with u32 + World_ApplyUpdateBlock | decomp | med |
| 0x004256B0 | 0x000256B0 | UpdateHandle_Group1 | Group 1: flags 0x1 spawn/refresh (Update_ReadBlock0_Alloc), 0x2 pos vec3 apply, 0x20 Object_HandleGroup1_Flag20; calls World_ApplyUpdateBlock when spawn set | decomp | med |
| 0x004267C0 | 0x000267C0 | UpdateHandle_GroupObjUpdate | Per-object update/spawn: if flags&1 reads obj-def (Update_ReadBlock_ObjectDef) + World_AddObjectFromUpdate, then Update_ValidateObject; if flags&1 and not local player, builds ObjectMsg packet and calls IClientShell_Default vtbl+0x64; if flags&0x800 calls vtbl+0x14 | decomp | med |
| 0x00424F60 | 0x00024F60 | UpdateHandle_Group3 | Group 3: remove object(s) by id; if obj flag 0x40 -> Object_HandlePendingRemoval; else World_RemoveObject/ObjectInstance_OnRemoved | decomp | low |

### Message layouts (source-aligned, FoM)
- ID 4 (SMSG_NETPROTOCOLVERSION): u32 version; u32 server bandwidth.
- ID 5 (SMSG_UNLOADWORLD): no payload.
- ID 6 (SMSG_LOADWORLD): ClientShell_DoLoadWorld(cPacket,false) (payload: float game time + u16 world file id).
- ID 7 (SMSG_CLIENTOBJECTID): u16 client object id.
- ID 8 (SMSG_UPDATE): loop: u32 **bitlen**; read updateFlags lo8; if (lo8 & 0x80) read hi8 and combine => u16 updateFlags.
  - if updateFlags != 0: read u16 objectId + UpdateHandle_GroupObjUpdate(objectId, updateFlags)
  - else: read groupTag u8: 0->UpdateHandle_Group0, 1->UpdateHandle_Group1 (then u8 flags + u16 id), 3->UpdateHandle_Group3
  - validates: endBit == startBit + bitlen; mismatch returns LT_INVALIDSERVERPACKET (44).
  - client validates consumed bits == bitlen; mismatch => LT_INVALIDSERVERPACKET (44)
  - CF_* flags (Update_ValidateObject): NEWOBJECT=0x1, POSITION=0x2, ROTATION=0x4, FLAGS=0x8, SCALE=0x10,
    MODELINFO=0x2020, RENDERINFO=0x40, ATTACHMENTS=0x100, FILENAMES=0x800, DIMS=0x8000

- ID 10 (SMSG_UNGUARANTEEDUPDATE): loop: u16 objectId; u4 flags; if objectId==0xFFFF then read float gameTime and end.
  - flags: 0x4 position (vec3) + optional vel bit + compressed vec3, 0x8 alt rotation (sub_97BFC0), 0x2 compressed quat, 0x1 modelinfo.
  - apply: Object_ApplyPosVel (pos+vel) + Object_ApplyRotationQuat (rot) + Update_ReadModelInfoBlock (anim/model info).

### Data (object templates)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x1011EBD0 | 0x0011EBD0 | ObjectTemplateTable | 0x80-byte records, u16 id at +0x00; contiguous ids starting at 1 (content does not match weapon stats) | file scan + id sequence | low |
| 0x1011EB50 | 0x0011EB50 | SoundEntryTable | 0x80-byte records; entry[31]=clipCount; weight/clip pairs start at entry[11]/[12] | decomp + data scan | low |

### Local player object / Vortex FX
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x1012EE50 | 0x0012EE50 | CGameServerShell_vftable | Vtable (RTTI ??_R4CGameServerShell@@6B@); slot +0x14 -> CreateLocalPlayerObj, +0x18 -> ClearLocalPlayerObj | vtable scan | med |
| 0x10039D50 | 0x00039D50 | CreateLocalPlayerObj | Creates CPlayerObj, binds to HCLIENT, sets g_pLocalPlayerObj | decomp | high |
| 0x100355A0 | 0x000355A0 | ClearLocalPlayerObj | Detaches from HCLIENT, clears g_pLocalPlayerObj | decomp | high |
| 0x101B4504 | 0x001B4504 | g_pLocalPlayerObj | Global pointer used by Tick_VortexActiveState / UpdateVortexActiveFx | xrefs + crash dump | high |
| 0x10079960 | 0x00079960 | Tick_VortexActiveState | State handler; calls UpdateVortexActiveFx in states 8/11/13 | decomp | med |
| 0x10013C90 | 0x00013C90 | UpdateVortexActiveFx | Every 10s fires "Vortex_Active" on playerObj->objectId | decomp + string | med |

- Crash: UpdateVortexActiveFx reads playerObj+0x9B0; if g_pLocalPlayerObj is 0xFFFFFFFF/NULL during state 8/11/13, access violation at Object.lto+0x13CAA.

### World login data (Object.lto)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10078D80 | 0x00078D80 | ID_WORLD_LOGIN_Read | Reads large world-login payload into pkt buffer (1072 bytes + extended data blocks) | decomp | med |
| 0x1007AD90 | 0x0007AD90 | Handle_ID_WORLD_LOGIN | Validates worldId/worldInst, branches on pktReturnCode, caches world data, writes spawn/rot into g_pLocalPlayerObj | decomp + strings | med |
| 0x1007A850 | 0x0007A850 | Packet_ID_WORLD_LOGIN_DATA_Ctor | Initializes 0x79 payload defaults (id=0x79, flags, compact vec init) | decomp | med |
| 0x10056F20 | 0x00056F20 | DispatchGameMsg | Message dispatch; msgId 0x79 routes to Handle_ID_WORLD_LOGIN | decomp | med |
| 0x10035BF0 | 0x00035BF0 | CGameServerShell_OnMessage | Trampoline into DispatchGameMsg (engine callback) | decomp + xref | med |
| 0x10051CA0 | 0x00051CA0 | Handle_MSG_ID_WORLD_UPDATE | Packet_ID_WORLD_UPDATE handler: reads (playerId, seq?) then up to 101 entries; spawns/updates CCharacter/Enemy/Turret | decomp | med |
| 0x10086B50 | 0x00086B50 | Handle_MSG_ID_WEATHER | Packet_ID_WEATHER handler; decodes packed weather fields into local cache | decomp | low |
| 0x10062680 | 0x00062680 | Handle_MSG_ID_ATTRIBUTE_CHANGE | Packet_ID_ATTRIBUTE_CHANGE handler; applies attribute list and triggers local FX gates | decomp | low |
| 0x10050550 | 0x00050550 | Handle_MSG_ID_84_HIT | Packet_ID_HIT handler; if target==local player triggers hit reaction | decomp | med |
| 0x10056AC0 | 0x00056AC0 | Handle_MSG_ID_WORLD_OBJECTS | Packet_ID_WORLD_OBJECTS handler; multi-subtype list payload (ids 0x1FA..0x204) | decomp | low |
| 0x10050680 | 0x00050680 | Handle_MSG_ID_EXPLOSIVE | Packet_ID_EXPLOSIVE handler; by objectId + subtype; applies effects to CCharacter | decomp | low |
| 0x1005F0D0 | 0x0005F0D0 | Handle_MSG_ID_AVATAR_CHANGE | Packet_ID_AVATAR_CHANGE handler; applies profile block C and updates shared strings | decomp | low |
| 0x10050840 | 0x00050840 | Handle_MSG_ID_CHAT | Packet_ID_CHAT handler; chat/notification routing + colored text | decomp | low |
| 0x10050DF0 | 0x00050DF0 | Handle_MSG_ID_TAUNT | Packet_ID_TAUNT handler; plays taunt + optional local chat | decomp | low |
| 0x100510B0 | 0x000510B0 | Handle_MSG_ID_OBJECT_DETAILS | Packet_ID_OBJECT_DETAILS handler; updates character metadata strings | decomp | low |

- UI msgs observed in Handle_ID_WORLD_LOGIN failure paths: 1721, 1722, 1724.

### Chat / Taunt helpers (Object.lto)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10046F40 | 0x00046F40 | ChatLog_AddEntry | Pushes chat log entry into shared table (max 0x14 entries) | decomp | low |
| 0x1004C900 | 0x0004C900 | ChatNameCache_SetEntry | Writes name cache entry (id + name + lowercase) | decomp | low |
| 0x1004C9E0 | 0x0004C9E0 | ChatNameCache_InsertOrUpdate | Update or append name cache (max 0x32 entries) | decomp | low |
| 0x1004E150 | 0x0004E150 | ChatNameCache_Reset | Clears name cache entries and resets count | decomp | low |
| 0x1000B480 | 0x0000B480 | SoundEntryTable_GetEntry | Returns sound entry pointer (id 0..0x18A) | decomp | low |
| 0x1000B520 | 0x0000B520 | SoundEntryTable_GetEntry_Thunk | Thunk to SoundEntryTable_GetEntry | disasm | low |
| 0x10070510 | 0x00070510 | SoundEntry_SelectClipPath | Weighted pick of clip path from entry | decomp | low |
| 0x10070CB0 | 0x00070CB0 | SoundEntry_PlayEntry | Builds audio event from sound entry and enqueues | decomp | low |
| 0x100711B0 | 0x000711B0 | SoundEntry_PlayById | Look up sound entry then play | decomp | low |
| 0x100706B0 | 0x000706B0 | SoundEntryList_BuildNameList | Fills UI list with entry names (max len) | decomp | low |
| 0x100704C0 | 0x000704C0 | AudioEvent_Enqueue | Enqueues audio event payload into shared queue | decomp | low |
| 0x10070BE0 | 0x00070BE0 | AudioEvent_EnqueueFromObject | Builds audio event from object + string | decomp | low |
| 0x10070DE0 | 0x00070DE0 | SoundEntry_PlayForObject | Plays sound entry relative to object | decomp | low |
| 0x10070EF0 | 0x00070EF0 | AudioEvent_EnqueueAtPos | Builds audio event at world position | decomp | low |
| 0x10071080 | 0x00071080 | SoundEntry_PlayAtPos | Plays sound entry at world position | decomp | low |
| 0x10046D90 | 0x00046D90 | AudioEvent_InitDefaults | Initializes audio event defaults | decomp | low |
| 0x10046B20 | 0x00046B20 | AudioEventQueue_Push | Pushes event into queue (max 0x64 entries) | decomp | low |

SoundEntry (SoundEntryTable) layout (partial, 0x80 bytes):
- +0x00 u32 id
- +0x04 char* name (C string)
- +0x0C float minDist (copied into AudioEvent f68)
- +0x10 float maxDist (copied into AudioEvent f69)
- +0x14 float pitchOrRolloff (copied into AudioEvent f71)
- +0x18 float playChance (if <1.0, random gate)
- +0x1C u8 volumePercent (0..100) -> f70 (0..1)
- +0x20 u32 flagsOrGroup (copied into AudioEvent dword)
- +0x24 float useObjectPos (nonzero -> pull object position in SoundEntry_PlayEntry)
- +0x2C float weight0
- +0x30 char* clip0
- subsequent pairs: weight1/clip1 at +0x34/+0x38, etc
- +0x7C u32 clipCount

Taunt (msgId 0x96) uses SoundEntryTable[tauntId] to pick the clip path (weighted by weightN).
SoundEntry_SelectClipPath:
- sums weights (float) -> casts sum to int for Rand_IntInclusive
- picks first weight bucket where cumulative > randomInt

AudioEvent payload (0x148 bytes, as written by AudioEvent_Enqueue):
- +0x000 char path[260] (sound/FX path)
- +0x104 float f65
- +0x108 float f66
- +0x10C float f67
- +0x110 float f68
- +0x114 float f69
- +0x118 float f70
- +0x11C float f71
- +0x120 float f72 (default 10.0)
- +0x124 float f73 (default 500.0)
- +0x128 float f74 (default 1.0)
- +0x12C float f75 (default 1.0)
- +0x130 float f76
- +0x134 float f77
- +0x138 float f78
- +0x13C u32 linkA (AudioEvent_Enqueue writes *this)
- +0x140 u32 linkB (AudioEvent_Enqueue writes *(this+1))
- +0x144 u32 linkC (cleared to 0)
Defaults for f65..f78 are set by AudioEvent_InitDefaults; positions/volumes override in SoundEntry_* helpers.

### Appearance helpers (Object.lto)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10015DC0 | 0x00015DC0 | AppearanceEntry_Reset | Zeroes 124-byte appearance/identity block | decomp | low |
| 0x100143A0 | 0x000143A0 | AppearanceEntry_Clear | Zeroes 124-byte appearance/identity block (inner helper) | decomp | low |

### Sound emitter (Object.lto)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10070180 | 0x00070180 | SoundEmitter_Create | Allocates/initializes sound emitter object | disasm | low |
| 0x100701B0 | 0x000701B0 | SoundEmitter_PlayNow | Builds AudioEvent from emitter fields and enqueues | decomp | low |
| 0x100702D0 | 0x000702D0 | SoundEmitter_Update | Tick: plays at interval (rand between min/max) | decomp | low |
| 0x10070360 | 0x00070360 | SoundEmitter_Stop | Stops/restarts emitter based on flags and timing | decomp | low |
| 0x10070420 | 0x00070420 | SoundEmitter_OnMessage | Message handler: stop/update based on msg, forwards | disasm | low |
| 0x10001390 | 0x00001390 | ClientObj_OnMessageDispatch | Forwards engine message to object vtbl handler | disasm | low |
| 0x10001080 | 0x00001080 | ClientObj_OnMessageDispatch_WithSender | Dispatch w/ sender + extra args | disasm | low |

SoundEmitter fields (partial, from SoundEmitter_PlayNow/Stop/Update):
- +0x08 HOBJECT (used for position + stop calls)
- +0x40 s32 soundEntryId (?1 disables)
- +0x44 s32 lastEventHandle (AudioEvent_Enqueue return)
- +0x48 float minDist
- +0x4C float maxDist
- +0x50 u8 volumePercent
- +0x54 float pitchOrRolloff
- +0x5C bool playAttached
- +0x64 u8 flags/group
- +0x68 bool repeat
- +0x6C float repeatTimeMin
- +0x70 float repeatTimeMax
- +0x74 float nextPlayTime

Property strings near 0x10139078 include: RepeatTimeMax, RepeatTimeMin, Repeat, PlayAttached, PitchShift (likely SoundEmitter props).

### Math / visibility helpers (Object.lto)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10013E30 | 0x00013E30 | Vec3_LengthSq | Returns squared length of vec3 | decomp | high |
| 0x1006D790 | 0x0006D790 | LTServer_IsLineOfSightClear | Raycast between two objects; returns true if clear | decomp | med |
| 0x10007EA0 | 0x00007EA0 | Rand_IntInclusive | rand() % (n+1) (or -1..0 when n==-1) | decomp | low |
| 0x10007F10 | 0x00007F10 | Rand_FloatRange | Returns uniform float in [min, max] | decomp | low |

### Object render helpers (Object.lto)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x1000D290 | 0x0000D290 | Obj_SetAlphaAndHiddenFlag | Sets alpha and toggles hidden flag when alpha==0 | decomp | low |

### Text parser helpers (Object.lto)
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x100E26B0 | 0x000E26B0 | TextParser_StripMarkupTags | Parses text and strips tag markup into std::string | decomp | low |
| 0x100E22D0 | 0x000E22D0 | TextParser_NextToken | Tokenizes `<tag>` stream; returns token type | decomp | low |
| 0x100E2280 | 0x000E2280 | TextParser_ReadNonWhitespace | Returns next non-whitespace char from stream | decomp | low |

### MasterDatabase / internal DB APIs
| VA | RVA | Symbol | Purpose | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10004D50 | 0x00004D50 | ObjDB_ListInsert | Intrusive list insert helper | bytes + call sites | med |
| 0x10004D90 | 0x00004D90 | ObjDB_ListRemove | Intrusive list remove helper | bytes + call sites | med |
| 0x10004FC0 | 0x00004FC0 | ObjDB_ProcessTables | Table iteration/dispatch loop (walks list, calls handlers) | bytes + call pattern | low |
| 0x10005420 | 0x00005420 | ObjDB_Master_Init | Master DB init/ctor (vtbl=0x10114440, allocs 0x0C) | bytes + field init | med |
| 0x100054A0 | 0x000054A0 | ObjDB_Master_Dtor | Master DB destructor/clear (frees lists/blocks) | bytes + call sites | med |
| 0x100054F0 | 0x000054F0 | ObjDB_Master_Build | Master DB setup/dispatch (calls vtbl+0x10 path) | bytes + call pattern | low |
| 0x10005608 | 0x00005608 | ObjDB_Master_CallSlot0C | Master DB dispatch via vtbl+0x0C | bytes + vtbl call | low |
| 0x100056B8 | 0x000056B8 | ObjDB_Master_CallSlot08 | Master DB dispatch via vtbl+0x08 | bytes + vtbl call | low |
| 0x10005840 | 0x00005840 | Server_Call_50_vtbl88 | Calls vtbl+0x88 on *(this+0x50) with arg | disasm | low |
| 0x10005BA0 | 0x00005BA0 | ObjDB_Master_CtorThunk | Sets vptr (0x1011446C) then tail-jumps | bytes (mov vptr + jmp) | low |
| 0x10114440 | 0x00114440 | ObjDB_Master_vftable | Master DB vtable (vptr set in ObjDB_Master_Init) | bytes (vtbl ptr) | med |

### Vtable slots (ObjDB_Master_vftable):
- +0x00 -> 0x10005A80 ObjDB_Master_Vfn00
- +0x04 -> 0x10005B80 ObjDB_Master_Vfn04
- +0x08 -> 0x10004F00 ObjDB_Master_Vfn08
- +0x0C -> 0x10004E30 ObjDB_Master_Vfn0C
- +0x10 -> 0x10005280 ObjDB_Master_Vfn10
- +0x14 -> 0x100048F0 ObjDB_Master_Vfn14
- +0x18 -> 0x10004890 ObjDB_Master_Vfn18
- +0x1C -> 0x10004DD0 ObjDB_Master_Vfn1C
- +0x20 -> 0x10004950 ObjDB_Master_Vfn20
- +0x24 -> 0x10004250 ObjDB_Master_Vfn24
- +0x28 -> 0x1018C58C ObjDB_Master_VtblData_28 (data, unknown)
- +0x2C -> 0x10005BB0 ObjDB_Master_Vfn2C
- +0x30/+0x34/+0x38 -> 0x10102324 thunk__purecall (IAT thunk -> _purecall)
- +0x3C -> 0x1018C5A0 ObjDB_Master_VtblData_3C (data, unknown)

### IAT thunks near vtable:
- 0x10102324 thunk__purecall -> [0x10113278] _purecall
- 0x1010232A thunk__strncpy_s -> [0x1011327C] strncpy_s
- 0x10102330 thunk__rand -> [0x10113280] rand
- 0x10102336 thunk___CIatan2 -> [0x10113284] _CIatan2
- 0x1010233C thunk___CIcos -> [0x10113288] _CIcos
- 0x10102342 thunk___CIsin -> [0x1011328C] _CIsin
- 0x10102224 thunk__op_new -> [0x10113268] operator new
- 0x1010222A thunk__sprintf -> [0x1011326C] sprintf
- 0x101021F0 thunk__op_delete -> [0x10113250] operator delete

### Vtable call graph (IDA callees, no decomp/disasm):
- Vfn00 (0x10005A80) calls: ObjDB_Array_GetPtr, ObjDB_Array_GetPtr2, ObjDB_Index_GetByIdx, ObjDB_Index_Create, ObjDB_Index_BinSearch, ObjDB_Index_Ensure, ObjDB_Master_RebuildIndexes, thunk__op_new
- Vfn04 (0x10005B80) calls: ObjDB_Master_Dtor (0x100054A0), thunk__op_delete
- Vfn08 (0x10004F00) calls: ObjDB_Index_GetByIdx, ObjDB_Index_Create, ObjDB_Index_BinSearch, ObjDB_Index_Ensure, ObjDB_List_CallVfn8, thunk__op_new
- Vfn0C (0x10004E30) calls: ObjDB_Index_GetByIdx, ObjDB_Index_Create, ObjDB_Index_BinSearch, ObjDB_Index_Ensure, ObjDB_List_ForEachA, thunk__op_new
- Vfn10 (0x10005280) calls: ObjDB_Index_GetByIdx, ObjDB_Index_Create, ObjDB_Index_BinSearch, ObjDB_Index_Ensure, ObjDB_Master_ProcessTable, thunk__op_new
- Vfn14 (0x100048F0) calls: ObjDB_Index_GetByIdx, ObjDB_List_Add, ObjDB_Index_Ready, ObjDB_Array_Find
- Vfn18 (0x10004890) calls: ObjDB_Index_GetByIdx, ObjDB_List_Add2, ObjDB_Index_Ready, ObjDB_Array_Find
- Vfn1C (0x10004DD0) calls: ObjDB_Index_GetByIdx, ObjDB_Index_Rebuild, ObjDB_Index_Ready, ObjDB_Array_Find
- Vfn20 (0x10004950) calls: ObjDB_Index_GetByIdx, ObjDB_List_RemoveMaybe
- Vfn24 (0x10004250) calls: ObjDB_Array_GetPtr
- Vfn2C (0x10005BB0) calls: ObjDB_Master_CtorThunk (0x10005BA0), thunk__op_delete

### Helper cluster (renamed, no decomp/disasm):
| VA | RVA | Symbol | Purpose (inferred) | Evidence | Conf |
|---|---|---|---|---|---|
| 0x10004720 | 0x00004720 | ObjDB_Index_GetByIdx | Index lookup by id (calls ObjDB_Index_AllocSlots) | bytes + call chain | low |
| 0x10004300 | 0x00004300 | ObjDB_Index_Create | Create index struct (allocs, sets vtbl 0x10114438) | bytes + alloc pattern | low |
| 0x10004B90 | 0x00004B90 | ObjDB_Index_BinSearch | Binary search over index entries | bytes + loop pattern | low |
| 0x100038E0 | 0x000038E0 | ObjDB_Index_Ensure | Ensure list/index allocated (uses memset) | bytes + memset | low |
| 0x100038A0 | 0x000038A0 | ObjDB_Index_CopyHeader | Copy/init header (memcpy) | bytes + memcpy | low |
| 0x10004A10 | 0x00004A10 | ObjDB_List_ForEachA | Iterates list + callback | bytes + call chain | low |
| 0x10004A40 | 0x00004A40 | ObjDB_List_CallVfn8 | Calls vtbl+8 on list items | bytes + vtbl call | low |
| 0x10004A70 | 0x00004A70 | ObjDB_Index_Rebuild | Rebuilds index (calls Array_* + List_Iterate) | call graph | low |
| 0x10004470 | 0x00004470 | ObjDB_Index_Ready | Ready check / counts (uses Array_* helpers) | call graph | low |
| 0x100044C0 | 0x000044C0 | ObjDB_List_Add | Add element to list | call chain | low |
| 0x100044A0 | 0x000044A0 | ObjDB_List_Add2 | Add element (variant; uses ObjDB_Array_FindIdx) | call chain | low |
| 0x100044E0 | 0x000044E0 | ObjDB_List_RemoveMaybe | Remove element or status | call chain | low |
| 0x10003B10 | 0x00003B10 | ObjDB_Array_GetPtr | Array ptr getter | bytes | low |
| 0x10003B20 | 0x00003B20 | ObjDB_Array_GetPtr2 | Array ptr getter (variant) | bytes | low |
| 0x10003B40 | 0x00003B40 | ObjDB_Array_Find | Linear/array search | bytes | low |
| 0x10003C70 | 0x00003C70 | ObjDB_Array_Pop | Pop/decrement helper | bytes | low |
| 0x10003D40 | 0x00003D40 | ObjDB_Array_GetPtr4 | Array ptr getter (variant) | bytes | low |
| 0x10003D00 | 0x00003D00 | ObjDB_Array_FindIdx | Linear search returning index | bytes | low |
| 0x10003BD0 | 0x00003BD0 | ObjDB_StructZero1 | Zero-init helper (memset) | bytes + calls | low |
| 0x10003CD0 | 0x00003CD0 | ObjDB_StructZero2 | Zero-init helper (memset) | bytes + calls | low |
| 0x10003DE0 | 0x00003DE0 | ObjDB_StructZero3 | Zero-init helper (memset) | bytes + calls | low |
| 0x10003EC0 | 0x00003EC0 | ObjDB_Index_AllocSlots | Alloc index slots | bytes | low |
| 0x10003B90 | 0x00003B90 | ObjDB_Index_Init1 | Index init helper | calls memcpy | low |
| 0x10003C90 | 0x00003C90 | ObjDB_Index_Init2 | Index init helper | calls memcpy | low |
| 0x10003DA0 | 0x00003DA0 | ObjDB_Index_Init3 | Index init helper | calls memcpy | low |
| 0x100047E0 | 0x000047E0 | ObjDB_Index_BinSearchEx | Binsearch variant | calls ObjDB_Index_Sort3 | low |
| 0x100039E0 | 0x000039E0 | ObjDB_List_Next | Next pointer helper | bytes | low |
| 0x10004780 | 0x00004780 | ObjDB_Index_Build1 | Builds index (sort) | calls memcpy+memset | low |
| 0x100047B0 | 0x000047B0 | ObjDB_Index_Build2 | Builds index (sort) | calls memcpy+memset | low |
| 0x10004830 | 0x00004830 | ObjDB_Index_InsertSorted | Insert into sorted index | bytes + loop | low |
| 0x10004C70 | 0x00004C70 | ObjDB_Index_InsertMulti | Insert multiple entries (calls InsertSorted) | call graph | low |
| 0x10003C20 | 0x00003C20 | ObjDB_Array_SetRange | Set array range | bytes | low |
| 0x10003BF0 | 0x00003BF0 | ObjDB_Array_Clear | Clear array | bytes | low |
| 0x10003C00 | 0x00003C00 | ObjDB_Array_Set | Set array entry | bytes | low |
| 0x10004550 | 0x00004550 | ObjDB_List_Iterate1 | List iteration helper | call graph | low |
| 0x100045A0 | 0x000045A0 | ObjDB_List_Iterate2 | List iteration helper | call graph | low |
| 0x10003CF0 | 0x00003CF0 | ObjDB_List_Reset | Reset list head | bytes | low |
| 0x10003E50 | 0x00003E50 | ObjDB_List_FindInsertPos | Find insert pos (sort) | bytes | low |
| 0x100040C0 | 0x000040C0 | ObjDB_Index_Sort3 | Sort helper (memcpy+memset) | call graph | low |
| 0x10004000 | 0x00004000 | ObjDB_Index_Sort1 | Sort helper (memcpy+memset) | call graph | low |
| 0x10004060 | 0x00004060 | ObjDB_Index_Sort2 | Sort helper (memcpy+memset) | call graph | low |
| 0x10003D80 | 0x00003D80 | ObjDB_List_Count | Count items in list | bytes | low |
| 0x10003E00 | 0x00003E00 | ObjDB_List_GetHead | Returns head pointer | bytes | low |
| 0x10003E10 | 0x00003E10 | ObjDB_Array_GetPtr3 | Array ptr getter (variant) | bytes | low |
| 0x10003EA0 | 0x00003EA0 | ObjDB_Array_GetPtr5 | Array ptr getter (variant) | bytes | low |
| 0x10004990 | 0x00004990 | ObjDB_Index_Clear | Clears index structs (memset + zero helpers) | call graph | low |
| 0x10004FD0 | 0x00004FD0 | ObjDB_Index_Dtor | Index destructor (clears + delete) | call graph | low |
| 0x10114438 | 0x00114438 | ObjDB_Index_vftable | Index vtable (extends Master vtable) | bytes | low |
| 0x1018C544 | 0x0018C544 | ObjDB_Index_VtblData_04 | Vtable data (unknown) | bytes | low |
| 0x10005000 | 0x00005000 | ObjDB_Master_ProcessTable | Master vfn helper (uses list iterate + index ops) | call graph | low |
| 0x100055B0 | 0x000055B0 | ObjDB_Master_AddIndex_A | Alloc + link index list (uses op_new + list ops) | call graph | low |
| 0x10005660 | 0x00005660 | ObjDB_Master_AddIndex_B | Alloc + link index list (uses op_new + list ops) | call graph | low |
| 0x10005740 | 0x00005740 | ObjDB_Master_RebuildIndexes | Rebuild indexes for tables | call graph | low |

### Vtable slots (ObjDB_Index_vftable):
- +0x00 -> 0x10004FD0 ObjDB_Index_Dtor
- +0x04 -> 0x1018C544 ObjDB_Index_VtblData_04 (data)
- +0x08 -> 0x10005A80 ObjDB_Master_Vfn00
- +0x0C -> 0x10005B80 ObjDB_Master_Vfn04
- +0x10 -> 0x10004F00 ObjDB_Master_Vfn08
- +0x14 -> 0x10004E30 ObjDB_Master_Vfn0C
- +0x18 -> 0x10005280 ObjDB_Master_Vfn10
- +0x1C -> 0x100048F0 ObjDB_Master_Vfn14
- +0x20 -> 0x10004890 ObjDB_Master_Vfn18
- +0x24 -> 0x10004DD0 ObjDB_Master_Vfn1C
- +0x28 -> 0x10004950 ObjDB_Master_Vfn20
- +0x2C -> 0x10004250 ObjDB_Master_Vfn24

### CRT thunks:
- 0x1010231E thunk__memset -> [0x10113270] memset
- 0x10101F87 thunk__memcpy -> [0x10113298] memcpy
