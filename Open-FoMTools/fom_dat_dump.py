#!/usr/bin/env python3
import argparse
import json
import os
import re
import struct
import sys

try:
    from fom_dtx_to_png import convert_one as dtx_convert_one
except Exception:
    dtx_convert_one = None

MAX_WORLDNAME_LEN = 64
RENDER_MAX_PATH = 260


class Reader:
    def __init__(self, data):
        self.data = data
        self.pos = 0

    def tell(self):
        return self.pos

    def seek(self, offset):
        if offset < 0 or offset > len(self.data):
            raise ValueError("seek out of range")
        self.pos = offset

    def read_bytes(self, n):
        if self.pos + n > len(self.data):
            raise ValueError("read past end")
        b = self.data[self.pos:self.pos + n]
        self.pos += n
        return b

    def read_u8(self):
        return self._read_struct("<B", 1)

    def read_u16(self):
        return self._read_struct("<H", 2)

    def read_u32(self):
        return self._read_struct("<I", 4)

    def read_i32(self):
        return self._read_struct("<i", 4)

    def read_f32(self):
        return self._read_struct("<f", 4)

    def read_vec3(self):
        return (self.read_f32(), self.read_f32(), self.read_f32())

    def read_string_lenpref(self, max_len=None):
        length = self.read_u16()
        raw = self.read_bytes(length)
        if max_len is not None and max_len > 0:
            raw = raw[:max_len - 1]
        try:
            return raw.decode("ascii", errors="replace")
        except Exception:
            return raw.decode("latin1", errors="replace")

    def _read_struct(self, fmt, size):
        b = self.read_bytes(size)
        return struct.unpack(fmt, b)[0]


def read_world_header(r):
    version = r.read_u32()
    header = {
        "version": version,
        "objectDataPos": r.read_u32(),
        "blindObjectDataPos": r.read_u32(),
        "lightgridPos": r.read_u32(),
        "collisionDataPos": r.read_u32(),
        "particleBlockerDataPos": r.read_u32(),
        "renderDataPos": r.read_u32(),
    }
    # packer info (8 uint32)
    header["packerType"] = r.read_u32()
    header["packerVersion"] = r.read_u32()
    header["packerDummy"] = [r.read_u32() for _ in range(6)]
    return header


def read_world_tree_layout(r):
    box_min = r.read_vec3()
    box_max = r.read_vec3()
    num_nodes = r.read_u32()
    dummy_terrain_depth = r.read_u32()

    cur_byte = 0
    cur_bit = 8
    nodes_used = 1

    def read_bit():
        nonlocal cur_byte, cur_bit
        if cur_bit == 8:
            cur_byte = r.read_u8()
            cur_bit = 0
        bit = (cur_byte >> cur_bit) & 1
        cur_bit += 1
        return bit

    def walk():
        nonlocal nodes_used
        if read_bit():
            nodes_used += 4
            for _ in range(4):
                walk()

    walk()

    return {
        "boxMin": box_min,
        "boxMax": box_max,
        "numNodes": num_nodes,
        "dummyTerrainDepth": dummy_terrain_depth,
        "nodesUsed": nodes_used,
    }


def read_texture_list(r):
    names_len = r.read_u32()
    num_textures = r.read_u32()
    blob = r.read_bytes(names_len)
    parts = blob.split(b"\x00")
    names = []
    for p in parts:
        if len(names) >= num_textures:
            break
        if not p:
            names.append("")
        else:
            names.append(p.decode("ascii", errors="replace"))
    return names_len, num_textures, names


