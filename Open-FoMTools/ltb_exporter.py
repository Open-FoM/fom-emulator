import argparse
import json
import math
import os
import re
import shutil
import struct


# LithTech LTB -> OBJ + glTF exporter (skeletal + animations).
# Based on LithTech model loader source under External/LithTech.


def guess_resources_root():
    here = os.path.abspath(os.path.dirname(__file__))
    repo_root = os.path.abspath(os.path.join(here, "..", ".."))
    return os.path.join(repo_root, "Client", "Client_FoM", "Resources")


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


def expand_texture_inputs(values):
    textures = []
    for val in split_texture_args(values):
        if os.path.isdir(val):
            for name in sorted(os.listdir(val)):
                if name.lower().endswith((".dtx", ".png")):
                    textures.append(os.path.join(val, name))
        else:
            textures.append(val)
    return textures


def parse_suffix_index(name, prefix):
    if not prefix:
        return None
    if not name.startswith(prefix + "_"):
        return None
    rest = name[len(prefix) + 1:]
    if rest.isdigit():
        return int(rest)
    return None


def gather_texture_candidates(base_name, resources_root):
    if not resources_root:
        return []
    skins_root = os.path.join(resources_root, "Skins")
    if not os.path.isdir(skins_root):
        return []
    base_lower = base_name.lower()
    base_core = re.sub(r"\d+$", "", base_lower)
    base_prefix = base_lower.split("_", 1)[0] if "_" in base_lower else base_lower

    candidates = []
    for root, _, files in os.walk(skins_root):
        for name in files:
            if not name.lower().endswith(".dtx"):
                continue
            stem = os.path.splitext(name)[0].lower()
            rank = None
            suffix = None
            if stem == base_lower:
                rank = 0
            elif stem == base_core and base_core:
                rank = 1
            elif stem.startswith(base_lower + "_"):
                rank = 2
                suffix = parse_suffix_index(stem, base_lower)
            elif base_core and stem.startswith(base_core + "_"):
                rank = 3
                suffix = parse_suffix_index(stem, base_core)
            elif base_prefix and stem.startswith(base_prefix + "_"):
                rank = 4
                suffix = parse_suffix_index(stem, base_prefix)
            if rank is not None:
                candidates.append((rank, suffix if suffix is not None else 9999, name, os.path.join(root, name)))

    candidates.sort(key=lambda item: (item[0], item[1], item[2]))
    return [path for _, _, _, path in candidates]


def ensure_png_from_texture(texture_path, out_dir, quiet=False):
    if not texture_path:
        return None
    ext = os.path.splitext(texture_path)[1].lower()
    base = os.path.splitext(os.path.basename(texture_path))[0]
    out_path = os.path.join(out_dir, base + ".png")
    os.makedirs(out_dir, exist_ok=True)

    if ext == ".png":
        if os.path.abspath(texture_path) != os.path.abspath(out_path):
            if not os.path.exists(out_path):
                shutil.copy2(texture_path, out_path)
        return out_path

    if ext == ".dtx":
        if os.path.exists(out_path):
            return out_path
        try:
            from fom_dtx_to_png import convert_one as dtx_convert
        except Exception:
            dtx_convert = None
        if not dtx_convert:
            if not quiet:
                print("warn: DTX converter not available for {}".format(texture_path))
            return None
        ok = dtx_convert(texture_path, out_path, 0, False, quiet)
        return out_path if ok else None

    return None


def resolve_textures(ltb_path, out_dir, resources_root=None, texture_args=None):
    textures = []
    manual = expand_texture_inputs(texture_args)
    if manual:
        for tex_path in manual:
            png_path = ensure_png_from_texture(tex_path, out_dir, quiet=False)
            if png_path:
                textures.append({
                    "source": tex_path,
                    "png_path": png_path,
                    "file": os.path.basename(png_path),
                })
        return textures

    root = resources_root or guess_resources_root()
    base_name = os.path.splitext(os.path.basename(ltb_path))[0]
    candidates = gather_texture_candidates(base_name, root)
    for tex_path in candidates:
        png_path = ensure_png_from_texture(tex_path, out_dir, quiet=True)
        if png_path:
            textures.append({
                "source": tex_path,
                "png_path": png_path,
                "file": os.path.basename(png_path),
            })
    return textures


class Reader:
    def __init__(self, data):
        self.data = data
        self.ofs = 0

    def tell(self):
        return self.ofs

    def seek(self, ofs):
        self.ofs = ofs

    def read(self, fmt):
        size = struct.calcsize(fmt)
        if self.ofs + size > len(self.data):
            raise EOFError("read past end")
        val = struct.unpack_from(fmt, self.data, self.ofs)
        self.ofs += size
        return val if len(val) > 1 else val[0]

    def read_u8(self):
        return self.read("<B")

    def read_u16(self):
        return self.read("<H")

    def read_u32(self):
        return self.read("<I")

    def read_i32(self):
        return self.read("<i")

    def read_f32(self):
        return self.read("<f")

    def read_bool(self):
        return self.read("<?")

    def read_bytes(self, n):
        if self.ofs + n > len(self.data):
            raise EOFError("read past end")
        b = self.data[self.ofs:self.ofs + n]
        self.ofs += n
        return b

    def read_string(self):
        length = self.read_u16()
        if length == 0:
            return ""
        b = self.read_bytes(length)
        return b.decode("latin1", errors="replace")


# LTB header layout (with padding).
def read_ltb_header(r):
    # struct: uint8 type; pad1; uint16 version; uint8 res1; pad3; uint32 res2,res3,res4
    file_type = r.read_u8()
    r.read_u8()  # padding
    version = r.read_u16()
    res1 = r.read_u8()
    r.read_bytes(3)  # padding
    res2 = r.read_u32()
    res3 = r.read_u32()
    res4 = r.read_u32()
    return {
        "file_type": file_type,
        "version": version,
        "res1": res1,
        "res2": res2,
        "res3": res3,
        "res4": res4,
    }


def mat_mul(a, b):
    # 4x4 row-major multiply: c = a * b
    c = [[0.0] * 4 for _ in range(4)]
    for i in range(4):
        ai = a[i]
        for j in range(4):
            c[i][j] = ai[0] * b[0][j] + ai[1] * b[1][j] + ai[2] * b[2][j] + ai[3] * b[3][j]
    return c


def mat_identity():
    return [
        [1.0, 0.0, 0.0, 0.0],
        [0.0, 1.0, 0.0, 0.0],
        [0.0, 0.0, 1.0, 0.0],
        [0.0, 0.0, 0.0, 1.0],
    ]


