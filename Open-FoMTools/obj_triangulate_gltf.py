import argparse
import json
import math
import os
import struct


def _parse_index(value, count):
    if value is None or value == "":
        return None
    idx = int(value)
    if idx < 0:
        return count + idx
    return idx - 1


def parse_obj(path):
    positions = []
    texcoords = []
    normals = []
    faces_by_mtl = {}
    mtl_order = []
    mtllibs = []
    current_mtl = None

    def ensure_mtl(mtl_name):
        if mtl_name not in faces_by_mtl:
            faces_by_mtl[mtl_name] = []
            mtl_order.append(mtl_name)

    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("mtllib "):
                mtllibs.extend(line.split()[1:])
                continue
            if line.startswith("usemtl "):
                current_mtl = line.split(maxsplit=1)[1].strip()
                ensure_mtl(current_mtl)
                continue
            if line.startswith("v "):
                parts = line.split()
                if len(parts) >= 4:
                    positions.append((float(parts[1]), float(parts[2]), float(parts[3])))
                continue
            if line.startswith("vt "):
                parts = line.split()
                if len(parts) >= 3:
                    texcoords.append((float(parts[1]), float(parts[2])))
                continue
            if line.startswith("vn "):
                parts = line.split()
                if len(parts) >= 4:
                    normals.append((float(parts[1]), float(parts[2]), float(parts[3])))
                continue
            if line.startswith("f "):
                parts = line.split()[1:]
                face = []
                for p in parts:
                    vals = p.split("/")
                    v_idx = _parse_index(vals[0], len(positions))
                    vt_idx = _parse_index(vals[1], len(texcoords)) if len(vals) > 1 else None
                    vn_idx = _parse_index(vals[2], len(normals)) if len(vals) > 2 else None
                    face.append((v_idx, vt_idx, vn_idx))
                mtl_name = current_mtl
                ensure_mtl(mtl_name)
                faces_by_mtl[mtl_name].append(face)
                continue
    return positions, texcoords, normals, mtllibs, mtl_order, faces_by_mtl


def triangulate_faces(faces):
    tris = []
    for face in faces:
        if len(face) < 3:
            continue
        if len(face) == 3:
            tris.append(face)
            continue
        v0 = face[0]
        for i in range(1, len(face) - 1):
            tris.append([v0, face[i], face[i + 1]])
    return tris


def write_triangulated_obj(path, positions, texcoords, normals, mtllibs, mtl_order, faces_by_mtl):
    with open(path, "w", encoding="utf-8") as f:
        for mtl in mtllibs:
            f.write(f"mtllib {mtl}\n")
        for v in positions:
            f.write(f"v {v[0]} {v[1]} {v[2]}\n")
        for vt in texcoords:
            f.write(f"vt {vt[0]} {vt[1]}\n")
        for vn in normals:
            f.write(f"vn {vn[0]} {vn[1]} {vn[2]}\n")
        for mtl_name in mtl_order:
            if mtl_name is not None:
                f.write(f"usemtl {mtl_name}\n")
            tris = triangulate_faces(faces_by_mtl.get(mtl_name, []))
            for tri in tris:
                parts = []
                for v_idx, vt_idx, vn_idx in tri:
                    v = v_idx + 1 if v_idx is not None else ""
                    vt = vt_idx + 1 if vt_idx is not None else ""
                    vn = vn_idx + 1 if vn_idx is not None else ""
                    if vt == "" and vn == "":
                        parts.append(f"{v}")
                    elif vt == "" and vn != "":
                        parts.append(f"{v}//{vn}")
                    elif vt != "" and vn == "":
                        parts.append(f"{v}/{vt}")
                    else:
                        parts.append(f"{v}/{vt}/{vn}")
                f.write("f " + " ".join(parts) + "\n")


def parse_mtl(path):
    materials = {}
    current = None
    if not path or not os.path.isfile(path):
        return materials
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("newmtl "):
                current = line.split(maxsplit=1)[1].strip()
                if current not in materials:
                    materials[current] = {}
                continue
            if current is None:
                continue
            if line.startswith("map_Kd "):
                materials[current]["map_Kd"] = line.split(maxsplit=1)[1].strip()
    return materials


def _pack_floats(values):
    return struct.pack("<%sf" % len(values), *values)


def _pack_uint16(values):
    return struct.pack("<%sH" % len(values), *values)


def _pack_uint32(values):
    return struct.pack("<%sI" % len(values), *values)