def read_world_bsp(r):
    info_flags_raw = r.read_u32()
    info_flags = info_flags_raw & 0xFFFF
    world_name = r.read_string_lenpref(max_len=64)

    n_points = r.read_u32()
    n_planes = r.read_u32()
    n_surfaces = r.read_u32()
    n_user_portals = r.read_u32()
    n_polies = r.read_u32()
    n_leafs = r.read_u32()
    n_verts = r.read_u32()
    total_vis_list_size = r.read_u32()
    n_leaf_lists = r.read_u32()
    n_nodes = r.read_u32()

    min_box = r.read_vec3()
    max_box = r.read_vec3()
    world_translation = r.read_vec3()

    if n_user_portals != 0:
        raise ValueError("unsupported: n_user_portals != 0")

    names_len, num_textures, textures = read_texture_list(r)

    poly_vert_counts = [r.read_u8() for _ in range(n_polies)]

    # leaf lists
    for _ in range(n_leafs):
        n_num_leaf_lists = r.read_u16()
        if n_num_leaf_lists == 0xFFFF:
            _ = r.read_u16()
        else:
            for _ in range(n_num_leaf_lists):
                _ = r.read_u16()  # portal id
                list_size = r.read_u16()
                r.seek(r.tell() + list_size)

    # planes
    planes = []
    for _ in range(n_planes):
        planes.append((r.read_f32(), r.read_f32(), r.read_f32(), r.read_f32()))

    # surfaces
    surfaces = []
    for _ in range(n_surfaces):
        flags = r.read_u32()
        tex_idx = r.read_u16()
        tex_flags = r.read_u16()
        surfaces.append((flags, tex_idx, tex_flags))

    # polies
    polies = []
    for i in range(n_polies):
        surface_idx = r.read_u32()
        plane_idx = r.read_u32()
        vcount = poly_vert_counts[i]
        verts = [r.read_u32() for _ in range(vcount)]
        polies.append((surface_idx, plane_idx, verts))

    # nodes
    for _ in range(n_nodes):
        _ = r.read_u32()  # iPoly
        _ = r.read_u16()  # wLeaf
        _ = r.read_u32()  # child A
        _ = r.read_u32()  # child B

    # points
    points = [r.read_vec3() for _ in range(n_points)]

    # root node index
    _ = r.read_i32()

    # sections
    n_sections = r.read_u32()
    if n_sections != 0:
        raise ValueError("unsupported: n_sections != 0")

    return {
        "worldName": world_name,
        "worldInfoFlags": info_flags,
        "counts": {
            "points": n_points,
            "planes": n_planes,
            "surfaces": n_surfaces,
            "polies": n_polies,
            "leafs": n_leafs,
            "verts": n_verts,
            "nodes": n_nodes,
            "leafLists": n_leaf_lists,
            "textures": num_textures,
            "namesLen": names_len,
            "totalVisListSize": total_vis_list_size,
        },
        "bounds": {
            "min": min_box,
            "max": max_box,
            "translation": world_translation,
        },
        "textures": textures,
        "surfaces": surfaces,
        "polies": polies,
        "points": points,
        "planes": planes,
    }


def read_render_vertex(buf, offset, vert_size):
    pos = struct.unpack_from("<fff", buf, offset)
    offset += 12
    u0, v0, u1, v1 = struct.unpack_from("<ffff", buf, offset)
    offset += 16
    color = struct.unpack_from("<I", buf, offset)[0]
    offset += 4
    normal = struct.unpack_from("<fff", buf, offset)
    offset += 12
    if vert_size > 44:
        offset += (vert_size - 44)
    return {
        "pos": pos,
        "uv0": (u0, v0),
        "uv1": (u1, v1),
        "color": color,
        "normal": normal,
    }, offset