def mat_inverse(m):
    # Generic 4x4 inversion using Gauss-Jordan.
    a = [row[:] for row in m]
    inv = mat_identity()
    for i in range(4):
        pivot = i
        pivot_val = abs(a[i][i])
        for r in range(i + 1, 4):
            if abs(a[r][i]) > pivot_val:
                pivot = r
                pivot_val = abs(a[r][i])
        if pivot_val < 1e-8:
            raise ValueError("singular matrix")
        if pivot != i:
            a[i], a[pivot] = a[pivot], a[i]
            inv[i], inv[pivot] = inv[pivot], inv[i]
        div = a[i][i]
        for j in range(4):
            a[i][j] /= div
            inv[i][j] /= div
        for r in range(4):
            if r == i:
                continue
            factor = a[r][i]
            if factor == 0.0:
                continue
            for j in range(4):
                a[r][j] -= factor * a[i][j]
                inv[r][j] -= factor * inv[i][j]
    return inv


def mat_to_gltf_col_major(m):
    # Convert row-major 4x4 to glTF column-major array.
    return [
        m[0][0], m[1][0], m[2][0], m[3][0],
        m[0][1], m[1][1], m[2][1], m[3][1],
        m[0][2], m[1][2], m[2][2], m[3][2],
        m[0][3], m[1][3], m[2][3], m[3][3],
    ]


def mat_decompose_trs(m):
    # Translation from last column.
    tx, ty, tz = m[0][3], m[1][3], m[2][3]
    # Basis vectors are columns.
    col0 = [m[0][0], m[1][0], m[2][0]]
    col1 = [m[0][1], m[1][1], m[2][1]]
    col2 = [m[0][2], m[1][2], m[2][2]]
    sx = math.sqrt(col0[0] ** 2 + col0[1] ** 2 + col0[2] ** 2) or 1.0
    sy = math.sqrt(col1[0] ** 2 + col1[1] ** 2 + col1[2] ** 2) or 1.0
    sz = math.sqrt(col2[0] ** 2 + col2[1] ** 2 + col2[2] ** 2) or 1.0
    # Normalize columns to build rotation matrix.
    r00, r10, r20 = col0[0] / sx, col0[1] / sx, col0[2] / sx
    r01, r11, r21 = col1[0] / sy, col1[1] / sy, col1[2] / sy
    r02, r12, r22 = col2[0] / sz, col2[1] / sz, col2[2] / sz
    quat = quat_from_matrix([
        [r00, r01, r02],
        [r10, r11, r12],
        [r20, r21, r22],
    ])
    return (tx, ty, tz), quat, (sx, sy, sz)


def quat_from_matrix(m):
    # m is 3x3, row-major.
    trace = m[0][0] + m[1][1] + m[2][2]
    if trace > 0.0:
        s = math.sqrt(trace + 1.0) * 2.0
        w = 0.25 * s
        x = (m[2][1] - m[1][2]) / s
        y = (m[0][2] - m[2][0]) / s
        z = (m[1][0] - m[0][1]) / s
    else:
        if m[0][0] > m[1][1] and m[0][0] > m[2][2]:
            s = math.sqrt(1.0 + m[0][0] - m[1][1] - m[2][2]) * 2.0
            w = (m[2][1] - m[1][2]) / s
            x = 0.25 * s
            y = (m[0][1] + m[1][0]) / s
            z = (m[0][2] + m[2][0]) / s
        elif m[1][1] > m[2][2]:
            s = math.sqrt(1.0 + m[1][1] - m[0][0] - m[2][2]) * 2.0
            w = (m[0][2] - m[2][0]) / s
            x = (m[0][1] + m[1][0]) / s
            y = 0.25 * s
            z = (m[1][2] + m[2][1]) / s
        else:
            s = math.sqrt(1.0 + m[2][2] - m[0][0] - m[1][1]) * 2.0
            w = (m[1][0] - m[0][1]) / s
            x = (m[0][2] + m[2][0]) / s
            y = (m[1][2] + m[2][1]) / s
            z = 0.25 * s
    return (x, y, z, w)


# Vertex data flags (from d3d_utils.h)
VERTDATATYPE_POSITION = 0x0001
VERTDATATYPE_NORMAL = 0x0002
VERTDATATYPE_DIFFUSE = 0x0004
VERTDATATYPE_PSIZE = 0x0008
VERTDATATYPE_UVSETS_1 = 0x0010
VERTDATATYPE_UVSETS_2 = 0x0020
VERTDATATYPE_UVSETS_3 = 0x0040
VERTDATATYPE_UVSETS_4 = 0x0080
VERTDATATYPE_BASISVECTORS = 0x0100

BLEND_NO = 0
BLEND_NONINDEXED_B1 = 1
BLEND_NONINDEXED_B2 = 2
BLEND_NONINDEXED_B3 = 3
BLEND_INDEXED_B1 = 4
BLEND_INDEXED_B2 = 5
BLEND_INDEXED_B3 = 6


def get_blend_type_for_rd(max_bones_tri):
    if max_bones_tri == 1:
        return BLEND_NO
    if max_bones_tri == 2:
        return BLEND_NONINDEXED_B1
    if max_bones_tri == 3:
        return BLEND_NONINDEXED_B2
    if max_bones_tri == 4:
        return BLEND_NONINDEXED_B3
    return BLEND_NONINDEXED_B3


def get_blend_type_for_mp(max_bones_vert):
    if max_bones_vert == 2:
        return BLEND_INDEXED_B1
    if max_bones_vert == 3:
        return BLEND_INDEXED_B2
    if max_bones_vert == 4:
        return BLEND_INDEXED_B3
    return BLEND_INDEXED_B3


