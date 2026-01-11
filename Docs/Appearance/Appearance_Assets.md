# Appearance Assets (ProfileC)

Scope
- Map ProfileC appearance fields to asset paths under `Client/Client_FoM/Resources`.
- Source: `CShell.dll` `Character_BuildSkinPaths` (0x65704850) and ProfileC bitfield docs.

Head textures (headTexA, 0..27)
- Asset path: `Skins/Characters/Head/<name>.dtx`
- Out-of-range index falls back to 0.

| idx | male | female |
| --- | --- | --- |
| 0 | m_Face1_1 | f_Face1_1 |
| 1 | m_Face2_2 | f_Face2_2 |
| 2 | m_Face3_3 | f_Face3_3 |
| 3 | m_Face4_4 | f_Face4_4 |
| 4 | m_Face4_5 | f_Face4_5 |
| 5 | m_Face1_6 | f_Face1_6 |
| 6 | m_Face1_7 | f_Face1_7 |
| 7 | m_Face1_8 | f_Face1_8 |
| 8 | m_Face1_9 | f_Face1_9 |
| 9 | m_Face2_10 | f_Face2_10 |
| 10 | m_Face2_11 | f_Face2_11 |
| 11 | m_Face2_12 | f_Face2_12 |
| 12 | m_Face2_13 | f_Face2_13 |
| 13 | m_Face3_14 | f_Face3_14 |
| 14 | m_Face3_15 | f_Face3_15 |
| 15 | m_Face3_16 | f_Face3_16 |
| 16 | m_Face3_17 | f_Face3_17 |
| 17 | m_Face4_18 | f_Face4_18 |
| 18 | m_Face4_19 | f_Face4_19 |
| 19 | m_Face4_20 | f_Face4_20 |
| 20 | m_Face1_21 | f_Face1_21 |
| 21 | m_Face2_22 | f_Face2_22 |
| 22 | m_Face3_23 | f_Face3_23 |
| 23 | m_Face1_24 | f_Face1_24 |
| 24 | m_Face2_25 | f_Face2_25 |
| 25 | m_Face3_26 | f_Face3_26 |
| 26 | m_Face4_27 | f_Face4_27 |
| 27 | m_Face4_28 | f_Face4_28 |

Hair textures (headTexB, 0..22)
- Asset path: `Skins/Characters/Head/<name>.dtx`
- Out-of-range index falls back to 0.

| idx | male | female |
| --- | --- | --- |
| 0 | m_Hair1_1 | f_Hair1_1 |
| 1 | m_Hair1_2 | f_Hair1_2 |
| 2 | m_Hair1_3 | f_Hair1_3 |
| 3 | m_Hair2_4 | f_Hair2_4 |
| 4 | m_Hair2_5 | f_Hair2_5 |
| 5 | m_Hair2_6 | f_Hair2_6 |
| 6 | m_Hair3_7 | f_Hair3_7 |
| 7 | m_Hair3_8 | f_Hair3_8 |
| 8 | m_Hair3_9 | f_Hair3_9 |
| 9 | m_Hair4_10 | f_Hair4_10 |
| 10 | m_Hair4_11 | f_Hair4_11 |
| 11 | m_Hair4_12 | f_Hair4_12 |
| 12 | m_Hair5_13 | f_Hair5_13 |
| 13 | m_Hair5_14 | f_Hair5_14 |
| 14 | m_Hair5_15 | f_Hair5_15 |
| 15 | m_Hair6_16 | f_Hair6_16 |
| 16 | m_Hair7_17 | f_Hair7_17 |
| 17 | m_Hair8_18 | f_Hair8_18 |
| 18 | m_Hair9_19 | f_Hair9_19 |
| 19 | m_Hair10_20 | f_Hair10_20 |
| 20 | m_Hair11_21 | f_Hair11_21 |
| 21 | m_Hair12_22 | f_Hair12_22 |
| 22 | m_Hair13_23 | f_Hair13_23 |

Skin tone usage (skinColor)
- 0 = White, 1 = Black.
- Used only for default "General" skins when the item template does not supply a specific skin list.
- Torso defaults:
  - Female: if model key == "Torso2" -> `Skins/Characters/General/f_AVG_Torso2_{White|Black}.dtx`
  - Female: else -> `Skins/Characters/General/f_AVG_Torso1_{White|Black}.dtx`
  - Male: if model key == "Torso1" -> `Skins/Characters/General/m_AVG_Torso1_{White|Black}.dtx`
- Legs defaults (female-only in current CShell logic):
  - model key "Legs3" -> `Skins/Characters/General/f_AVG_Legs3_{White|Black}.dtx`
  - model key "Legs1" -> `Skins/Characters/General/f_AVG_Legs1_{White|Black}.dtx`
- Hands default when no hand item is present:
  - `Skins/Characters/General/{m|f}_Hands1_{White|Black}.dtx`

Torso/legs/shoes/accessory IDs -> assets
- ProfileC item IDs (torsoTypeId/legsTypeId/shoesTypeId + slots) resolve through `g_ItemTemplateById` at runtime.
- `Character_BuildSkinPaths` consumes template strings:
  - +0x14: skin list / skin path (copied into appearance cache)
  - +0x1C: model key (compared to "Torso1"/"Torso2"/"Legs1"/"Legs3" and used for model attachment)
- Runtime dump required to map item IDs -> strings; use the script below once resources are loaded.

Dump script (CShell.dll, runtime)
- Script: `Scripts/dump_itemtemplate_appearance.py`
- Output: `Docs/Appearance/Appearance_ItemTemplate.csv`
- Requirements: IDA debugger attached to client; pause after character creation/world load.
- Filters for template types: 11/13 (torso), 12/14 (legs), 15 (shoes), 5/7 (accessories/slots).

Hook dump (CShell.dll, runtime)
- Config keys (fom_hook.ini):
  - `Items.AppearanceDump=1`
  - `Items.AppearanceDumpPath=..\\Docs\\Appearance\\Appearance_ItemTemplate.csv`
- Output: same CSV as above, no IDA required (runs from injected hook).
- Note: Item names in the CSV are joined from `Docs/ItemCatalog/CRes_*_items.csv` using `item_id + 1`.

Model key -> model asset hints
- Keys observed in resources map directly to `Resources/Models/Items/Characters/*.ltb`, for example:
  - Torso1..4 -> `m_Torso1.ltb` / `f_Torso1.ltb` (gendered)
  - Legs1..4 -> `m_Legs1.ltb` / `f_Legs1.ltb`
  - Shoes1..4 -> `m_Shoes1.ltb` / `f_Shoes1.ltb`
  - Hands1..2 -> `m_Hands1.ltb` / `f_Hands1.ltb`
  - TorsoArmour1..7, ArmPads1..7, ShoulderPads1..7, LegPads1..7, Helmet1..7, Glasses1..7
