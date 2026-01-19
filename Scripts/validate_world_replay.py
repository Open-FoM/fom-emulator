import argparse
import re
from pathlib import Path


ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")


def load_name_map(source: Path) -> dict[str, int]:
    text = source.read_text(encoding="utf-8", errors="ignore")
    name_to_id: dict[str, int] = {}
    for match in re.finditer(r"\{0x([0-9A-Fa-f]{2}),\s*\"([^\"]+)\"\}", text):
        name_to_id[match.group(2)] = int(match.group(1), 16)
    return name_to_id


def parse_expected(doc_path: Path) -> list[dict]:
    text = doc_path.read_text(encoding="utf-8", errors="ignore")
    lines = text.splitlines()
    blocks = []
    current = None

    def flush() -> None:
        nonlocal current
        if current is not None:
            blocks.append(current)
            current = None

    for line in lines:
        if line.startswith("#") and not line.startswith("---"):
            flush()
            current = {"title": line.strip(), "lines": []}
        elif current is not None:
            current["lines"].append(line)

    flush()

    expected: list[dict] = []
    for block in blocks:
        body = "\n".join(block["lines"])
        label_match = re.search(r"Correct log label:\s*`([^`]+)`", body)
        length_match = re.search(r"Length:\s*(\d+)\s*bytes", body)
        if not (label_match and length_match):
            continue
        label = label_match.group(1)
        length = int(length_match.group(1))
        id_match = re.search(r"\[0x([0-9A-Fa-f]{2})\]", label)
        layer_match = re.search(r"\[(Rak|Lith)\]", label)
        expected.append(
            {
                "title": block["title"],
                "label": label,
                "len": length,
                "id": int(id_match.group(1), 16) if id_match else None,
                "layer": layer_match.group(1) if layer_match else None,
            }
        )
    return expected


def parse_log(log_path: Path, name_map: dict[str, int]) -> list[dict]:
    text = log_path.read_text(encoding="utf-8", errors="ignore")
    text = ANSI_RE.sub("", text)
    pattern = re.compile(
        r"\[(?P<label>[^\]]+)\]\[(?P<layer>Rak|Lith)\]\[(?P<dir>[^\]]+)\]\s+len=(?P<len>\d+)"
    )
    entries: list[dict] = []
    for match in pattern.finditer(text):
        label = match.group("label")
        length = int(match.group("len"))
        layer = match.group("layer")
        if label.startswith("0x"):
            try:
                pkt_id = int(label[2:], 16)
            except ValueError:
                pkt_id = None
        else:
            pkt_id = None
            for part in label.split("/"):
                part = part.strip()
                if part in name_map:
                    pkt_id = name_map[part]
                    break
        entries.append({"id": pkt_id, "len": length, "layer": layer})
    return entries


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--doc", required=True)
    parser.add_argument("--server", required=True)
    parser.add_argument("--client", required=True)
    parser.add_argument(
        "--id-map",
        default="PacketInspector/Source/FomIdTables.cpp",
        help="Path to Rak/Lith id name table.",
    )
    args = parser.parse_args()

    expected = parse_expected(Path(args.doc))
    name_map = load_name_map(Path(args.id_map))
    entries = []
    for path in (Path(args.server), Path(args.client)):
        if path.exists():
            entries.extend(parse_log(path, name_map))

    failures = 0
    for item in expected:
        ok = any(
            entry["id"] == item["id"]
            and entry["len"] == item["len"]
            and (item["layer"] is None or entry["layer"] == item["layer"])
            for entry in entries
        )
        status = "PASS" if ok else "FAIL"
        if not ok:
            failures += 1
        print(
            f"{status} | {item['title']} | {item['label']} | len={item['len']}"
        )

    total = len(expected)
    print(f"\nTotal: {total}  Pass: {total - failures}  Fail: {failures}")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