def read_vertex_stream(r, vert_count, vert_data_type, blend_type):
    positions = [None] * vert_count
    normals = [None] * vert_count
    uvs = [None] * vert_count
    weights = [None] * vert_count
    joints = [None] * vert_count

    has_pos = (vert_data_type & VERTDATATYPE_POSITION) != 0
    has_norm = (vert_data_type & VERTDATATYPE_NORMAL) != 0
    uv_sets = 0
    if vert_data_type & VERTDATATYPE_UVSETS_1:
        uv_sets = 1
    elif vert_data_type & VERTDATATYPE_UVSETS_2:
        uv_sets = 2
    elif vert_data_type & VERTDATATYPE_UVSETS_3:
        uv_sets = 3
    elif vert_data_type & VERTDATATYPE_UVSETS_4:
        uv_sets = 4
    has_basis = (vert_data_type & VERTDATATYPE_BASISVECTORS) != 0
    has_diffuse = (vert_data_type & VERTDATATYPE_DIFFUSE) != 0

    for i in range(vert_count):
        if has_pos and has_norm:
            x = r.read_f32()
            y = r.read_f32()
            z = r.read_f32()
            blend = []
            idxs = None
            if blend_type == BLEND_NONINDEXED_B1:
                blend = [r.read_f32()]
            elif blend_type == BLEND_NONINDEXED_B2:
                blend = [r.read_f32(), r.read_f32()]
            elif blend_type == BLEND_NONINDEXED_B3:
                blend = [r.read_f32(), r.read_f32(), r.read_f32()]
            elif blend_type == BLEND_INDEXED_B1:
                blend = [r.read_f32()]
                idxs = [r.read_u8(), r.read_u8(), r.read_u8(), r.read_u8()]
            elif blend_type == BLEND_INDEXED_B2:
                blend = [r.read_f32(), r.read_f32()]
                idxs = [r.read_u8(), r.read_u8(), r.read_u8(), r.read_u8()]
            elif blend_type == BLEND_INDEXED_B3:
                blend = [r.read_f32(), r.read_f32(), r.read_f32()]
                idxs = [r.read_u8(), r.read_u8(), r.read_u8(), r.read_u8()]
            nx = r.read_f32()
            ny = r.read_f32()
            nz = r.read_f32()
            positions[i] = (x, y, z)
            normals[i] = (nx, ny, nz)
            if idxs is not None:
                joints[i] = idxs
            if blend:
                weights[i] = blend
        if has_diffuse:
            # Skip diffuse color.
            r.read_u32()
        if uv_sets >= 1:
            u = r.read_f32()
            v = r.read_f32()
            uvs[i] = (u, v)
            # Skip extra UV sets if present.
            for _ in range(uv_sets - 1):
                r.read_f32()
                r.read_f32()
        if has_basis:
            # tangent + binormal (6 floats) - skip for now.
            r.read_f32()
            r.read_f32()
            r.read_f32()
            r.read_f32()
            r.read_f32()
            r.read_f32()

    return {
        "positions": positions,
        "normals": normals,
        "uvs": uvs,
        "weights": weights,
        "joints": joints,
    }


def merge_vertex_streams(streams, vert_count):
    positions = [None] * vert_count
    normals = [None] * vert_count
    uvs = [None] * vert_count
    weights = [None] * vert_count
    joints = [None] * vert_count
    for s in streams:
        sp = s["positions"]
        sn = s["normals"]
        su = s["uvs"]
        sw = s["weights"]
        sj = s["joints"]
        for i in range(vert_count):
            if sp[i] is not None:
                positions[i] = sp[i]
            if sn[i] is not None:
                normals[i] = sn[i]
            if su[i] is not None:
                uvs[i] = su[i]
            if sw[i] is not None:
                weights[i] = sw[i]
            if sj[i] is not None:
                joints[i] = sj[i]
    return positions, normals, uvs, weights, joints

def parse_render_object(r, render_object_type, lod_index):
    # render_object_type per CRenderObject::RENDER_OBJECT_TYPES
    start = r.tell()
    obj_size = r.read_u32()
    data_start = r.tell()
    mesh = {
        "type": render_object_type,
        "obj_size": obj_size,
        "lod_index": lod_index,
    }

    def skip_to_end():
        end = data_start + obj_size
        if r.tell() < end:
            r.seek(end)

    if render_object_type == 7:  # null mesh
        skip_to_end()
        return mesh

    if render_object_type == 4:  # rigid
        vert_count = r.read_u32()
        poly_count = r.read_u32()
        max_bones_tri = r.read_u32()
        max_bones_vert = r.read_u32()
        vert_stream_flags = [r.read_u32() for _ in range(4)]
        bone_effector = r.read_u32()
        blend_type = BLEND_NO
        streams = []
        for flag in vert_stream_flags:
            if flag == 0:
                streams.append({"positions": [None] * vert_count,
                                "normals": [None] * vert_count,
                                "uvs": [None] * vert_count,
                                "weights": [None] * vert_count,
                                "joints": [None] * vert_count})
                continue
            streams.append(read_vertex_stream(r, vert_count, flag, blend_type))
        indices = [r.read_u16() for _ in range(poly_count * 3)]
        skip_to_end()
        mesh.update({
            "mesh_type": "rigid",
            "vert_count": vert_count,
            "poly_count": poly_count,
            "vert_stream_flags": vert_stream_flags,
            "bone_effector": bone_effector,
            "indices": indices,
            "streams": streams,
        })
        return mesh

    if render_object_type == 5:  # skel
        vert_count = r.read_u32()
        poly_count = r.read_u32()
        max_bones_tri = r.read_u32()
        max_bones_vert = r.read_u32()
        b_reindexed = r.read_bool()
        vert_stream_flags = [r.read_u32() for _ in range(4)]
        use_mp = r.read_bool()

        if use_mp:
            min_bone = r.read_u32()
            max_bone = r.read_u32()
            reindexed_list = []
            if b_reindexed:
                bone_count = r.read_u32()
                reindexed_list = [r.read_u32() for _ in range(bone_count)]
            blend_type = get_blend_type_for_mp(max_bones_vert)
            streams = []
            for flag in vert_stream_flags:
                if flag == 0:
                    streams.append({"positions": [None] * vert_count,
                                    "normals": [None] * vert_count,
                                    "uvs": [None] * vert_count,
                                    "weights": [None] * vert_count,
                                    "joints": [None] * vert_count})
                    continue
                streams.append(read_vertex_stream(r, vert_count, flag, blend_type))
            indices = [r.read_u16() for _ in range(poly_count * 3)]
            skip_to_end()
            mesh.update({
                "mesh_type": "skel_mp",
                "vert_count": vert_count,
                "poly_count": poly_count,
                "vert_stream_flags": vert_stream_flags,
                "max_bones_tri": max_bones_tri,
                "max_bones_vert": max_bones_vert,
                "b_reindexed": b_reindexed,
                "min_bone": min_bone,
                "max_bone": max_bone,
                "reindexed_list": reindexed_list,
                "indices": indices,
                "streams": streams,
            })
            return mesh
        else:
            blend_type = get_blend_type_for_rd(max_bones_tri)
            streams = []
            for flag in vert_stream_flags:
                if flag == 0:
                    streams.append({"positions": [None] * vert_count,
                                    "normals": [None] * vert_count,
                                    "uvs": [None] * vert_count,
                                    "weights": [None] * vert_count,
                                    "joints": [None] * vert_count})
                    continue
                streams.append(read_vertex_stream(r, vert_count, flag, blend_type))
            indices = [r.read_u16() for _ in range(poly_count * 3)]
            bone_set_count = r.read_u32()
            bone_sets = []
            for _ in range(bone_set_count):
                first_vert = r.read_u16()
                vert_cnt = r.read_u16()
                bones = [r.read_u8(), r.read_u8(), r.read_u8(), r.read_u8()]
                idx_into = r.read_u32()
                bone_sets.append({
                    "first_vert": first_vert,
                    "vert_count": vert_cnt,
                    "bones": bones,
                    "index_into": idx_into,
                })
            skip_to_end()
            mesh.update({
                "mesh_type": "skel_rd",
                "vert_count": vert_count,
                "poly_count": poly_count,
                "vert_stream_flags": vert_stream_flags,
                "max_bones_tri": max_bones_tri,
                "max_bones_vert": max_bones_vert,
                "b_reindexed": b_reindexed,
                "indices": indices,
                "streams": streams,
                "bone_sets": bone_sets,
            })
            return mesh

    if render_object_type == 6:  # vertex anim
        vert_count = r.read_u32()
        undup_vert_count = r.read_u32()
        poly_count = r.read_u32()
        max_bones_tri = r.read_u32()
        max_bones_vert = r.read_u32()
        vert_stream_flags = [r.read_u32() for _ in range(4)]
        anim_node_idx = r.read_u32()
        bone_effector = r.read_u32()
        blend_type = BLEND_NO
        streams = []
        for flag in vert_stream_flags:
            if flag == 0:
                streams.append({"positions": [None] * vert_count,
                                "normals": [None] * vert_count,
                                "uvs": [None] * vert_count,
                                "weights": [None] * vert_count,
                                "joints": [None] * vert_count})
                continue
            streams.append(read_vertex_stream(r, vert_count, flag, blend_type))
        indices = [r.read_u16() for _ in range(poly_count * 3)]
        dup_count = r.read_u32()
        r.read_bytes(dup_count * 4)  # DupMap list
        skip_to_end()
        mesh.update({
            "mesh_type": "va",
            "vert_count": vert_count,
            "poly_count": poly_count,
            "vert_stream_flags": vert_stream_flags,
            "indices": indices,
            "streams": streams,
            "anim_node_idx": anim_node_idx,
            "bone_effector": bone_effector,
            "undup_vert_count": undup_vert_count,
        })
        return mesh

    # Unknown type, just skip.
    r.seek(data_start + obj_size)
    return mesh


