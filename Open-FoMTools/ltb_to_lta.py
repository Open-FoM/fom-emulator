#!/usr/bin/env python3
import argparse
import os
import re
import sys

try:
    from ltb_exporter import (
        parse_model,
        build_mesh_primitives,
        mat_decompose_trs,
        decode_pos,
        decode_quat,
        safe_index,
        resolve_textures,
    )
except Exception as exc:
    print("Failed to import ltb_exporter: %s" % exc, file=sys.stderr)
    sys.exit(2)


def fmt_f(v):
    return "{:.6f}".format(v)


def fmt_vec3(v):
    return "{} {} {}".format(fmt_f(v[0]), fmt_f(v[1]), fmt_f(v[2]))


def fmt_vec2(v):
    return "{} {}".format(fmt_f(v[0]), fmt_f(v[1]))


def fmt_quat(q):
    return "{} {} {} {}".format(fmt_f(q[0]), fmt_f(q[1]), fmt_f(q[2]), fmt_f(q[3]))


def iter_ltb_files(path, recursive=True):
    if os.path.isdir(path):
        if recursive:
            for root, _, files in os.walk(path):
                for name in files:
                    if name.lower().endswith(".ltb"):
                        yield os.path.join(root, name), path
        else:
            for name in os.listdir(path):
                if name.lower().endswith(".ltb"):
                    yield os.path.join(path, name), path
    else:
        if path.lower().endswith(".ltb"):
            yield path, None


def build_out_path(src_path, out_root, base_root):
    if out_root:
        if base_root:
            rel = os.path.relpath(src_path, base_root)
            rel = os.path.splitext(rel)[0] + ".lta"
            return os.path.join(out_root, rel)
        base = os.path.splitext(os.path.basename(src_path))[0] + ".lta"
        return os.path.join(out_root, base)
    return os.path.splitext(src_path)[0] + ".lta"


def node_order(root_index, children_map):
    order = []

    def walk(idx):
        order.append(idx)
        for child in children_map.get(idx, []):
            walk(child)

    walk(root_index)
    return order


def write_list_block(f, indent, tag, items, per_line=12):
    f.write("{}({} \n".format(indent, tag))
    f.write("{}\t(".format(indent))
    if items:
        count = 0
        for item in items:
            if count and count % per_line == 0:
                f.write("\n" + indent + "\t ")
            f.write("{} ".format(item))
            count += 1
    f.write(")\n")
    f.write("{})\n".format(indent))


def write_vec_list_block(f, indent, tag, vectors, dims):
    f.write("{}({} \n".format(indent, tag))
    f.write("{}\t(\n".format(indent))
    for v in vectors:
        if dims == 3:
            f.write("{}\t\t({} )\n".format(indent, fmt_vec3(v)))
        elif dims == 2:
            f.write("{}\t\t({} )\n".format(indent, fmt_vec2(v)))
    f.write("{}\t)\n".format(indent))
    f.write("{})\n".format(indent))


def write_matrix(f, indent, m):
    f.write("{}(matrix \n".format(indent))
    f.write("{}\t(\n".format(indent))
    for row in m:
        f.write("{}\t\t({} {} {} {} )\n".format(
            indent, fmt_f(row[0]), fmt_f(row[1]), fmt_f(row[2]), fmt_f(row[3])
        ))
    f.write("{}\t)\n".format(indent))
    f.write("{})\n".format(indent))


def write_transform(f, indent, node_index, nodes_by_index, children_map):
    node = nodes_by_index[node_index]
    f.write("{}(transform \"{}\" \n".format(indent, node["name"]))
    write_matrix(f, indent + "\t", node["global"])
    kids = children_map.get(node_index, [])
    f.write("{}\t(children \n".format(indent))
    if kids:
        f.write("{}\t\t(\n".format(indent))
        for child in kids:
            write_transform(f, indent + "\t\t", child, nodes_by_index, children_map)
        f.write("{}\t\t)\n".format(indent))
    else:
        f.write("{}\t\t()\n".format(indent))
    f.write("{}\t)\n".format(indent))
    f.write("{})\n".format(indent))


def build_uvs_for_indices(uvs, indices):
    out = []
    for idx in indices:
        if uvs and idx < len(uvs) and uvs[idx] is not None:
            out.append((uvs[idx][0], uvs[idx][1]))
        else:
            out.append((0.0, 0.0))
    return out