def read_render_block(r, vert_size):
    center = r.read_vec3()
    half = r.read_vec3()

    n_sections = r.read_u32()
    sections = []
    for _ in range(n_sections):
        textures = [r.read_string_lenpref(max_len=RENDER_MAX_PATH) for _ in range(2)]
        shader_code = r.read_u8()
        tri_count = r.read_u32()
        tex_effect = r.read_string_lenpref(max_len=RENDER_MAX_PATH)

        lm_w = r.read_u32()
        lm_h = r.read_u32()
        lm_size = r.read_u32()
        if lm_size:
            r.read_bytes(lm_size)

        sections.append({
            "textures": textures,
            "shader": shader_code,
            "triCount": tri_count,
            "textureEffect": tex_effect,
            "lightmap": {"width": lm_w, "height": lm_h, "size": lm_size},
        })

    n_vertices = r.read_u32()
    vertices = []
    if n_vertices:
        buf = r.read_bytes(vert_size * n_vertices)
        offset = 0
        for _ in range(n_vertices):
            vert, offset = read_render_vertex(buf, offset, vert_size)
            vertices.append(vert)

    n_tris = r.read_u32()
    indices = []
    if n_tris:
        for _ in range(n_tris):
            i0 = r.read_u32()
            i1 = r.read_u32()
            i2 = r.read_u32()
            _ = r.read_u32()  # poly index
            indices.extend([i0, i1, i2])

    # sky portals
    n_sky = r.read_u32()
    for _ in range(n_sky):
        n_vert = r.read_u8()
        for _ in range(n_vert):
            _ = r.read_vec3()
        _ = r.read_vec3()
        _ = r.read_f32()

    # occluders
    n_occ = r.read_u32()
    for _ in range(n_occ):
        n_vert = r.read_u8()
        for _ in range(n_vert):
            _ = r.read_vec3()
        _ = r.read_vec3()
        _ = r.read_f32()
        _ = r.read_u32()  # occluder id

    # light groups
    n_lg = r.read_u32()
    for _ in range(n_lg):
        name_len = r.read_u16()
        if name_len:
            r.read_bytes(name_len)
        _ = r.read_vec3()
        data_len = r.read_u32()
        if data_len:
            r.read_bytes(data_len)

        section_lm_size = r.read_u32()
        for _ in range(section_lm_size):
            sub_size = r.read_u32()
            for _ in range(sub_size):
                _ = r.read_u32()
                _ = r.read_u32()
                _ = r.read_u32()
                _ = r.read_u32()
                lm_data_size = r.read_u32()
                if lm_data_size:
                    r.read_bytes(lm_data_size)

    # children
    _ = r.read_u8()
    _ = r.read_u32()
    _ = r.read_u32()

    return {
        "center": center,
        "half": half,
        "sections": sections,
        "vertices": vertices,
        "indices": indices,
        "triCount": n_tris,
    }


def read_render_world(r, vert_size):
    n_blocks = r.read_u32()
    blocks = []
    for _ in range(n_blocks):
        blocks.append(read_render_block(r, vert_size))

    n_world_models = r.read_u32()
    world_models = []
    for _ in range(n_world_models):
        name = r.read_string_lenpref(max_len=MAX_WORLDNAME_LEN + 1)
        child = read_render_world(r, vert_size)
        child["name"] = name
        world_models.append(child)

    return {
        "blocks": blocks,
        "worldModels": world_models,
    }


def parse_property(prop_code, data):
    if prop_code == 0:  # PT_STRING
        if len(data) < 2:
            return ""
        strlen = struct.unpack_from("<H", data, 0)[0]
        raw = data[2:2 + strlen]
        return raw.decode("ascii", errors="replace")
    if prop_code in (1, 2, 7):  # PT_VECTOR, PT_COLOR, PT_ROTATION
        if len(data) < 12:
            return None
        return list(struct.unpack("<fff", data[:12]))
    if prop_code == 3:  # PT_REAL
        if len(data) < 4:
            return None
        return struct.unpack("<f", data[:4])[0]
    if prop_code == 5:  # PT_BOOL
        if len(data) < 1:
            return None
        return bool(data[0])
    if prop_code in (4, 6):  # PT_FLAGS, PT_LONGINT
        if len(data) < 4:
            return None
        return struct.unpack("<i", data[:4])[0]
    return data.hex()


def read_object_block(r):
    objects = []
    num_objects = r.read_u32()
    for _ in range(num_objects):
        obj_len = r.read_u16()
        obj_start = r.tell()
        obj_type = r.read_string_lenpref(max_len=256)
        num_props = r.read_u32()
        props = []
        for _ in range(num_props):
            name = r.read_string_lenpref(max_len=256)
            prop_code = r.read_u8()
            prop_flags = r.read_u32()
            prop_len = r.read_u16()
            prop_data = r.read_bytes(prop_len)
            props.append({
                "name": name,
                "type": prop_code,
                "flags": prop_flags,
                "len": prop_len,
                "value": parse_property(prop_code, prop_data),
            })
        r.seek(obj_start + obj_len)
        objects.append({"type": obj_type, "properties": props})
    return objects