def parse_model(path):
    data = open(path, "rb").read()
    r = Reader(data)
    header = read_ltb_header(r)
    file_version = r.read_u32()
    allocs = [r.read_u32() for _ in range(15)]
    command = r.read_string()
    vis_radius = r.read_f32()
    num_obb = r.read_u32()
    if num_obb:
        # ModelOBB size in ltbasetypes.h is 68 bytes.
        r.read_bytes(68 * num_obb)

    pieces = []
    n_pieces = r.read_u32()
    for _ in range(n_pieces):
        piece_name = r.read_string()
        n_lods = r.read_u32()
        lod_dists = [r.read_f32() for _ in range(n_lods)]
        r.read_u32()
        r.read_u32()
        lods = []
        for lod_index in range(n_lods):
            n_textures = r.read_u32()
            tex_indices = [r.read_i32() for _ in range(4)]
            renderstyle = r.read_i32()
            renderprio = r.read_u8()
            render_object_type = r.read_u32()
            mesh = parse_render_object(r, render_object_type, lod_index)
            used_nodes_size = r.read_u8()
            used_nodes = r.read_bytes(used_nodes_size) if used_nodes_size else b""
            lods.append({
                "n_textures": n_textures,
                "tex_indices": tex_indices,
                "renderstyle": renderstyle,
                "renderprio": renderprio,
                "render_object_type": render_object_type,
                "mesh": mesh,
                "used_nodes": used_nodes,
            })
        pieces.append({
            "name": piece_name,
            "lod_dists": lod_dists,
            "lods": lods,
        })

    # Parse node tree.
    nodes_by_index = {}
    children_map = {}

    def parse_node(parent_inv, parent_index=None):
        name = r.read_string()
        node_index = r.read_u16()
        flags = r.read_u8()
        # global transform
        m = [[0.0] * 4 for _ in range(4)]
        for i in range(4):
            for j in range(4):
                m[i][j] = r.read_f32()
        inv = mat_inverse(m)
        from_parent = mat_mul(parent_inv, m)
        child_count = r.read_u32()
        children = []
        for _ in range(child_count):
            child_index = parse_node(inv, node_index)
            children.append(child_index)
        nodes_by_index[node_index] = {
            "name": name,
            "index": node_index,
            "flags": flags,
            "global": m,
            "inv_global": inv,
            "from_parent": from_parent,
            "parent": parent_index,
        }
        children_map[node_index] = children
        return node_index

    root_index = parse_node(mat_identity(), None)

    # Weight sets.
    weight_sets = []
    n_sets = r.read_u32()
    for _ in range(n_sets):
        ws_name = r.read_string()
        n_weights = r.read_u32()
        weights = [r.read_f32() for _ in range(n_weights)]
        weight_sets.append({"name": ws_name, "weights": weights})

    # Child models.
    child_models = []
    n_child_models = r.read_u32()
    for i in range(n_child_models):
        if i == 0:
            child_models.append({"name": "SELF"})
        else:
            child_models.append({"name": r.read_string()})

    # Animations.
    anims = []
    n_anims = r.read_u32()

    def read_vector():
        return (r.read_f32(), r.read_f32(), r.read_f32())

    for _ in range(n_anims):
        dims = read_vector()
        anim_name = r.read_string()
        compression_type = r.read_u32()
        interpolation_ms = r.read_u32()
        n_keyframes = r.read_u32()
        keyframes = []
        for _k in range(n_keyframes):
            t = r.read_u32()
            s = r.read_string()
            keyframes.append({"time": t, "str": s})

        # Prepare anim nodes in tree order (recursively).
        anim_nodes = {}

        def load_anim_node(node_index):
            if compression_type == 0:
                is_vertex_anim = r.read_u8()
                if is_vertex_anim:
                    # Vertex animation; load per-keyframe vertex lists.
                    vtx_frames = []
                    for _kf in range(n_keyframes):
                        sz = r.read_u32()
                        if sz:
                            data = r.read_bytes(sz * 3 * 4)
                            vtx_frames.append(data)
                        else:
                            vtx_frames.append(b"")
                    anim_nodes[node_index] = {
                        "pos": ("null", b""),
                        "quat": ("null", b""),
                        "vtx": vtx_frames,
                    }
                else:
                    pos_data = r.read_bytes(n_keyframes * 3 * 4)
                    quat_data = r.read_bytes(n_keyframes * 4 * 4)
                    anim_nodes[node_index] = {
                        "pos": ("pos", pos_data),
                        "quat": ("quat", quat_data),
                    }
            elif compression_type == 1:  # ANCMPRS_REL
                num_pos = r.read_u32()
                pos_kind = "null" if num_pos == 0 else ("single_pos" if num_pos == 1 else "pos")
                pos_data = r.read_bytes(num_pos * 3 * 4)
                num_quat = r.read_u32()
                quat_kind = "null" if num_quat == 0 else ("single_quat" if num_quat == 1 else "quat")
                quat_data = r.read_bytes(num_quat * 4 * 4)
                anim_nodes[node_index] = {
                    "pos": (pos_kind, pos_data, num_pos),
                    "quat": (quat_kind, quat_data, num_quat),
                }
            elif compression_type == 2:  # ANCMPRS_REL_16
                num_pos = r.read_u32()
                pos_kind = "null" if num_pos == 0 else ("single_pos16" if num_pos == 1 else "pos16")
                pos_data = r.read_bytes(num_pos * 3 * 2)
                num_quat = r.read_u32()
                quat_kind = "null" if num_quat == 0 else ("single_quat16" if num_quat == 1 else "quat16")
                quat_data = r.read_bytes(num_quat * 4 * 2)
                anim_nodes[node_index] = {
                    "pos": (pos_kind, pos_data, num_pos),
                    "quat": (quat_kind, quat_data, num_quat),
                }
            elif compression_type == 3:  # ANCMPRS_REL_16_ROT_ONLY
                num_pos = r.read_u32()
                pos_kind = "null" if num_pos == 0 else ("single_pos" if num_pos == 1 else "pos")
                pos_data = r.read_bytes(num_pos * 3 * 4)
                num_quat = r.read_u32()
                quat_kind = "null" if num_quat == 0 else ("single_quat16" if num_quat == 1 else "quat16")
                quat_data = r.read_bytes(num_quat * 4 * 2)
                anim_nodes[node_index] = {
                    "pos": (pos_kind, pos_data, num_pos),
                    "quat": (quat_kind, quat_data, num_quat),
                }
            else:
                raise ValueError("unknown compression type %d" % compression_type)

            for child_idx in children_map.get(node_index, []):
                load_anim_node(child_idx)

        load_anim_node(root_index)

        anims.append({
            "name": anim_name,
            "dims": dims,
            "compression": compression_type,
            "interpolation_ms": interpolation_ms,
            "keyframes": keyframes,
            "nodes": anim_nodes,
        })

    # Sockets
    sockets = []
    n_sockets = r.read_u32()
    for _ in range(n_sockets):
        node_idx = r.read_u32()
        sock_name = r.read_string()
        rot = (r.read_f32(), r.read_f32(), r.read_f32(), r.read_f32())
        pos = read_vector()
        scale = read_vector()
        sockets.append({
            "node": node_idx,
            "name": sock_name,
            "rot": rot,
            "pos": pos,
            "scale": scale,
        })

    # Anim bindings (skip, but parse)
    for _ in range(n_child_models):
        n_bind = r.read_u32()
        for _b in range(n_bind):
            _anim_name = r.read_string()
            _ = read_vector()
            _ = read_vector()

    return {
        "header": header,
        "file_version": file_version,
        "allocs": allocs,
        "command": command,
        "vis_radius": vis_radius,
        "pieces": pieces,
        "nodes_by_index": nodes_by_index,
        "children_map": children_map,
        "root_index": root_index,
        "weight_sets": weight_sets,
        "child_models": child_models,
        "anims": anims,
        "sockets": sockets,
    }


