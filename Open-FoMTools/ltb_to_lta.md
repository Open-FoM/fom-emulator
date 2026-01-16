# LTB -> LTA Batch Conversion

This tool converts `.ltb` models into `.lta` so DEdit can list and open them. It uses the same LTB parsing code as the exporter and writes a best-effort LTA model.

## CLI Usage
```
python Open-FoMTools\ltb_to_lta.py <input folder or .ltb> [more inputs...] --out-root <output>
```

Common examples:
```
# Mirror the input tree into Output\Models_LTA
python Open-FoMTools\ltb_to_lta.py .\tools\FoMEdit\Models --out-root .\Open-FoMTools\Output\Models_LTA

# Write .lta beside each .ltb (omit --out-root)
python Open-FoMTools\ltb_to_lta.py .\tools\FoMEdit\Models
```

Optional flags:
- `--resources-root <dir>`: root for auto texture binding (uses Resources/Skins under this folder).
- `--textures <file>`: manual texture paths (.dtx or .png). Repeatable. If provided, auto-detect is skipped.
- `--no-recursive`: only scan the top-level of input folders.

## GUI Usage
Open-FoM Tools -> LTB -> LTA (DEdit)
- Add files or a folder
- Choose Output Root (or enable "Output next to each LTB")
- Optional: Resources Root and/or manual textures
- Run

## Notes
- LTA output is best-effort: geometry, hierarchy, sockets, and anim data are written when present.
- If textures are not bound, add manual textures or point Resources Root at your FoM Resources folder.
- Model_Packer.exe compiles `.lta` -> `.ltb` only.
- LTC.exe compresses/decompresses `.lta` <-> `.ltc` only.

## Validation (manual)
1) Convert a single model (e.g., `1x1_square.ltb`).
2) Copy the resulting `.lta` to `tools\FoMEdit\Models` or your DEdit project model path.
3) Open DEdit -> Model Browser -> confirm the model appears and can be loaded.
