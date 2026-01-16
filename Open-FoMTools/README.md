# Open-FoM Tools (GUI + CLI)

Purpose: a small Tkinter app + standalone scripts for FoM/LithTech Jupiter assets (worlds, models, textures). This folder is intended to be self-contained and to run with stock Python 3 (no third-party deps).

Note: the GUI runs tool scripts from `Open-FoMTools/` (see `TOOLS_DIR` in `app.py`).

## Layout
- `app.py`: Tkinter GUI shell and job runner.
- `fom_dat_tool.py`: DAT -> LTA + manifest + optional asset copy.
- `fom_dat_dump.py`: DAT diagnostic dump -> JSON + OBJ (render/BSP).
- `fom_dtx_to_png.py`: DTX -> PNG converter (batch capable).
- `ltb_exporter.py`: LTB -> OBJ/MTL (+ optional glTF/bin).
- `ltb_to_lta.py`: LTB -> LTA (custom writer for DEdit).
- `obj_triangulate_gltf.py`: OBJ -> triangulated OBJ + glTF.
- `raknet_decrypt.py`: standalone RakNet decryptor (not used by the GUI).
- `Output/`: default GUI output root.
- `lithtools 0.5/`: external viewer/exporter binary (not wired to the GUI).

## GUI Architecture (app.py)
High-level structure:
- **Sidebar** (nav): buttons for each tool page, plus tooltips from `page_help`.
- **Topbar**: title + description for the active page.
- **Main page container**: one page per tool.
- **Jobs + Logs panel** (right): active jobs, live stdout/stderr stream, cancel button.

Key components:
- `Job`: tracks id, title, command list, status, start time, exit code.
- `Tooltip`: tiny hover popup used for sidebar descriptions.
- `format_cmd()`: renders command preview with quoting.
- `abs_from_repo()`: resolves relative paths against repo root (used for Output).

Job execution flow:
- Page UI builds `cmd_list` (single command or list of commands).
- `_run_tool()` creates `Job` records and enqueues them.
- `_start_job()` launches `subprocess.Popen()` with `stdout`/`stderr` pipes.
- Two threads read `stdout` and `stderr` -> push lines into `log_queue`.
- `_poll_log_queue()` runs every 100ms on the UI thread; appends lines into log panel.
- Queue is **single-file**: jobs run sequentially; `_kick_queue()` starts next job.
- "Cancel Current" calls `process.terminate()` and logs the cancel.

Output handling:
- GUI uses `DEFAULT_OUT = Open-FoMTools/Output` (relative to repo root).
- “Open Output Folder” tries `--out` or `--out-root` from the command; otherwise opens default Output.

## Script Deep Dive

### fom_dat_tool.py (DAT -> LTA + manifest)
Purpose: parse LithTech Jupiter world DAT (FoM) and emit an editable LTA + asset manifest.

Core pieces:
- `BinaryReader`: low-level reads (u8/u16/u32/f32, strings, vectors).
- World model structs: `WorldTree`, `WorldBSP`, `WorldSurface`, `WorldPoly`, `WorldLeaf`, etc.
- Object parsing: `WorldObjectHeader`, `WorldObject`, `ObjectProperty`.
- Optional render data (`RenderData`) to capture UVs and render textures.
- `DatFile.read(path, parse_render=True)`: central parse entry point.
- `LTAWriter`: writes world geometry, objects, and properties to LTA.
- `build_manifest()`: gathers textures and resource candidates.
- `copy_assets() / copy_all_resources()`: copies referenced assets to Output.

CLI:
```
python fom_dat_tool.py <inputs...> --out <dir> [--lta] [--manifest] [--copy-assets]
                         [--copy-all-resources] [--skip-render-data] [--recursive]
```
Behavior:
- If neither `--lta` nor `--manifest` are set, it writes both.
- Outputs:
  - `Output/Worlds/<name>.lta`
  - `Output/Manifest/<name>.manifest.json`
  - Optional `Output/Resources/...` (assets or full Resources tree)

Notes:
- `--resources-root` defaults to `Client/Client_FoM/Resources`.
- `--skip-render-data` speeds parsing but skips UV extraction.

### fom_dat_dump.py (DAT diagnostic dump)
Purpose: deep inspection dump of a DAT with OBJ visibility output.