def decode_pos(kind, data, index):
    if kind == "null":
        return (0.0, 0.0, 0.0)
    if kind == "pos":
        ofs = index * 12
        return struct.unpack_from("<fff", data, ofs)
    if kind == "single_pos":
        return struct.unpack_from("<fff", data, 0)
    if kind == "pos16":
        ofs = index * 6
        x, y, z = struct.unpack_from("<hhh", data, ofs)
        return (x / 16.0, y / 16.0, z / 16.0)
    if kind == "single_pos16":
        x, y, z = struct.unpack_from("<hhh", data, 0)
        return (x / 16.0, y / 16.0, z / 16.0)
    return (0.0, 0.0, 0.0)


def decode_quat(kind, data, index):
    if kind == "null":
        return (0.0, 0.0, 0.0, 1.0)
    if kind == "quat":
        ofs = index * 16
        return struct.unpack_from("<ffff", data, ofs)
    if kind == "single_quat":
        return struct.unpack_from("<ffff", data, 0)
    if kind == "quat16":
        ofs = index * 8
        x, y, z, w = struct.unpack_from("<hhhh", data, ofs)
        inv = 1.0 / 32767.0
        return (x * inv, y * inv, z * inv, w * inv)
    if kind == "single_quat16":
        x, y, z, w = struct.unpack_from("<hhhh", data, 0)
        inv = 1.0 / 32767.0
        return (x * inv, y * inv, z * inv, w * inv)
    return (0.0, 0.0, 0.0, 1.0)


def safe_index(kind, data, idx):
    if kind in ("single_pos", "single_pos16", "single_quat", "single_quat16", "null"):
        return 0
    if kind == "pos":
        max_i = len(data) // 12 - 1
        return min(idx, max_i) if max_i >= 0 else 0
    if kind == "pos16":
        max_i = len(data) // 6 - 1
        return min(idx, max_i) if max_i >= 0 else 0
    if kind == "quat":
        max_i = len(data) // 16 - 1
        return min(idx, max_i) if max_i >= 0 else 0
    if kind == "quat16":
        max_i = len(data) // 8 - 1
        return min(idx, max_i) if max_i >= 0 else 0
    return idx