def build_normals(normals, vert_count):
    if normals and normals[0] is not None:
        return normals
    return [(0.0, 0.0, 1.0) for _ in range(vert_count)]


def build_deformer_weights(joints, weights):
    weightsets = []
    for jset, wset in zip(joints, weights):
        entry = []
        if jset is None or wset is None:
            weightsets.append(entry)
            continue
        for idx, w in zip(jset, wset):
            if w is None:
                continue
            if w > 0.0:
                entry.append((int(idx), w))
        weightsets.append(entry)
    return weightsets


def write_shape(f, indent, shape_name, prim, tex_indices, renderstyle, renderprio):
    f.write("{}(shape \"{}\" \n".format(indent, shape_name))
    f.write("{}\t(geometry \n".format(indent))
    f.write("{}\t\t(mesh \"{}\" \n".format(indent, shape_name))

    positions = prim["positions"]
    normals = build_normals(prim["normals"], len(positions))
    indices = prim["indices"]
    uvs = build_uvs_for_indices(prim["uvs"], indices)

    write_vec_list_block(f, indent + "\t\t\t", "vertex", positions, 3)
    write_vec_list_block(f, indent + "\t\t\t", "normals", normals, 3)
    write_vec_list_block(f, indent + "\t\t\t", "uvs", uvs, 2)
    write_list_block(f, indent + "\t\t\t", "tex-fs", list(range(len(indices))), per_line=16)
    write_list_block(f, indent + "\t\t\t", "tri-fs", indices, per_line=16)

    f.write("{}\t\t)\n".format(indent))
    f.write("{}\t)\n".format(indent))

    if tex_indices:
        write_list_block(f, indent + "\t", "texture-indices", tex_indices, per_line=8)
    else:
        f.write("{}\t(texture-indices () )\n".format(indent))
    f.write("{}\t(renderstyle-index {})\n".format(indent, renderstyle))
    f.write("{}\t(render-priority {})\n".format(indent, renderprio))
    f.write("{})\n".format(indent))


def write_animset(f, indent, anim, nodes_by_index, children_map):
    name = anim["name"] or "base"
    f.write("{}(animset \"{}\" \n".format(indent, name))
    f.write("{}\t(keyframe \n".format(indent))
    f.write("{}\t\t(keyframe \n".format(indent))
    times = [str(kf["time"]) for kf in anim["keyframes"]]
    values = [kf.get("str", "") for kf in anim["keyframes"]]
    write_list_block(f, indent + "\t\t\t", "times", times, per_line=12)
    f.write("{}\t\t\t(values \n".format(indent))
    f.write("{}\t\t\t\t(".format(indent))
    for val in values:
        safe = val.replace("\"", "\\\"")
        f.write("\"{}\" ".format(safe))
    f.write(")\n")
    f.write("{}\t\t\t)\n".format(indent))
    f.write("{}\t\t)\n".format(indent))
    f.write("{}\t)\n".format(indent))

    f.write("{}\t(anims \n".format(indent))
    f.write("{}\t\t(\n".format(indent))
    order = node_order(anim["root_index"], children_map)
    for node_idx in order:
        node = nodes_by_index.get(node_idx)
        if not node:
            continue
        node_name = node["name"]
        node_anim = anim["nodes"].get(node_idx)
        t, q, _s = mat_decompose_trs(node["from_parent"])
        frames = []
        if node_anim:
            pos_kind = node_anim["pos"][0]
            pos_data = node_anim["pos"][1]
            quat_kind = node_anim["quat"][0]
            quat_data = node_anim["quat"][1]
            for i in range(len(times)):
                pos = decode_pos(pos_kind, pos_data, safe_index(pos_kind, pos_data, i))
                quat = decode_quat(quat_kind, quat_data, safe_index(quat_kind, quat_data, i))
                frames.append((pos, quat))
        else:
            for _ in times:
                frames.append((t, q))

        f.write("{}\t\t\t(anim \n".format(indent))
        f.write("{}\t\t\t\t(parent \"{}\" )\n".format(indent, node_name))
        f.write("{}\t\t\t\t(frames \n".format(indent))
        f.write("{}\t\t\t\t\t(posquat \n".format(indent))
        f.write("{}\t\t\t\t\t\t(\n".format(indent))
        for pos, quat in frames:
            f.write("{}\t\t\t\t\t\t\t(\n".format(indent))
            f.write("{}\t\t\t\t\t\t\t\t({} )\n".format(indent, fmt_vec3(pos)))
            f.write("{}\t\t\t\t\t\t\t\t({} )\n".format(indent, fmt_quat(quat)))
            f.write("{}\t\t\t\t\t\t\t)\n".format(indent))
        f.write("{}\t\t\t\t\t\t)\n".format(indent))
        f.write("{}\t\t\t\t\t)\n".format(indent))
        f.write("{}\t\t\t\t)\n".format(indent))
        f.write("{}\t\t\t)\n".format(indent))
    f.write("{}\t\t)\n".format(indent))
    f.write("{}\t)\n".format(indent))
    f.write("{})\n".format(indent))


