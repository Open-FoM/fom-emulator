# Item Override Hook - Config + CSV

## INI
Add to `fom_hook.ini` (next to the hook DLL):
```
[Items]
Enable=1
OverrideBase=1
OverrideRuntime=1
OverridesPath=item_overrides.csv
```

## CSV format
`item_id,stat_id,value,type,level,pct13,pct14`

Notes:
- `item_id`: template id (u16).
- `stat_id`: stat id (u32 in runtime entries, u8 in base table).
- `value`: raw integer (client formatting converts to meters/seconds/percent/etc.).
- `type/level/pct13/pct14` are optional; leave empty to keep original.
- Lines starting with `#` are ignored.

Example:
```
# item_id,stat_id,value,type,level,pct13,pct14
12,12,156,,
12,35,7500,,
12,36,600,,
12,17,1000,,
```

## Armor base stats (computed, not in base table)
Armor stats are generated in code (`Item_AddArmorBaseStats`). To override them, provide stat overrides for the armor item id. The hook will **modify existing armor entries** and **add missing ones**.

Known armor stat ids:
- `11` = Agility (percent, value * 0.1)
- `39` = Weight (grams, integer)
- `18` = Armor
- `19` = Shielding
- `20` = Resistance
- `21` = Reflection

Example (one helmet item id, adjust to your item ids):
```
# helmet item_id 2001 (example)
2001,11,-20,,
2001,39,2500,,
2001,18,68,,
2001,19,68,,
2001,20,68,,
2001,21,68,,
```