def build_mesh_primitives(model, lod_index=0, flip_v=False):
    primitives = []
    for piece in model["pieces"]:
        if lod_index >= len(piece["lods"]):
            continue
        lod = piece["lods"][lod_index]
        mesh = lod["mesh"]
        if "vert_count" not in mesh:
            continue
        vert_count = mesh["vert_count"]
        streams = mesh["streams"]
        positions, normals, uvs, weights, joints = merge_vertex_streams(streams, vert_count)
        indices = mesh.get("indices", [])

        # Build weights/joints depending on mesh type.
        if mesh["mesh_type"] == "rigid":
            # Single bone.
            bone = mesh.get("bone_effector", 0)
            joints = [[bone, 0, 0, 0] for _ in range(vert_count)]
            weights = [[1.0, 0.0, 0.0, 0.0] for _ in range(vert_count)]
        elif mesh["mesh_type"] == "skel_mp":
            # Use per-vertex indices/weights from stream.
            fixed_joints = []
            fixed_weights = []
            for i in range(vert_count):
                idxs = joints[i] if joints[i] is not None else [0, 0, 0, 0]
                w = weights[i] if weights[i] is not None else []
                if mesh["max_bones_vert"] == 2:
                    w1 = w[0] if len(w) > 0 else 0.0
                    w2 = max(0.0, 1.0 - w1)
                    fixed_weights.append([w1, w2, 0.0, 0.0])
                    fixed_joints.append([idxs[0], idxs[1], idxs[2], idxs[3]])
                elif mesh["max_bones_vert"] == 3:
                    w1 = w[0] if len(w) > 0 else 0.0
                    w2 = w[1] if len(w) > 1 else 0.0
                    w3 = max(0.0, 1.0 - (w1 + w2))
                    fixed_weights.append([w1, w2, w3, 0.0])
                    fixed_joints.append([idxs[0], idxs[1], idxs[2], idxs[3]])
                else:
                    w1 = w[0] if len(w) > 0 else 0.0
                    w2 = w[1] if len(w) > 1 else 0.0
                    w3 = w[2] if len(w) > 2 else 0.0
                    w4 = max(0.0, 1.0 - (w1 + w2 + w3))
                    fixed_weights.append([w1, w2, w3, w4])
                    fixed_joints.append([idxs[0], idxs[1], idxs[2], idxs[3]])
            joints = fixed_joints
            weights = fixed_weights
        elif mesh["mesh_type"] == "skel_rd":
            # Assign bone indices by bone set ranges.
            joints = [[0, 0, 0, 0] for _ in range(vert_count)]
            weights = [[0.0, 0.0, 0.0, 0.0] for _ in range(vert_count)]
            for bone_set in mesh.get("bone_sets", []):
                start = bone_set["first_vert"]
                count = bone_set["vert_count"]
                bones = bone_set["bones"]
                for v in range(start, min(start + count, vert_count)):
                    blend = streams[0]["weights"][v] if streams[0]["weights"][v] is not None else []
                    if mesh["max_bones_tri"] == 2:
                        w1 = blend[0] if len(blend) > 0 else 0.0
                        w2 = max(0.0, 1.0 - w1)
                        weights[v] = [w1, w2, 0.0, 0.0]
                    elif mesh["max_bones_tri"] == 3:
                        w1 = blend[0] if len(blend) > 0 else 0.0
                        w2 = blend[1] if len(blend) > 1 else 0.0
                        w3 = max(0.0, 1.0 - (w1 + w2))
                        weights[v] = [w1, w2, w3, 0.0]
                    elif mesh["max_bones_tri"] == 4:
                        w1 = blend[0] if len(blend) > 0 else 0.0
                        w2 = blend[1] if len(blend) > 1 else 0.0
                        w3 = blend[2] if len(blend) > 2 else 0.0
                        w4 = max(0.0, 1.0 - (w1 + w2 + w3))
                        weights[v] = [w1, w2, w3, w4]
                    joints[v] = bones[:]
        else:
            # VA mesh: no skin, treat as rigid to bone 0.
            joints = [[0, 0, 0, 0] for _ in range(vert_count)]
            weights = [[1.0, 0.0, 0.0, 0.0] for _ in range(vert_count)]

        if flip_v and uvs and uvs[0] is not None:
            uvs = [(u, 1.0 - v) if v is not None else (u, v) for (u, v) in uvs]

        primitives.append({
            "name": piece["name"],
            "positions": positions,
            "normals": normals,
            "uvs": uvs,
            "indices": indices,
            "joints": joints,
            "weights": weights,
            "tex_indices": lod.get("tex_indices", []),
            "n_textures": lod.get("n_textures", 0),
        })
    return primitives


class GltfBuilder:
    def __init__(self):
        self.bin = bytearray()
        self.buffer_views = []
        self.accessors = []
        self.meshes = []
        self.nodes = []
        self.skins = []
        self.animations = []
        self.materials = []
        self.images = []
        self.textures = []
        self.samplers = []
        self.scene_nodes = []

    def add_buffer_view(self, data_bytes, target=None):
        # Align to 4.
        pad = (-len(self.bin)) % 4
        if pad:
            self.bin.extend(b"\x00" * pad)
        offset = len(self.bin)
        self.bin.extend(data_bytes)
        view = {
            "buffer": 0,
            "byteOffset": offset,
            "byteLength": len(data_bytes),
        }
        if target is not None:
            view["target"] = target
        self.buffer_views.append(view)
        return len(self.buffer_views) - 1

    def add_accessor(self, view_idx, component_type, count, acc_type, min_vals=None, max_vals=None):
        acc = {
            "bufferView": view_idx,
            "componentType": component_type,
            "count": count,
            "type": acc_type,
        }
        if min_vals is not None:
            acc["min"] = min_vals
        if max_vals is not None:
            acc["max"] = max_vals
        self.accessors.append(acc)
        return len(self.accessors) - 1

    def build(self):
        gltf = {
            "asset": {"version": "2.0", "generator": "ltb_exporter.py"},
            "buffers": [{"byteLength": len(self.bin), "uri": "model.bin"}],
            "bufferViews": self.buffer_views,
            "accessors": self.accessors,
            "meshes": self.meshes,
            "nodes": self.nodes,
            "scenes": [{"nodes": self.scene_nodes}],
            "scene": 0,
        }
        if self.materials:
            gltf["materials"] = self.materials
        if self.images:
            gltf["images"] = self.images
        if self.textures:
            gltf["textures"] = self.textures
        if self.samplers:
            gltf["samplers"] = self.samplers
        if self.skins:
            gltf["skins"] = self.skins
        if self.animations:
            gltf["animations"] = self.animations
        return gltf


def pack_floats(values):
    return struct.pack("<%sf" % len(values), *values)


def pack_u16(values):
    return struct.pack("<%sH" % len(values), *values)


def pack_u32(values):
    return struct.pack("<%sI" % len(values), *values)