def _align4(data):
    pad = (-len(data)) % 4
    if pad:
        data += b"\x00" * pad
    return data


def _min_max_positions(positions):
    if not positions:
        return None, None
    min_v = [math.inf, math.inf, math.inf]
    max_v = [-math.inf, -math.inf, -math.inf]
    for x, y, z in positions:
        min_v[0] = min(min_v[0], x)
        min_v[1] = min(min_v[1], y)
        min_v[2] = min(min_v[2], z)
        max_v[0] = max(max_v[0], x)
        max_v[1] = max(max_v[1], y)
        max_v[2] = max(max_v[2], z)
    return min_v, max_v


def _resolve_texture_path(map_kd, mtl_dir):
    if not map_kd:
        return None
    raw = map_kd.strip().strip('"')
    candidate = raw
    if not os.path.isabs(candidate):
        candidate = os.path.normpath(os.path.join(mtl_dir, candidate))
    if os.path.isfile(candidate):
        return candidate
    base, ext = os.path.splitext(candidate)
    if ext.lower() == ".dtx":
        png = base + ".png"
        if os.path.isfile(png):
            return png
    return None


def export_gltf(obj_path, out_gltf, positions, texcoords, normals, mtl_order, faces_by_mtl, mtllibs):
    obj_dir = os.path.dirname(os.path.abspath(obj_path))
    gltf_dir = os.path.dirname(os.path.abspath(out_gltf))
    bin_path = os.path.splitext(out_gltf)[0] + ".bin"

    mtl_data = {}
    for mtl in mtllibs:
        mtl_path = mtl
        if not os.path.isabs(mtl_path):
            mtl_path = os.path.normpath(os.path.join(obj_dir, mtl_path))
        mtl_data.update(parse_mtl(mtl_path))

    bin_data = bytearray()
    buffer_views = []
    accessors = []

    def add_buffer_view(data_bytes, target):
        nonlocal bin_data
        data_bytes = _align4(data_bytes)
        offset = len(bin_data)
        bin_data.extend(data_bytes)
        view = {
            "buffer": 0,
            "byteOffset": offset,
            "byteLength": len(data_bytes),
        }
        if target is not None:
            view["target"] = target
        buffer_views.append(view)
        return len(buffer_views) - 1

    def add_accessor(view_index, component_type, count, accessor_type, min_vals=None, max_vals=None):
        accessor = {
            "bufferView": view_index,
            "componentType": component_type,
            "count": count,
            "type": accessor_type,
        }
        if min_vals is not None:
            accessor["min"] = min_vals
        if max_vals is not None:
            accessor["max"] = max_vals
        accessors.append(accessor)
        return len(accessors) - 1

    images = []
    textures = []
    materials = []
    samplers = [{"magFilter": 9729, "minFilter": 9729, "wrapS": 10497, "wrapT": 10497}]
    image_index_by_uri = {}

    def ensure_texture(uri):
        if uri in image_index_by_uri:
            image_index = image_index_by_uri[uri]
        else:
            image_index = len(images)
            images.append({"uri": uri})
            image_index_by_uri[uri] = image_index
        tex_index = len(textures)
        textures.append({"source": image_index, "sampler": 0})
        return tex_index

    primitives = []

    for mtl_name in mtl_order:
        faces = faces_by_mtl.get(mtl_name, [])
        tris = triangulate_faces(faces)
        if not tris:
            continue

        vert_map = {}
        out_positions = []
        out_normals = []
        out_texcoords = []
        indices = []

        has_tex = len(texcoords) > 0
        has_norm = len(normals) > 0

        for tri in tris:
            for v_idx, vt_idx, vn_idx in tri:
                key = (v_idx, vt_idx if has_tex else None, vn_idx if has_norm else None)
                if key not in vert_map:
                    vert_map[key] = len(out_positions)
                    px, py, pz = positions[v_idx]
                    out_positions.append((px, py, pz))
                    if has_tex:
                        if vt_idx is not None:
                            u, v = texcoords[vt_idx]
                        else:
                            u, v = 0.0, 0.0
                        out_texcoords.append((u, v))
                    if has_norm:
                        if vn_idx is not None:
                            nx, ny, nz = normals[vn_idx]
                        else:
                            nx, ny, nz = 0.0, 0.0, 1.0
                        out_normals.append((nx, ny, nz))
                indices.append(vert_map[key])

        pos_floats = [c for v in out_positions for c in v]
        pos_view = add_buffer_view(_pack_floats(pos_floats), 34962)
        pos_min, pos_max = _min_max_positions(out_positions)
        pos_accessor = add_accessor(pos_view, 5126, len(out_positions), "VEC3", pos_min, pos_max)

        attrs = {"POSITION": pos_accessor}

        if has_norm:
            norm_floats = [c for v in out_normals for c in v]
            norm_view = add_buffer_view(_pack_floats(norm_floats), 34962)
            norm_accessor = add_accessor(norm_view, 5126, len(out_normals), "VEC3")
            attrs["NORMAL"] = norm_accessor

        if has_tex:
            uv_floats = [c for v in out_texcoords for c in v]
            uv_view = add_buffer_view(_pack_floats(uv_floats), 34962)
            uv_accessor = add_accessor(uv_view, 5126, len(out_texcoords), "VEC2")
            attrs["TEXCOORD_0"] = uv_accessor

        index_component = 5125 if len(out_positions) > 65535 else 5123
        if index_component == 5125:
            idx_bytes = _pack_uint32(indices)
        else:
            idx_bytes = _pack_uint16(indices)
        idx_view = add_buffer_view(idx_bytes, 34963)
        idx_accessor = add_accessor(idx_view, index_component, len(indices), "SCALAR")

        mat_index = None
        mat_entry = None
        if mtl_name is not None:
            mat_entry = {"name": mtl_name}
            map_kd = mtl_data.get(mtl_name, {}).get("map_Kd")
            if map_kd:
                resolved = _resolve_texture_path(map_kd, obj_dir)
                if resolved:
                    rel_uri = os.path.relpath(resolved, gltf_dir)
                    rel_uri = rel_uri.replace("\\", "/")
                    tex_index = ensure_texture(rel_uri)
                    mat_entry["pbrMetallicRoughness"] = {
                        "baseColorTexture": {"index": tex_index},
                        "metallicFactor": 0.0,
                        "roughnessFactor": 1.0,
                    }
            mat_index = len(materials)
            materials.append(mat_entry)

        primitive = {"attributes": attrs, "indices": idx_accessor}
        if mat_index is not None:
            primitive["material"] = mat_index
        primitives.append(primitive)

    gltf = {
        "asset": {"version": "2.0", "generator": "obj_triangulate_gltf.py"},
        "buffers": [{"byteLength": len(bin_data), "uri": os.path.basename(bin_path)}],
        "bufferViews": buffer_views,
        "accessors": accessors,
        "meshes": [{"primitives": primitives}],
        "nodes": [{"mesh": 0}],
        "scenes": [{"nodes": [0]}],
        "scene": 0,
    }

    if materials:
        gltf["materials"] = materials
    if images:
        gltf["images"] = images
    if textures:
        gltf["textures"] = textures
    if samplers:
        gltf["samplers"] = samplers

    with open(bin_path, "wb") as f:
        f.write(bin_data)
    with open(out_gltf, "w", encoding="utf-8") as f:
        json.dump(gltf, f, indent=2)