def ensure_png(tex, resources_root, png_root):
    if not tex or not png_root:
        return None
    tex_norm = tex.replace("/", os.sep).replace("\\", os.sep)
    ext = os.path.splitext(tex_norm)[1].lower()
    if ext == "":
        tex_norm += ".dtx"
        ext = ".dtx"
    if ext == ".png":
        src = os.path.join(resources_root, tex_norm)
    else:
        src = os.path.join(resources_root, tex_norm)
    rel_png = os.path.splitext(tex_norm)[0] + ".png"
    dst = os.path.join(png_root, rel_png)
    if os.path.exists(dst):
        return dst
    if ext != ".dtx" or not dtx_convert_one:
        return dst
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    try:
        ok = dtx_convert_one(src, dst, 0, False, True)
        return dst if ok else dst
    except Exception:
        return dst


def resolve_texture_path(tex, png_root, obj_dir, resources_root, convert_textures):
    if not tex:
        return ""
    if not png_root:
        return tex
    tex_norm = tex.replace("/", os.sep).replace("\\", os.sep)
    tex_png = os.path.splitext(tex_norm)[0] + ".png"
    full = os.path.join(png_root, tex_png)
    if convert_textures:
        full = ensure_png(tex, resources_root, png_root) or full
    rel = os.path.relpath(full, obj_dir)
    return rel.replace(os.sep, "/")


def write_obj(out_dir, base_name, model_idx, model, resources_root, png_root, convert_textures):
    points = model["points"]
    polies = model["polies"]
    surfaces = model["surfaces"]
    textures = model["textures"]

    obj_name = f"{base_name}_model{model_idx}.obj"
    mtl_name = f"{base_name}_model{model_idx}.mtl"
    obj_path = os.path.join(out_dir, obj_name)
    mtl_path = os.path.join(out_dir, mtl_name)

    mat_map = {}
    mat_list = []

    def mat_name(tex):
        base = tex.replace("/", "_").replace("\\", "_")
        base = re.sub(r"[^A-Za-z0-9_]+", "_", base)
        if not base:
            base = "mat_default"
        name = base
        suffix = 1
        while name in mat_map and mat_map[name] != tex:
            suffix += 1
            name = f"{base}_{suffix}"
        mat_map[name] = tex
        return name

    with open(obj_path, "w", encoding="ascii", errors="replace") as f:
        f.write(f"# Source: {base_name}, model {model_idx}\n")
        f.write(f"mtllib {mtl_name}\n")
        for v in points:
            f.write(f"v {v[0]} {v[1]} {v[2]}\n")
        current_mat = None
        for surface_idx, _plane_idx, vert_indices in polies:
            tex_idx = 0
            tex_name = ""
            if 0 <= surface_idx < len(surfaces):
                tex_idx = surfaces[surface_idx][1]
            if 0 <= tex_idx < len(textures):
                tex_name = textures[tex_idx]
            name = mat_name(tex_name)
            if name != current_mat:
                f.write(f"usemtl {name}\n")
                current_mat = name
            # OBJ indices are 1-based
            face = " ".join(str(i + 1) for i in vert_indices)
            f.write(f"f {face}\n")

    with open(mtl_path, "w", encoding="ascii", errors="replace") as f:
        for name, tex in mat_map.items():
            f.write(f"newmtl {name}\n")
            f.write("Kd 1.0 1.0 1.0\n")
            f.write("d 1.0\n")
            if tex:
                f.write(f"map_Kd {resolve_texture_path(tex, png_root, out_dir, resources_root, convert_textures)}\n")
            f.write("\n")

    # build a texture existence map
    tex_status = []
    for tex in sorted(set(textures)):
        if not tex:
            continue
        full = os.path.join(resources_root, tex.replace("/", os.sep))
        tex_status.append({"tex": tex, "exists": os.path.exists(full), "full": full})

    return {
        "obj": obj_path,
        "mtl": mtl_path,
        "materialCount": len(mat_map),
        "textureStatus": tex_status,
    }