def map_textures_to_prims(primitives, textures):
    mapping = {}
    if not textures:
        return mapping
    for i, prim in enumerate(primitives):
        tex = None
        for idx in prim.get("tex_indices") or []:
            if isinstance(idx, int) and 0 <= idx < len(textures):
                tex = textures[idx]
                break
        if tex is None and i < len(textures):
            tex = textures[i]
        if tex:
            mapping[i] = tex
    return mapping


def export_gltf(model, out_dir, base_name, lod_index=0, include_anims=True, flip_v=False, textures=None):
    os.makedirs(out_dir, exist_ok=True)
    primitives = build_mesh_primitives(model, lod_index=lod_index, flip_v=flip_v)
    material_textures = map_textures_to_prims(primitives, textures)

    builder = GltfBuilder()
    image_index_by_uri = {}
    texture_index_by_uri = {}

    # Build skeleton nodes.
    nodes_by_index = model["nodes_by_index"]
    children_map = model["children_map"]
    max_index = max(nodes_by_index.keys()) if nodes_by_index else -1
    for i in range(max_index + 1):
        node = nodes_by_index.get(i)
        if node is None:
            builder.nodes.append({"name": "Node_%d" % i})
            continue
        local = node["from_parent"]
        t, q, s = mat_decompose_trs(local)
        gltf_node = {
            "name": node["name"],
            "translation": [t[0], t[1], t[2]],
            "rotation": [q[0], q[1], q[2], q[3]],
            "scale": [s[0], s[1], s[2]],
        }
        children = children_map.get(i, [])
        if children:
            gltf_node["children"] = children
        builder.nodes.append(gltf_node)

    # Skin with all joints.
    joint_indices = list(range(max_index + 1))
    inv_bind = []
    for i in joint_indices:
        node = nodes_by_index.get(i)
        if node is None:
            inv = mat_identity()
        else:
            inv = node["inv_global"]
        inv_bind.extend(mat_to_gltf_col_major(inv))
    inv_view = builder.add_buffer_view(pack_floats(inv_bind), None)
    inv_accessor = builder.add_accessor(inv_view, 5126, len(joint_indices), "MAT4")
    skin_index = len(builder.skins)
    builder.skins.append({
        "joints": joint_indices,
        "inverseBindMatrices": inv_accessor,
        "skeleton": model["root_index"],
    })

    # Mesh primitives.
    mesh_primitives = []
    for prim_index, prim in enumerate(primitives):
        positions = prim["positions"]
        normals = prim["normals"]
        uvs = prim["uvs"]
        indices = prim["indices"]
        joints = prim["joints"]
        weights = prim["weights"]
        if not indices:
            continue

        pos_flat = [c for v in positions for c in v]
        pos_view = builder.add_buffer_view(pack_floats(pos_flat), 34962)
        # min/max
        min_vals = [min(p[i] for p in positions) for i in range(3)]
        max_vals = [max(p[i] for p in positions) for i in range(3)]
        pos_accessor = builder.add_accessor(pos_view, 5126, len(positions), "VEC3", min_vals, max_vals)

        attrs = {"POSITION": pos_accessor}

        if normals and normals[0] is not None:
            norm_flat = [c for v in normals for c in v]
            norm_view = builder.add_buffer_view(pack_floats(norm_flat), 34962)
            norm_accessor = builder.add_accessor(norm_view, 5126, len(normals), "VEC3")
            attrs["NORMAL"] = norm_accessor

        if uvs and uvs[0] is not None:
            uv_flat = [c for v in uvs for c in v]
            uv_view = builder.add_buffer_view(pack_floats(uv_flat), 34962)
            uv_accessor = builder.add_accessor(uv_view, 5126, len(uvs), "VEC2")
            attrs["TEXCOORD_0"] = uv_accessor

        if joints and joints[0] is not None:
            joint_flat = [c for v in joints for c in v]
            joint_view = builder.add_buffer_view(pack_u16(joint_flat), 34962)
            joint_accessor = builder.add_accessor(joint_view, 5123, len(joints), "VEC4")
            attrs["JOINTS_0"] = joint_accessor

        if weights and weights[0] is not None:
            weight_flat = [c for v in weights for c in v]
            weight_view = builder.add_buffer_view(pack_floats(weight_flat), 34962)
            weight_accessor = builder.add_accessor(weight_view, 5126, len(weights), "VEC4")
            attrs["WEIGHTS_0"] = weight_accessor

        index_component = 5125 if max(indices) > 65535 else 5123
        if index_component == 5125:
            idx_view = builder.add_buffer_view(pack_u32(indices), 34963)
        else:
            idx_view = builder.add_buffer_view(pack_u16(indices), 34963)
        idx_accessor = builder.add_accessor(idx_view, index_component, len(indices), "SCALAR")

        mat_index = len(builder.materials)
        material = {"name": prim["name"]}
        tex_entry = material_textures.get(prim_index)
        if tex_entry:
            uri = tex_entry["file"]
            if uri not in image_index_by_uri:
                image_index_by_uri[uri] = len(builder.images)
                builder.images.append({"uri": uri})
            img_idx = image_index_by_uri[uri]
            if uri not in texture_index_by_uri:
                texture_index_by_uri[uri] = len(builder.textures)
                builder.textures.append({"source": img_idx})
            tex_idx = texture_index_by_uri[uri]
            material["pbrMetallicRoughness"] = {"baseColorTexture": {"index": tex_idx}}
        builder.materials.append(material)

        mesh_primitives.append({
            "attributes": attrs,
            "indices": idx_accessor,
            "material": mat_index,
        })

    mesh_index = len(builder.meshes)
    builder.meshes.append({"primitives": mesh_primitives})

    # Mesh node.
    mesh_node_index = len(builder.nodes)
    builder.nodes.append({
        "name": "ModelMesh",
        "mesh": mesh_index,
        "skin": skin_index,
    })

    # Scene nodes include root skeleton and mesh node.
    scene_nodes = [model["root_index"], mesh_node_index]
    builder.scene_nodes = scene_nodes

    # Animations.
    if include_anims and model["anims"]:
        for anim in model["anims"]:
            times = [kf["time"] / 1000.0 for kf in anim["keyframes"]]
            time_view = builder.add_buffer_view(pack_floats(times), None)
            time_accessor = builder.add_accessor(time_view, 5126, len(times), "SCALAR")

            samplers = []
            channels = []

            for node_idx in joint_indices:
                node_anim = anim["nodes"].get(node_idx)
                if node_anim is None:
                    continue
                # Position
                pos_kind = node_anim["pos"][0]
                pos_data = node_anim["pos"][1]
                pos_vals = []
                for i in range(len(times)):
                    pos = decode_pos(pos_kind, pos_data, safe_index(pos_kind, pos_data, i))
                    pos_vals.extend([pos[0], pos[1], pos[2]])
                pos_view = builder.add_buffer_view(pack_floats(pos_vals), None)
                pos_accessor = builder.add_accessor(pos_view, 5126, len(times), "VEC3")
                sampler_index = len(samplers)
                samplers.append({"input": time_accessor, "output": pos_accessor, "interpolation": "LINEAR"})
                channels.append({"sampler": sampler_index, "target": {"node": node_idx, "path": "translation"}})

                # Rotation
                quat_kind = node_anim["quat"][0]
                quat_data = node_anim["quat"][1]
                rot_vals = []
                for i in range(len(times)):
                    q = decode_quat(quat_kind, quat_data, safe_index(quat_kind, quat_data, i))
                    rot_vals.extend([q[0], q[1], q[2], q[3]])
                rot_view = builder.add_buffer_view(pack_floats(rot_vals), None)
                rot_accessor = builder.add_accessor(rot_view, 5126, len(times), "VEC4")
                sampler_index = len(samplers)
                samplers.append({"input": time_accessor, "output": rot_accessor, "interpolation": "LINEAR"})
                channels.append({"sampler": sampler_index, "target": {"node": node_idx, "path": "rotation"}})

            builder.animations.append({
                "name": anim["name"],
                "samplers": samplers,
                "channels": channels,
            })

    gltf = builder.build()
    gltf["buffers"][0]["uri"] = "%s.bin" % base_name
    gltf_path = os.path.join(out_dir, "%s.gltf" % base_name)
    bin_path = os.path.join(out_dir, "%s.bin" % base_name)
    with open(bin_path, "wb") as f:
        f.write(builder.bin)
    with open(gltf_path, "w", encoding="utf-8") as f:
        json.dump(gltf, f, indent=2)
    return gltf_path, bin_path