def write_lta(model, out_path, textures):
    out_dir = os.path.dirname(out_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    nodes_by_index = model["nodes_by_index"]
    children_map = model["children_map"]
    root_index = model["root_index"]

    tex_bindings = []
    for idx, tex in enumerate(textures or []):
        tex_bindings.append((idx, tex["source"].replace("/", "\\")))

    max_lods = max((len(p["lods"]) for p in model["pieces"]), default=0)
    primitives_by_lod = {}
    for lod_index in range(max_lods):
        primitives_by_lod[lod_index] = build_mesh_primitives(model, lod_index=lod_index, flip_v=False)

    with open(out_path, "w", encoding="ascii", errors="ignore") as f:
        f.write("(lt-model-0 \n")

        f.write("\t(on-load-cmds \n")
        f.write("\t\t(\n")

        f.write("\t\t\t(anim-bindings \n")
        f.write("\t\t\t\t(\n")
        if model["anims"]:
            for anim in model["anims"]:
                f.write("\t\t\t\t\t(anim-binding \n")
                f.write("\t\t\t\t\t\t(name \"{}\" )\n".format(anim["name"]))
                dims = anim["dims"]
                f.write("\t\t\t\t\t\t(dims \n\t\t\t\t\t\t\t({} )\n\t\t\t\t\t\t)\n".format(fmt_vec3(dims)))
                f.write("\t\t\t\t\t\t(translation \n\t\t\t\t\t\t\t(0.000000 0.000000 0.000000 )\n\t\t\t\t\t\t)\n")
                f.write("\t\t\t\t\t\t(interp-time {} )\n".format(anim["interpolation_ms"]))
                f.write("\t\t\t\t\t)\n")
        else:
            f.write("\t\t\t\t\t(anim-binding \n")
            f.write("\t\t\t\t\t\t(name \"base\" )\n")
            f.write("\t\t\t\t\t\t(dims \n\t\t\t\t\t\t\t(0.000000 0.000000 0.000000 )\n\t\t\t\t\t\t)\n")
            f.write("\t\t\t\t\t\t(translation \n\t\t\t\t\t\t\t(0.000000 0.000000 0.000000 )\n\t\t\t\t\t\t)\n")
            f.write("\t\t\t\t\t\t(interp-time 0 )\n")
            f.write("\t\t\t\t\t)\n")
        f.write("\t\t\t\t)\n")
        f.write("\t\t\t)\n")

        f.write("\t\t\t(set-node-flags \n")
        f.write("\t\t\t\t(\n")
        for idx in sorted(nodes_by_index.keys()):
            node = nodes_by_index[idx]
            f.write("\t\t\t\t\t(\"{}\" {} )\n".format(node["name"], int(node["flags"])))
        f.write("\t\t\t\t)\n")
        f.write("\t\t\t)\n")

        if model.get("command"):
            cmd = model["command"].replace("\"", "\\\"")
            f.write("\t\t\t(set-command-string \"{}\" )\n".format(cmd))

        f.write("\t\t\t(lod-groups \n")
        f.write("\t\t\t\t(\n")
        for piece in model["pieces"]:
            shape_names = []
            for lod_index in range(len(piece["lods"])):
                if lod_index == 0:
                    shape_names.append(piece["name"])
                else:
                    shape_names.append("{}_{}".format(piece["name"], lod_index - 1))
            f.write("\t\t\t\t\t(create-lod-group \"{}\" \n".format(piece["name"]))
            f.write("\t\t\t\t\t\t(lod-dists \n")
            dists = piece.get("lod_dists", [])
            f.write("\t\t\t\t\t\t\t({} )\n".format(" ".join(fmt_f(d) for d in dists)))
            f.write("\t\t\t\t\t\t)\n")
            f.write("\t\t\t\t\t\t(shapes \n")
            f.write("\t\t\t\t\t\t\t({} )\n".format(" ".join("\"{}\"".format(n) for n in shape_names)))
            f.write("\t\t\t\t\t\t)\n")
            f.write("\t\t\t\t\t)\n")
        f.write("\t\t\t\t)\n")
        f.write("\t\t\t)\n")

        f.write("\t\t\t(set-global-radius {} )\n".format(fmt_f(model.get("vis_radius", 0.0))))
        f.write("\t\t\t(add-node-obb-list \n\t\t\t\t()\n\t\t\t)\n")

        f.write("\t\t\t(add-sockets \n")
        f.write("\t\t\t\t(\n")
        for sock in model.get("sockets", []):
            node = nodes_by_index.get(sock["node"])
            if not node:
                continue
            f.write("\t\t\t\t\t(socket \"{}\" \n".format(sock["name"]))
            f.write("\t\t\t\t\t\t(parent \"{}\" )\n".format(node["name"]))
            f.write("\t\t\t\t\t\t(pos \n\t\t\t\t\t\t\t({} )\n\t\t\t\t\t\t)\n".format(fmt_vec3(sock["pos"])))
            f.write("\t\t\t\t\t\t(quat \n\t\t\t\t\t\t\t({} )\n\t\t\t\t\t\t)\n".format(fmt_quat(sock["rot"])))
            f.write("\t\t\t\t\t\t(scale \n\t\t\t\t\t\t\t({} )\n\t\t\t\t\t\t)\n".format(fmt_vec3(sock["scale"])))
            f.write("\t\t\t\t\t)\n")
        f.write("\t\t\t\t)\n")
        f.write("\t\t\t)\n")

        if len(model.get("child_models", [])) > 1:
            f.write("\t\t\t(add-childmodels \n")
            f.write("\t\t\t\t(\n")
            for cm in model["child_models"][1:]:
                name = cm.get("name") or ""
                f.write("\t\t\t\t\t(child-model \n")
                f.write("\t\t\t\t\t\t(filename \"{}\" )\n".format(name))
                f.write("\t\t\t\t\t\t(save-index 0 )\n")
                f.write("\t\t\t\t\t)\n")
            f.write("\t\t\t\t)\n")
            f.write("\t\t\t)\n")

        if model.get("weight_sets"):
            f.write("\t\t\t(anim-weightsets \n")
            f.write("\t\t\t\t(\n")
            for ws in model["weight_sets"]:
                f.write("\t\t\t\t\t(anim-weightset \n")
                f.write("\t\t\t\t\t\t(name \"{}\" )\n".format(ws["name"]))
                weights = [fmt_f(w) for w in ws["weights"]]
                write_list_block(f, "\t\t\t\t\t\t", "weights", weights, per_line=12)
                f.write("\t\t\t\t\t)\n")
            f.write("\t\t\t\t)\n")
            f.write("\t\t\t)\n")

        for piece in model["pieces"]:
            for lod_index, lod in enumerate(piece["lods"]):
                shape_name = piece["name"] if lod_index == 0 else "{}_{}".format(piece["name"], lod_index - 1)
                prim = None
                for cand in primitives_by_lod.get(lod_index, []):
                    if cand["name"] == piece["name"]:
                        prim = cand
                        break
                if prim is None:
                    continue
                joints = prim.get("joints") or []
                weights = prim.get("weights") or []
                if not joints or not weights:
                    continue
                influences = set()
                for jset in joints:
                    if jset is None:
                        continue
                    for idx in jset:
                        influences.add(int(idx))
                influence_list = [
                    nodes_by_index[i]["name"]
                    for i in sorted(influences)
                    if i in nodes_by_index
                ]
                if not influence_list:
                    continue
                weightsets = build_deformer_weights(joints, weights)

                f.write("\t\t\t(add-deformer \n")
                f.write("\t\t\t\t(skel-deformer \n")
                f.write("\t\t\t\t\t(target \"{}\" )\n".format(shape_name))
                f.write("\t\t\t\t\t(influences \n")
                f.write("\t\t\t\t\t\t(\n")
                f.write("\t\t\t\t\t\t\t({} )\n".format(" ".join("\"{}\"".format(n) for n in influence_list)))
                f.write("\t\t\t\t\t\t)\n")
                f.write("\t\t\t\t\t)\n")
                f.write("\t\t\t\t\t(weightsets \n")
                f.write("\t\t\t\t\t\t(\n")
                for ws in weightsets:
                    if not ws:
                        f.write("\t\t\t\t\t\t\t()\n")
                        continue
                    entry = " ".join("{} {}".format(idx, fmt_f(w)) for idx, w in ws)
                    f.write("\t\t\t\t\t\t\t({} )\n".format(entry))
                f.write("\t\t\t\t\t\t)\n")
                f.write("\t\t\t\t\t)\n")
                f.write("\t\t\t\t)\n")
                f.write("\t\t\t)\n")

        f.write("\t\t)\n")
        f.write("\t)\n")

        f.write("\t(hierarchy \n")
        f.write("\t\t(children \n")
        f.write("\t\t\t(\n")
        write_transform(f, "\t\t\t", root_index, nodes_by_index, children_map)
        f.write("\t\t\t)\n")
        f.write("\t\t)\n")
        f.write("\t)\n")

        for piece in model["pieces"]:
            for lod_index, lod in enumerate(piece["lods"]):
                shape_name = piece["name"] if lod_index == 0 else "{}_{}".format(piece["name"], lod_index - 1)
                prim = None
                for cand in primitives_by_lod.get(lod_index, []):
                    if cand["name"] == piece["name"]:
                        prim = cand
                        break
                if prim is None:
                    continue
                tex_indices = [i for i in lod.get("tex_indices", []) if i is not None and i >= 0]
                renderstyle = lod.get("renderstyle", 0)
                renderprio = lod.get("renderprio", 0)
                write_shape(f, "\t", shape_name, prim, tex_indices, renderstyle, renderprio)

        f.write("\t(tools-info \n")
        f.write("\t\t(\n")
        f.write("\t\t\t(texture-bindings \n")
        f.write("\t\t\t\t(\n")
        for idx, path in tex_bindings:
            f.write("\t\t\t\t\t({} \"{}\" )\n".format(idx, path))
        f.write("\t\t\t\t)\n")
        f.write("\t\t\t)\n")
        f.write("\t\t\t(compile-options \n")
        f.write("\t\t\t\t(\n")
        f.write("\t\t\t\t\t(compression-type 2 )\n")
        f.write("\t\t\t\t)\n")
        f.write("\t\t\t)\n")
        f.write("\t\t)\n")
        f.write("\t)\n")

        if model.get("anims"):
            for anim in model["anims"]:
                anim["root_index"] = root_index
                write_animset(f, "\t", anim, nodes_by_index, children_map)
        else:
            dummy = {
                "name": "base",
                "keyframes": [{"time": 0, "str": ""}],
                "nodes": {},
                "root_index": root_index,
            }
            write_animset(f, "\t", dummy, nodes_by_index, children_map)

        f.write(")\n")


def split_texture_args(values):
    results = []
    for val in values or []:
        if not val:
            continue
        parts = re.split(r"[;,]", val)
        for part in parts:
            part = part.strip()
            if part:
                results.append(part)
    return results


def main():
    parser = argparse.ArgumentParser(description="Batch convert LTB -> LTA (custom writer).")
    parser.add_argument("inputs", nargs="+", help="LTB file or folder(s) containing LTBs")
    parser.add_argument("--out-root", default=None, help="Output root (mirrors folder tree when input is a directory)")
    parser.add_argument("--no-recursive", action="store_true", help="Do not recurse folders")
    parser.add_argument("--resources-root", default=None, help="Resources root for auto texture binding")
    parser.add_argument("--textures", action="append", default=[], help="Manual texture paths (.dtx/.png). Repeatable.")
    args = parser.parse_args()

    out_root = os.path.abspath(args.out_root) if args.out_root else None
    recursive = not args.no_recursive
    tex_args = split_texture_args(args.textures)

    jobs = []
    for item in args.inputs:
        for src, base_root in iter_ltb_files(item, recursive=recursive):
            dst = build_out_path(src, out_root, base_root)
            jobs.append((os.path.abspath(src), os.path.abspath(dst)))

    if not jobs:
        print("No .ltb files found.", file=sys.stderr)
        return 1

    for src, dst in jobs:
        model = parse_model(src)
        textures = resolve_textures(src, os.path.dirname(dst), args.resources_root, tex_args)
        write_lta(model, dst, textures)
        print("Wrote LTA: {}".format(dst))

    return 0


if __name__ == "__main__":
    sys.exit(main())