def write_obj_render(out_dir, base_name, tag, render_world, resources_root, png_root, convert_textures):
    blocks = render_world.get("blocks", [])
    obj_name = f"{base_name}_{tag}.obj"
    mtl_name = f"{base_name}_{tag}.mtl"
    obj_path = os.path.join(out_dir, obj_name)
    mtl_path = os.path.join(out_dir, mtl_name)

    mat_map = {}
    mat_list = []

    def mat_name(tex):
        base = tex.replace("/", "_").replace("\\", "_")
        base = re.sub(r"[^A-Za-z0-9_]+", "_", base)
        if not base:
            base = "mat_default"
        name = base
        suffix = 1
        while name in mat_map and mat_map[name] != tex:
            suffix += 1
            name = f"{base}_{suffix}"
        mat_map[name] = tex
        return name

    with open(obj_path, "w", encoding="ascii", errors="replace") as f:
        f.write(f"# Source: {base_name}, render {tag}\n")
        f.write(f"mtllib {mtl_name}\n")

        v_offset = 0
        for bi, block in enumerate(blocks):
            f.write(f"g block_{bi}\n")
            for v in block["vertices"]:
                x, y, z = v["pos"]
                f.write(f"v {x} {y} {z}\n")
            for v in block["vertices"]:
                u, vv = v["uv0"]
                f.write(f"vt {u} {vv}\n")

            idx_pos = 0
            current_mat = None
            for section in block["sections"]:
                tex_name = ""
                if section["textures"]:
                    tex_name = section["textures"][0]
                name = mat_name(tex_name)
                if name != current_mat:
                    f.write(f"usemtl {name}\n")
                    current_mat = name
                tri_count = section["triCount"]
                for t in range(tri_count):
                    i0 = block["indices"][(idx_pos + t) * 3 + 0] + 1 + v_offset
                    i1 = block["indices"][(idx_pos + t) * 3 + 1] + 1 + v_offset
                    i2 = block["indices"][(idx_pos + t) * 3 + 2] + 1 + v_offset
                    f.write(f"f {i0}/{i0} {i1}/{i1} {i2}/{i2}\n")
                idx_pos += tri_count

            v_offset += len(block["vertices"])

    with open(mtl_path, "w", encoding="ascii", errors="replace") as f:
        for name, tex in mat_map.items():
            f.write(f"newmtl {name}\n")
            f.write("Kd 1.0 1.0 1.0\n")
            f.write("d 1.0\n")
            if tex:
                f.write(f"map_Kd {resolve_texture_path(tex, png_root, out_dir, resources_root, convert_textures)}\n")
            f.write("\n")

    tex_status = []
    textures = set()
    for block in blocks:
        for section in block["sections"]:
            if section["textures"] and section["textures"][0]:
                textures.add(section["textures"][0])

    for tex in sorted(textures):
        full = os.path.join(resources_root, tex.replace("/", os.sep))
        tex_status.append({"tex": tex, "exists": os.path.exists(full), "full": full})

    return {
        "obj": obj_path,
        "mtl": mtl_path,
        "materialCount": len(mat_map),
        "textureStatus": tex_status,
    }