def export_obj(model, out_dir, base_name, lod_index=0, flip_v=False, textures=None):
    os.makedirs(out_dir, exist_ok=True)
    primitives = build_mesh_primitives(model, lod_index=lod_index, flip_v=flip_v)
    material_textures = map_textures_to_prims(primitives, textures)
    obj_path = os.path.join(out_dir, "%s.obj" % base_name)
    mtl_path = os.path.join(out_dir, "%s.mtl" % base_name)

    with open(mtl_path, "w", encoding="utf-8") as mtl:
        for prim_index, prim in enumerate(primitives):
            mtl.write("newmtl %s\n" % prim["name"])
            mtl.write("Kd 1.000000 1.000000 1.000000\n\n")
            tex_entry = material_textures.get(prim_index)
            if tex_entry:
                mtl.write("map_Kd %s\n\n" % tex_entry["file"])

    with open(obj_path, "w", encoding="utf-8") as obj:
        obj.write("mtllib %s.mtl\n" % base_name)
        v_offset = 1
        vt_offset = 1
        vn_offset = 1
        for prim in primitives:
            positions = prim["positions"]
            normals = prim["normals"]
            uvs = prim["uvs"]
            indices = prim["indices"]

            for v in positions:
                obj.write("v %f %f %f\n" % (v[0], v[1], v[2]))
            if uvs and uvs[0] is not None:
                for vt in uvs:
                    obj.write("vt %f %f\n" % (vt[0], vt[1]))
            if normals and normals[0] is not None:
                for vn in normals:
                    obj.write("vn %f %f %f\n" % (vn[0], vn[1], vn[2]))

            obj.write("usemtl %s\n" % prim["name"])
            for i in range(0, len(indices), 3):
                a = indices[i] + v_offset
                b = indices[i + 1] + v_offset
                c = indices[i + 2] + v_offset
                if uvs and uvs[0] is not None and normals and normals[0] is not None:
                    obj.write("f %d/%d/%d %d/%d/%d %d/%d/%d\n" % (
                        a, indices[i] + vt_offset, indices[i] + vn_offset,
                        b, indices[i + 1] + vt_offset, indices[i + 1] + vn_offset,
                        c, indices[i + 2] + vt_offset, indices[i + 2] + vn_offset))
                elif uvs and uvs[0] is not None:
                    obj.write("f %d/%d %d/%d %d/%d\n" % (
                        a, indices[i] + vt_offset,
                        b, indices[i + 1] + vt_offset,
                        c, indices[i + 2] + vt_offset))
                elif normals and normals[0] is not None:
                    obj.write("f %d//%d %d//%d %d//%d\n" % (
                        a, indices[i] + vn_offset,
                        b, indices[i + 1] + vn_offset,
                        c, indices[i + 2] + vn_offset))
                else:
                    obj.write("f %d %d %d\n" % (a, b, c))

            v_offset += len(positions)
            if uvs and uvs[0] is not None:
                vt_offset += len(uvs)
            if normals and normals[0] is not None:
                vn_offset += len(normals)

    return obj_path, mtl_path


def main():
    ap = argparse.ArgumentParser(description="LTB model exporter (OBJ + glTF).")
    ap.add_argument("--ltb", required=True, help="Input LTB file")
    ap.add_argument("--out", required=True, help="Output directory")
    ap.add_argument("--lod", type=int, default=0, help="LOD index (default 0)")
    ap.add_argument("--no-anims", action="store_true", help="Skip animations")
    ap.add_argument("--gltf", action="store_true", help="Export glTF/bin in addition to OBJ/MTL")
    ap.add_argument("--resources-root", default=None, help="Resources root (defaults to Client/Client_FoM/Resources)")
    ap.add_argument("--textures", action="append", default=[], help="Manual texture paths (.dtx/.png). Repeatable.")
    args = ap.parse_args()

    model = parse_model(args.ltb)
    base_name = os.path.splitext(os.path.basename(args.ltb))[0]
    flip_v = True
    textures = resolve_textures(args.ltb, args.out, args.resources_root, args.textures)
    export_obj(model, args.out, base_name, lod_index=args.lod, flip_v=flip_v, textures=textures)
    if args.gltf:
        export_gltf(model, args.out, base_name, lod_index=args.lod,
                    include_anims=(not args.no_anims), flip_v=flip_v, textures=textures)
        print("Wrote OBJ+MTL and glTF to %s" % args.out)
    else:
        print("Wrote OBJ+MTL to %s" % args.out)


if __name__ == "__main__":
    main()