Core behavior:
- Reads DAT header + world BSP + objects.
- Attempts render-data parse with vertex size **44** then **68**.
- Writes:
  - `<name>_dump.json` (header, world info, objects, render summary).
  - OBJ/MTL exports:
    - **Render OBJ** (if render data parsed) with UVs.
    - **BSP OBJ** (optional, no UVs).
- If textures are enabled, it uses `fom_dtx_to_png.py` to convert DTX and map `map_Kd`.

CLI:
```
python fom_dat_dump.py --dat <file.dat> --out <dir>
                       [--resources <root>] [--png-root <dir>]
                       [--include-bsp] [--no-textures]
```

Outputs:
- `<out>/<name>_dump.json`
- `<out>/<name>_render.obj/.mtl` (if render data is valid)
- `<out>/<name>_wm*.obj/.mtl` for world models (render data)
- `<out>/<name>_bsp*.obj/.mtl` when BSP export is enabled

### fom_dtx_to_png.py (DTX -> PNG)
Purpose: convert LithTech `.dtx` texture files into PNG.

Highlights:
- Parses DTX headers and mip blocks.
- Supports multiple bit depths and emits RGBA.
- Can export a single file or mirror an entire directory tree.

CLI:
```
python fom_dtx_to_png.py <file-or-dir> --out <dir-or-file>
                         [--root <dir>] [--mip N] [--allow-cubemap]
                         [--skip-existing] [--quiet]
```

### ltb_exporter.py (LTB -> OBJ/MTL + glTF)
Purpose: parse LTB model data and export for DCC tools.

Core pieces:
- LTB binary parser (`parse_model`) for pieces, LODs, nodes, anims, sockets, weights.
- `build_mesh_primitives()` merges vertex streams into unified geometry.
- `resolve_textures()`:
  - Manual textures via `--textures`, or
  - Auto search in Resources/Skins based on base name.
  - Converts DTX to PNG when needed.
- OBJ writer + MTL with `map_Kd` (diffuse).
- Optional glTF/bin export with skin, joints, and animations.

CLI:
```
python ltb_exporter.py --ltb <file.ltb> --out <dir>
                       [--lod N] [--no-anims] [--gltf]
                       [--resources-root <dir>] [--textures <file> ...]
```

Notes:
- UV V is flipped for Blender compatibility.
- If `--gltf` is omitted, it only writes OBJ/MTL.

### ltb_to_lta.py (LTB -> LTA)
Purpose: generate LTA models from LTBs so DEdit can load them.

How it works:
- Reuses `ltb_exporter.parse_model()` to read LTB structures.
- Generates LTA with:
  - `on-load-cmds` (anim bindings, node flags, LOD groups, sockets).
  - `hierarchy` tree (node transforms).
  - `shape` blocks with geometry (`vertex`, `normals`, `uvs`, `tri-fs`, `tex-fs`).
  - `tools-info` (texture bindings + compile options).
  - `animset` blocks (best-effort, uses keyframes if present).
  - `skel-deformer` blocks when bone weights exist.

CLI:
```
python ltb_to_lta.py <inputs...> [--out-root <dir>] [--no-recursive]
                      [--resources-root <dir>] [--textures <file> ...]
```

Notes:
- Best-effort conversion: geometry, hierarchy, and sockets should load; animation/deformer fidelity may vary.
- If textures are missing, provide `--resources-root` or manual `--textures`.

### obj_triangulate_gltf.py (OBJ -> triangulated OBJ + glTF)
Purpose: repair OBJ meshes and emit glTF for easy import.

Behavior:
- Parses OBJ + MTL, triangulates faces, writes new OBJ.
- Builds glTF with materials and baseColorTexture from MTL.

CLI:
```
python obj_triangulate_gltf.py --obj <file.obj>
                               [--out-obj <tri.obj>] [--out-gltf <file.gltf>]
```

### raknet_decrypt.py (standalone)
Utility for RakNet DataBlockEncryptor decryption. Not wired into the GUI.

## Adding a New Tool
1) Drop script in `Open-FoMTools/`.
2) Add `SCRIPT_...` constant in `app.py`.
3) Create a `_page_*()` builder with inputs, command preview, and `_run_tool()` call.
4) Add a sidebar entry in `_build_layout()` and a `page_help` tooltip string.

## Validation
- CLI sanity: run each script once on a small asset and confirm outputs appear in `Open-FoMTools/Output/`.
- GUI sanity: run one job from each panel, confirm job queue + log stream, and use “Open Output Folder”.