def main():
    ap = argparse.ArgumentParser(description="Dump LithTech .dat world and export OBJ")
    ap.add_argument("--dat", required=True, help="Path to .dat file")
    ap.add_argument("--out", required=True, help="Output directory")
    ap.add_argument("--resources", required=False, help="Resources root for existence checks")
    ap.add_argument("--png-root", required=False, help="Root directory for PNG textures (mirrors resource paths)")
    ap.add_argument("--include-bsp", action="store_true", help="Also export BSP OBJ (no UVs)")
    ap.add_argument("--no-textures", action="store_true", help="Do not convert or map textures")
    args = ap.parse_args()

    dat_path = os.path.abspath(args.dat)
    out_dir = os.path.abspath(args.out)
    res_root = os.path.abspath(args.resources) if args.resources else os.path.abspath(os.path.join(os.path.dirname(dat_path), ".."))
    convert_textures = not args.no_textures
    if args.png_root:
        png_root = os.path.abspath(args.png_root)
    elif convert_textures:
        png_root = os.path.join(out_dir, "Resources")
    else:
        png_root = None

    os.makedirs(out_dir, exist_ok=True)

    with open(dat_path, "rb") as f:
        data = f.read()
    r = Reader(data)

    header = read_world_header(r)
    world_info_len = r.read_u32()
    world_info = r.read_bytes(world_info_len).decode("ascii", errors="replace")
    world_extents_min = r.read_vec3()
    world_extents_max = r.read_vec3()
    world_offset = r.read_vec3()

    tree_info = read_world_tree_layout(r)

    num_world_models = r.read_u32()
    world_models = []

    for i in range(num_world_models):
        _ = r.read_u32()  # nDummy
        start_pos = r.tell()
        model = read_world_bsp(r)
        world_models.append(model)
        # if movable, there is a second bsp instance
        if model["worldInfoFlags"] & 0x0002:
            r.seek(start_pos)
            _ = read_world_bsp(r)

    # object data may be located at objectDataPos
    if r.tell() != header["objectDataPos"]:
        r.seek(header["objectDataPos"])

    objects = read_object_block(r)

    blind_objects = []
    if header["blindObjectDataPos"] > 0:
        r.seek(header["blindObjectDataPos"])
        try:
            blind_objects = read_object_block(r)
        except Exception:
            blind_objects = []

    base_name = os.path.splitext(os.path.basename(dat_path))[0]
    exports = [None] * len(world_models)

    render_exports = []
    render_world = None
    render_vert_size = None
    if header["renderDataPos"] > 0:
        for vert_size in (44, 68):
            try:
                r_render = Reader(data)
                r_render.seek(header["renderDataPos"])
                render_world = read_render_world(r_render, vert_size)
                render_vert_size = vert_size
                break
            except Exception:
                render_world = None
                render_vert_size = None

    if render_world:
        render_exports.append(write_obj_render(out_dir, base_name, "render", render_world, res_root, png_root, convert_textures))
        for idx, wm in enumerate(render_world.get("worldModels", [])):
            name = wm.get("name") or f"wm{idx}"
            safe = re.sub(r"[^A-Za-z0-9_]+", "_", name)
            tag = f"render_wm{idx}_{safe}"
            render_exports.append(write_obj_render(out_dir, base_name, tag, wm, res_root, png_root, convert_textures))

    include_bsp = args.include_bsp or not render_world
    if include_bsp:
        for i, model in enumerate(world_models):
            exports[i] = write_obj(out_dir, base_name, i, model, res_root, png_root, convert_textures)

    summary = {
        "dat": dat_path,
        "header": header,
        "worldInfo": world_info,
        "worldExtentsMin": world_extents_min,
        "worldExtentsMax": world_extents_max,
        "worldOffset": world_offset,
        "worldTree": tree_info,
        "worldModels": [
            {
                "index": i,
                "name": m["worldName"],
                "flags": m["worldInfoFlags"],
                "counts": m["counts"],
                "textures": m["textures"],
                "export": exports[i] if i < len(exports) else None,
            }
            for i, m in enumerate(world_models)
        ],
        "objects": objects,
        "blindObjects": blind_objects,
        "render": {
            "vertexSize": render_vert_size,
            "exports": render_exports,
        },
    }

    out_json = os.path.join(out_dir, f"{base_name}_dump.json")
    with open(out_json, "w", encoding="ascii", errors="replace") as f:
        json.dump(summary, f, indent=2)

    print(f"Wrote: {out_json}")
    for e in exports:
        if e:
            print(f"OBJ: {e['obj']}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)