def main():
    ap = argparse.ArgumentParser(description="Triangulate OBJ and export glTF.")
    ap.add_argument("--obj", required=True, help="Input OBJ path")
    ap.add_argument("--out-obj", help="Output triangulated OBJ path")
    ap.add_argument("--out-gltf", help="Output glTF path")
    args = ap.parse_args()

    obj_path = os.path.abspath(args.obj)
    if not os.path.isfile(obj_path):
        raise SystemExit(f"Missing OBJ: {obj_path}")

    out_obj = args.out_obj
    if not out_obj:
        base = os.path.splitext(obj_path)[0]
        out_obj = base + "_tri.obj"
    out_obj = os.path.abspath(out_obj)

    out_gltf = args.out_gltf
    if not out_gltf:
        base = os.path.splitext(obj_path)[0]
        out_gltf = base + ".gltf"
    out_gltf = os.path.abspath(out_gltf)

    positions, texcoords, normals, mtllibs, mtl_order, faces_by_mtl = parse_obj(obj_path)
    if not positions:
        raise SystemExit("No vertices found in OBJ.")

    write_triangulated_obj(out_obj, positions, texcoords, normals, mtllibs, mtl_order, faces_by_mtl)
    export_gltf(obj_path, out_gltf, positions, texcoords, normals, mtl_order, faces_by_mtl, mtllibs)

    print(f"Triangulated OBJ: {out_obj}")
    print(f"glTF: {out_gltf}")


if __name__ == "__main__":
    main()
