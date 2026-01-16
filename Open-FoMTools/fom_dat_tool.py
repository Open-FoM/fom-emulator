#!/usr/bin/env python3
import argparse
import json
import math
import os
import shutil
import struct
import sys
from dataclasses import dataclass, field


DAT_VERSION_JUPITER = 85
PLATFORM = "PC"


@dataclass
class Vector2:
    x: float
    y: float


@dataclass
class Vector3:
    x: float
    y: float
    z: float


@dataclass
class Quat:
    w: float
    x: float
    y: float
    z: float

    def to_euler(self):
        # Approximate Godot Quat.get_euler() in XYZ order (radians).
        sinr_cosp = 2.0 * (self.w * self.x + self.y * self.z)
        cosr_cosp = 1.0 - 2.0 * (self.x * self.x + self.y * self.y)
        roll = math.atan2(sinr_cosp, cosr_cosp)

        sinp = 2.0 * (self.w * self.y - self.z * self.x)
        if abs(sinp) >= 1.0:
            pitch = math.copysign(math.pi / 2.0, sinp)
        else:
            pitch = math.asin(sinp)

        siny_cosp = 2.0 * (self.w * self.z + self.x * self.y)
        cosy_cosp = 1.0 - 2.0 * (self.y * self.y + self.z * self.z)
        yaw = math.atan2(siny_cosp, cosy_cosp)
        return Vector3(roll, pitch, yaw)


def vec3_add(a: Vector3, b: Vector3) -> Vector3:
    return Vector3(a.x + b.x, a.y + b.y, a.z + b.z)


def vec3_sub(a: Vector3, b: Vector3) -> Vector3:
    return Vector3(a.x - b.x, a.y - b.y, a.z - b.z)


def vec3_mul(a: Vector3, s: float) -> Vector3:
    return Vector3(a.x * s, a.y * s, a.z * s)


def vec3_dot(a: Vector3, b: Vector3) -> float:
    return (a.x * b.x) + (a.y * b.y) + (a.z * b.z)


class BinaryReader:
    def __init__(self, f):
        self.f = f
        self.length = os.fstat(f.fileno()).st_size

    def tell(self):
        return self.f.tell()

    def seek(self, offset, whence=os.SEEK_SET):
        self.f.seek(offset, whence)

    def read(self, size):
        data = self.f.read(size)
        if len(data) != size:
            raise EOFError("Unexpected EOF")
        return data

    def skip(self, size):
        if size <= 0:
            return
        self.f.seek(size, os.SEEK_CUR)

    def u8(self):
        return struct.unpack("<B", self.read(1))[0]

    def u16(self):
        return struct.unpack("<H", self.read(2))[0]

    def u32(self):
        return struct.unpack("<I", self.read(4))[0]

    def f32(self):
        return struct.unpack("<f", self.read(4))[0]

    def read_string(self, short_len=True):
        length = self.u16() if short_len else self.u32()
        if length == 0:
            return ""
        data = self.read(length)
        return data.rstrip(b"\x00").decode("ascii", errors="ignore")

    def read_cstring(self):
        data = bytearray()
        while True:
            b = self.read(1)
            if b == b"\x00":
                break
            data.extend(b)
        return bytes(data).decode("ascii", errors="ignore")

    def vec2(self):
        return Vector2(self.f32(), self.f32())

    def vec3(self):
        return Vector3(self.f32(), self.f32(), self.f32())

    def quat(self):
        w = self.f32()
        x = self.f32()
        y = self.f32()
        z = self.f32()
        return Quat(w=w, x=x, y=y, z=z)

    def peek_u32_at(self, pos):
        cur = self.tell()
        self.seek(pos)
        val = self.u32()
        self.seek(cur)
        return val


@dataclass
class WorldInfo:
    properties: str = ""
    light_map_grid_size: float = 0.0
    extents_min: Vector3 = None
    extents_max: Vector3 = None
    world_offset: Vector3 = None

    def read(self, dat, r: BinaryReader):
        self.properties = r.read_string(short_len=False)
        if dat.is_lithtech_1():
            r.skip(8 * 4)
            return
        if not dat.is_lithtech_jupiter():
            self.light_map_grid_size = r.f32()
        self.extents_min = r.vec3()
        self.extents_max = r.vec3()
        if dat.is_lithtech_jupiter():
            self.world_offset = r.vec3()

@dataclass
class WorldTreeNode:
    box_min: Vector3 = None
    box_max: Vector3 = None
    child_node_count: int = 0
    dummy_terrain_depth: int = 0
    child_nodes: list = field(default_factory=list)

    def set_bounding_box(self, min_vec, max_vec):
        self.box_min = min_vec
        self.box_max = max_vec

    def subdivide(self):
        for _ in range(4):
            node = WorldTreeNode()
            node.set_bounding_box(self.box_min, self.box_max)
            self.child_nodes.append(node)

    def read_layout(self, r: BinaryReader, current_byte, current_bit):
        if current_bit == 8:
            current_byte = r.u8()
            current_bit = 0

        subdivide = (current_byte & (1 << current_bit)) != 0
        current_bit += 1

        if subdivide:
            self.subdivide()
            for node in self.child_nodes:
                current_byte, current_bit = node.read_layout(r, current_byte, current_bit)

        return current_byte, current_bit

    def read(self, dat, r: BinaryReader):
        self.box_min = r.vec3()
        self.box_max = r.vec3()
        self.child_node_count = r.u32()
        self.dummy_terrain_depth = r.u32()
        self.set_bounding_box(self.box_min, self.box_max)
        self.read_layout(r, 0, 8)


@dataclass
class WorldTree:
    root_node: WorldTreeNode = None

    def read(self, dat, r: BinaryReader):
        node = WorldTreeNode()
        node.read(dat, r)
        self.root_node = node


@dataclass
class WorldTexture:
    name: str = ""

    def read(self, dat, r: BinaryReader):
        self.name = r.read_cstring()


@dataclass
class WorldPlane:
    normal: Vector3 = None
    distance: float = 0.0

    def read(self, dat, r: BinaryReader):
        self.normal = r.vec3()
        self.distance = r.f32()


@dataclass
class WorldLeafData:
    portal_id: int = 0
    size: int = 0
    contents: bytes = b""

    def read(self, dat, r: BinaryReader):
        self.portal_id = r.u16()
        self.size = r.u16()
        self.contents = r.read(self.size)


@dataclass
class WorldLeaf:
    count: int = 0
    index: int = -1
    data: list = field(default_factory=list)

    def read(self, dat, r: BinaryReader):
        self.count = r.u16()
        if self.count == 0xFFFF:
            self.index = r.u16()
        else:
            for _ in range(self.count):
                leaf_data = WorldLeafData()
                leaf_data.read(dat, r)
                self.data.append(leaf_data)
        if dat.is_lithtech_jupiter():
            return


@dataclass
class WorldSurface:
    uv1: Vector3 = field(default_factory=lambda: Vector3(0.0, 0.0, 0.0))
    uv2: Vector3 = field(default_factory=lambda: Vector3(0.0, 0.0, 0.0))
    uv3: Vector3 = field(default_factory=lambda: Vector3(0.0, 0.0, 0.0))
    texture_flags: int = 0
    texture_index: int = 0
    flags: int = 0

    def read(self, dat, r: BinaryReader):
        if dat.is_lithtech_jupiter():
            self.flags = r.u32()
            self.texture_index = r.u16()
            self.texture_flags = r.u16()
            return
        raise ValueError("Only Jupiter surface parsing is supported.")


@dataclass
class DiskVert:
    vertex_index: int = 0

    def read(self, dat, r: BinaryReader):
        if dat.is_lithtech_jupiter():
            self.vertex_index = r.u32()
            return
        raise ValueError("Only Jupiter disk verts are supported.")


@dataclass
class WorldPoly:
    surface_index: int = 0
    plane_index: int = 0
    disk_verts: list = field(default_factory=list)

    def read(self, dat, r: BinaryReader, vert_count: int):
        if dat.is_lithtech_jupiter():
            self.surface_index = r.u32()
            self.plane_index = r.u32()
            for _ in range(vert_count):
                dv = DiskVert()
                dv.read(dat, r)
                self.disk_verts.append(dv)
            return
        raise ValueError("Only Jupiter polys are supported.")


@dataclass
class WorldNode:
    poly_index: int = 0
    leaf_index: int = 0
    index: int = 0
    index_2: int = 0

    def read(self, dat, r: BinaryReader, node_count: int):
        if dat.is_lithtech_1():
            r.u32()
        self.poly_index = r.u32()
        self.leaf_index = r.u16()
        self.index = r.u32()
        self.index_2 = r.u32()


@dataclass
class WorldUserPortal:
    name: str = ""
    unk_int_1: int = 0
    unk_int_2: int = 0
    unk_short: int = 0
    center: Vector3 = None
    dims: Vector3 = None

    def read(self, dat, r: BinaryReader):
        self.name = r.read_string()
        self.unk_int_1 = r.u32()
        if not dat.is_lithtech_1():
            self.unk_int_2 = r.u32()
        self.unk_short = r.u16()
        self.center = r.vec3()
        self.dims = r.vec3()


@dataclass
class WorldBSP:
    world_info_flags: int = 0
    world_name: str = ""
    point_count: int = 0
    plane_count: int = 0
    surface_count: int = 0
    user_portal_count: int = 0
    poly_count: int = 0
    leaf_count: int = 0
    vert_count: int = 0
    total_vis_list_size: int = 0
    leaf_list_count: int = 0
    node_count: int = 0
    section_count: int = 0
    min_box: Vector3 = None
    max_box: Vector3 = None
    world_translation: Vector3 = None
    name_length: int = 0
    texture_count: int = 0
    texture_names: list = field(default_factory=list)
    verts: list = field(default_factory=list)
    points: list = field(default_factory=list)
    polies: list = field(default_factory=list)
    planes: list = field(default_factory=list)
    surfaces: list = field(default_factory=list)
    leafs: list = field(default_factory=list)
    nodes: list = field(default_factory=list)
    user_portals: list = field(default_factory=list)
    root_node_index: int = 0

    def read(self, dat, r: BinaryReader):
        self.world_info_flags = r.u32()

        self.world_name = r.read_string()

        self.point_count = r.u32()
        self.plane_count = r.u32()
        self.surface_count = r.u32()
        self.user_portal_count = r.u32()
        self.poly_count = r.u32()
        self.leaf_count = r.u32()
        self.vert_count = r.u32()
        self.total_vis_list_size = r.u32()
        self.leaf_list_count = r.u32()
        self.node_count = r.u32()

        self.min_box = r.vec3()
        self.max_box = r.vec3()
        self.world_translation = r.vec3()

        self.name_length = r.u32()
        self.texture_count = r.u32()

        for _ in range(self.texture_count):
            tex = WorldTexture()
            tex.read(dat, r)
            self.texture_names.append(tex)

        for _ in range(self.poly_count):
            vert = r.u8()
            self.verts.append(vert)

        for _ in range(self.leaf_count):
            leaf = WorldLeaf()
            leaf.read(dat, r)
            self.leafs.append(leaf)

        for _ in range(self.plane_count):
            plane = WorldPlane()
            plane.read(dat, r)
            self.planes.append(plane)

        for _ in range(self.surface_count):
            surface = WorldSurface()
            surface.read(dat, r)
            self.surfaces.append(surface)

        for i in range(self.poly_count):
            poly = WorldPoly()
            poly.read(dat, r, self.verts[i])
            self.polies.append(poly)

        for _ in range(self.node_count):
            node = WorldNode()
            node.read(dat, r, self.node_count)
            self.nodes.append(node)

        for _ in range(self.user_portal_count):
            portal = WorldUserPortal()
            portal.read(dat, r)
            self.user_portals.append(portal)

        for _ in range(self.point_count):
            self.points.append(r.vec3())

        self.root_node_index = r.u32()

        dat.current_world_model_index += 1
        dat.current_poly_index = 0

        self.section_count = r.u32()

class ObjectProperty:
    PROP_STRING = 0
    PROP_VECTOR = 1
    PROP_COLOUR = 2
    PROP_FLOAT = 3
    PROP_FLAGS = 4
    PROP_BOOL = 5
    PROP_LONG_INT = 6
    PROP_ROTATION = 7
    PROP_UNK_INT = 9

    def __init__(self):
        self.name = ""
        self.code = 0
        self.data_length = 0
        self.flags = 0
        self.value = None

    def read(self, dat, r: BinaryReader):
        self.name = r.read_string()
        self.code = r.u8()
        self.flags = r.u32()
        self.data_length = r.u16()

        if self.code == self.PROP_STRING:
            self.value = r.read_string()
        elif self.code == self.PROP_VECTOR or self.code == self.PROP_COLOUR:
            self.value = r.vec3()
        elif self.code == self.PROP_FLOAT:
            self.value = r.f32()
        elif self.code == self.PROP_BOOL:
            self.value = r.u8()
        elif self.code in (self.PROP_FLAGS, self.PROP_LONG_INT, self.PROP_UNK_INT):
            self.value = r.u32()
        elif self.code == self.PROP_ROTATION:
            self.value = r.quat()
        else:
            r.skip(self.data_length)

    def get_lta_property_data(self):
        if self.code == self.PROP_STRING:
            return ["string", self.name, self.value]
        if self.code == self.PROP_VECTOR:
            return ["vector", self.name, "___vector", self.value]
        if self.code == self.PROP_COLOUR:
            return ["color", self.name, "___vector", self.value]
        if self.code == self.PROP_FLOAT:
            return ["real", self.name, self.value]
        if self.code == self.PROP_BOOL:
            return ["bool", self.name, int(self.value)]
        if self.code == self.PROP_FLAGS:
            return None
        if self.code == self.PROP_LONG_INT:
            return ["longint", self.name, self.value]
        if self.code == self.PROP_ROTATION and isinstance(self.value, Quat):
            return ["rotation", self.name, "___eulerangles", self.value.to_euler()]
        return None


class WorldObject:
    def __init__(self):
        self.data_length = 0
        self.name = ""
        self.property_count = 0
        self.properties = []

    def read(self, dat, r: BinaryReader):
        self.data_length = r.u16()
        self.name = r.read_string()
        self.property_count = r.u32()
        for _ in range(self.property_count):
            prop = ObjectProperty()
            prop.read(dat, r)
            self.properties.append(prop)


class WorldObjectHeader:
    def __init__(self):
        self.count = 0
        self.world_objects = []

    def read(self, dat, r: BinaryReader):
        self.count = r.u32()
        for _ in range(self.count):
            obj = WorldObject()
            obj.read(dat, r)
            self.world_objects.append(obj)


class RenderData:
    def __init__(self):
        self.render_block_count = 0
        self.textures = set()
        self.poly_uvs = {}

    def read(self, dat, r: BinaryReader):
        self.render_block_count = r.u32()
        for _ in range(self.render_block_count):
            self._read_block(dat, r)

    def _read_block(self, dat, r: BinaryReader):
        r.vec3()
        r.vec3()

        section_count = r.u32()
        for _ in range(section_count):
            tex0 = r.read_string()
            tex1 = r.read_string()
            if tex0:
                self.textures.add(tex0)
            if tex1:
                self.textures.add(tex1)
            r.u8()
            r.u32()
            r.read_string()
            r.u32()
            r.u32()
            lm_size = r.u32()
            r.skip(lm_size)

        vertex_count = r.u32()
        vertices = []
        vert_stride = self._detect_vertex_stride(r, vertex_count)
        for _ in range(vertex_count):
            pos = r.vec3()
            uv1 = r.vec2()
            r.vec2()
            r.u32()
            r.vec3()
            if vert_stride > 44:
                r.skip(vert_stride - 44)
            vertices.append((pos, uv1))

        triangle_count = r.u32()
        for _ in range(triangle_count):
            i0 = r.u32()
            i1 = r.u32()
            i2 = r.u32()
            poly_index = r.u32()

            if poly_index in self.poly_uvs:
                continue
            if i0 >= len(vertices) or i1 >= len(vertices) or i2 >= len(vertices):
                continue

            p0, uv0 = vertices[i0]
            p1, uv1 = vertices[i1]
            p2, uv2 = vertices[i2]

            du1 = uv1.x - uv0.x
            dv1 = uv1.y - uv0.y
            du2 = uv2.x - uv0.x
            dv2 = uv2.y - uv0.y
            det = (du1 * dv2) - (du2 * dv1)
            if abs(det) < 1e-8:
                continue

            rcp = 1.0 / det
            e1 = vec3_sub(p1, p0)
            e2 = vec3_sub(p2, p0)

            u_vec = vec3_mul(vec3_sub(vec3_mul(e1, dv2), vec3_mul(e2, dv1)), rcp)
            v_vec = vec3_mul(vec3_sub(vec3_mul(e2, du1), vec3_mul(e1, du2)), rcp)

            u_off = uv0.x - vec3_dot(p0, u_vec)
            v_off = uv0.y - vec3_dot(p0, v_vec)
            uv3 = Vector3(u_off, v_off, 0.0)

            self.poly_uvs[poly_index] = (u_vec, v_vec, uv3)

        sky_portal_count = r.u32()
        for _ in range(sky_portal_count):
            vert_count = r.u8()
            r.skip(vert_count * 12)
            r.skip(12)
            r.skip(4)

        occulder_count = r.u32()
        for _ in range(occulder_count):
            vert_count = r.u8()
            r.skip(vert_count * 12)
            r.skip(12)
            r.skip(4)
            r.skip(4)

        light_group_count = r.u32()
        for _ in range(light_group_count):
            length = r.u16()
            r.skip(length)
            r.skip(12)
            data_length = r.u32()
            r.skip(data_length)
            section_lm_size = r.u32()
            for _ in range(section_lm_size):
                sub_count = r.u32()
                for _ in range(sub_count):
                    r.skip(4 * 4)
                    sub_data_size = r.u32()
                    r.skip(sub_data_size)

        r.u8()
        r.u32()
        r.u32()

    def _detect_vertex_stride(self, r: BinaryReader, vertex_count: int) -> int:
        if vertex_count == 0:
            return 44
        start = r.tell()
        candidates = [44, 68]
        for stride in candidates:
            pos = start + (vertex_count * stride)
            if pos + 4 > r.length:
                continue
            tri_count = r.peek_u32_at(pos)
            if tri_count == 0 or tri_count > 10_000_000:
                continue
            if pos + 4 + (tri_count * 16) > r.length:
                continue
            return stride
        return 44


class DatFile:
    def __init__(self):
        self.version = 0
        self.object_data_pos = 0
        self.render_data_pos = 0
        self.blind_object_data_pos = 0
        self.light_grid_pos = 0
        self.collision_data_pos = 0
        self.particle_blocker_data_pos = 0
        self.world_info = None
        self.world_tree = None
        self.world_model_count = 0
        self.world_models = []
        self.world_object_data = None
        self.render_data = None
        self.current_poly_index = 0
        self.current_world_model_index = 0

    def is_lithtech_1(self):
        return False

    def is_lithtech_jupiter(self):
        return self.version == DAT_VERSION_JUPITER

    def read(self, path, parse_render=True):
        with open(path, "rb") as f:
            r = BinaryReader(f)
            self.version = r.u32()
            if not self.is_lithtech_jupiter():
                raise ValueError(f"Unsupported DAT version: {self.version}")

            self.object_data_pos = r.u32()
            self.blind_object_data_pos = r.u32()
            self.light_grid_pos = r.u32()
            self.collision_data_pos = r.u32()
            self.particle_blocker_data_pos = r.u32()
            self.render_data_pos = r.u32()

            r.skip(8 * 4)

            self.world_info = WorldInfo()
            self.world_info.read(self, r)

            self.world_tree = WorldTree()
            self.world_tree.read(self, r)

            world_model_pos = r.tell()

            if parse_render:
                r.seek(self.render_data_pos)
                self.render_data = RenderData()
                try:
                    self.render_data.read(self, r)
                except EOFError:
                    print("WARN: Render data parse hit EOF; using partial UVs.")

            r.seek(self.object_data_pos)
            self.world_object_data = WorldObjectHeader()
            self.world_object_data.read(self, r)

            r.seek(world_model_pos)
            self.world_model_count = r.u32()
            self.world_model_batch_read(r, self.world_model_count)

    def world_model_batch_read(self, r: BinaryReader, amount_to_read):
        for _ in range(amount_to_read):
            next_world_model_pos = r.u32()
            world_bsp = WorldBSP()
            world_bsp.read(self, r)
            if world_bsp.section_count > 0:
                r.seek(next_world_model_pos)
            self.world_models.append(world_bsp)

class LTANode:
    def __init__(self, name="unnamed-node", attribute=None):
        self._name = name
        self._attribute = attribute
        self._depth = 0
        self._children = []

    def create_property(self, value=""):
        return self.create_child("", value)

    def create_container(self):
        return self.create_child("", None)

    def create_child(self, name, attribute=None):
        node = LTANode(name, attribute)
        node._depth = self._depth + 1
        self._children.append(node)
        return node

    def create_prop_entry(self, prop_type, name, data):
        item = self.create_child(prop_type, name)
        item.create_container()
        return item.create_child("data", data)

    def serialize(self):
        output = []
        output.append(self._write_depth())
        output.append(f"({self._name} ")
        if self._attribute is not None:
            output.append(self._resolve_type(self._attribute))
        if len(self._children) == 0:
            output.append(")\n")
            return "".join(output)
        output.append("\n")
        for child in self._children:
            output.append(child.serialize())
        output.append(self._write_depth())
        output.append(")\n")
        return "".join(output)

    def _write_depth(self):
        return "\t" * self._depth

    def _resolve_type(self, value):
        if isinstance(value, str):
            return self._serialize_string(value)
        if isinstance(value, float):
            return self._serialize_float(value)
        if isinstance(value, int):
            return str(value)
        if isinstance(value, Vector3):
            return self._serialize_vector(value)
        if isinstance(value, Quat):
            return self._serialize_quat(value)
        if isinstance(value, list) or isinstance(value, tuple):
            return self._serialize_list(value)
        return str(value)

    def _serialize_string(self, value):
        if value.startswith("___"):
            return value[3:]
        return f"\"{value}\""

    def _serialize_float(self, value):
        return f"{value:.6f}"

    def _serialize_vector(self, value: Vector3):
        return f"{value.x:.6f} {value.y:.6f} {value.z:.6f}"

    def _serialize_quat(self, value: Quat):
        return f"{value.x:.6f} {value.y:.6f} {value.z:.6f} {value.w:.6f}"

    def _serialize_list(self, value):
        return " ".join(self._resolve_type(item) for item in value)


class LTAWriter:
    def write(self, model: DatFile, path: str):
        root_node = LTANode("world")

        world_header = root_node.create_child("header")
        world_header_list = world_header.create_container()
        world_header_list.create_child("versioncode", 2)
        world_header_list.create_child("infostring", model.world_info.properties)

        polyhedron_list_node = root_node.create_child("polyhedronlist")
        polyhedron_list = polyhedron_list_node.create_container()

        node_hierarchy = root_node.create_child("nodehierarchy")
        world_node = node_hierarchy.create_child("worldnode")
        world_node.create_child("type", "___null")
        world_node.create_child("label", "WorldRoot")
        world_node.create_child("nodeid", 1)
        world_node.create_child("flags").create_property("___worldroot expanded")
        world_node.create_child("properties").create_child("propid", 0)
        child_list = world_node.create_child("childlist").create_container()

        global_prop_list = root_node.create_child("globalproplist")
        global_prop_container = global_prop_list.create_container()
        global_prop_container.create_child("proplist").create_container()

        root_node.create_child("navigatorposlist").create_container()

        running_node_id = 2
        running_prop_id = 1
        running_brush_id = 0

        object_nodes = {}

        if model.world_object_data is not None:
            for world_object in model.world_object_data.world_objects:
                label = f"{world_object.name}_Group"
                for prop in world_object.properties:
                    data = prop.get_lta_property_data()
                    if not data:
                        continue
                    if data[1] == "Name":
                        label = data[2]
                        break

                header_node = child_list.create_child("worldnode")
                header_node.create_child("type", "___null")
                header_node.create_child("label", label)
                header_node.create_child("nodeid", running_node_id)
                header_node.create_child("flags").create_container()
                header_node.create_child("properties").create_child("propid", 0)
                object_children = header_node.create_child("childlist").create_container()

                running_node_id += 1

                obj_node = object_children.create_child("worldnode")
                obj_node.create_child("type", "___object")
                obj_node.create_child("nodeid", running_node_id)
                obj_node.create_child("flags").create_container()
                node_props = obj_node.create_child("properties")
                node_props.create_child("name", world_object.name)
                node_props.create_child("propid", running_prop_id)

                object_nodes[label] = obj_node.create_child("childlist").create_container()

                prop_list = global_prop_container.create_child("proplist").create_container()
                for prop in world_object.properties:
                    data = prop.get_lta_property_data()
                    if data is None:
                        continue
                    if len(data) == 3:
                        prop_list.create_prop_entry(data[0], data[1], data[2])
                    else:
                        prop_list.create_prop_entry(data[0], data[1], None).create_property(data[2]).create_property(data[3])

                running_prop_id += 1
                running_node_id += 1

        render_uv_target_index = None
        if model.render_data:
            for idx, wm in enumerate(model.world_models):
                if wm.world_name != "VisBSP":
                    render_uv_target_index = idx
                    break

        for world_model_index, world_model in enumerate(model.world_models):
            if world_model.world_name == "VisBSP":
                continue

            if world_model.world_name in object_nodes:
                wm_child_list = object_nodes[world_model.world_name]
            else:
                wm_node = child_list.create_child("worldnode")
                wm_node.create_child("type", "___null")
                wm_node.create_child("label", world_model.world_name)
                wm_node.create_child("nodeid", running_node_id)
                wm_node.create_child("flags").create_container()
                wm_node.create_child("properties").create_child("propid", 0)
                wm_child_list = wm_node.create_child("childlist").create_container()

            running_node_id += 1

            created_brush_node = False
            allow_multi_edit_polies = world_model.world_name != "PhysicsBSP"

            running_face_index = 0
            polyhedron = polyhedron_list.create_child("polyhedron")
            polyhedron_container = polyhedron.create_container()
            polyhedron_container.create_child("color", [255, 255, 255])
            point_list = polyhedron_container.create_child("pointlist")
            poly_list = polyhedron_container.create_child("polylist")
            poly_list_container = poly_list.create_container()

            saved_poly_points = []
            first_run = True

            for poly_index, poly in enumerate(world_model.polies):
                if not first_run and not allow_multi_edit_polies:
                    created_brush_node = False
                    running_face_index = 0
                    saved_poly_points = []
                    polyhedron = polyhedron_list.create_child("polyhedron")
                    polyhedron_container = polyhedron.create_container()
                    polyhedron_container.create_child("color", [255, 255, 255])
                    point_list = polyhedron_container.create_child("pointlist")
                    poly_list = polyhedron_container.create_child("polylist")
                    poly_list_container = poly_list.create_container()

                first_run = False

                if poly.plane_index >= len(world_model.planes):
                    continue
                if poly.surface_index >= len(world_model.surfaces):
                    continue
                plane = world_model.planes[poly.plane_index]
                surface = world_model.surfaces[poly.surface_index]

                face_indexes = []
                for vert in poly.disk_verts:
                    if vert.vertex_index >= len(world_model.points):
                        continue
                    points = world_model.points[vert.vertex_index]
                    try:
                        search = saved_poly_points.index(points)
                    except ValueError:
                        search = -1
                    if search != -1:
                        face_indexes.append(search)
                        continue

                    face_indexes.append(running_face_index)
                    point_list.create_property([points.x, points.y, points.z, 255, 255, 255, 255])
                    saved_poly_points.append(points)
                    running_face_index += 1

                edit_poly = poly_list_container.create_child("editpoly")
                edit_poly.create_child("f", face_indexes)
                edit_poly.create_child("n", plane.normal)
                edit_poly.create_child("dist", plane.distance)

                texture_index = surface.texture_index
                texture_name = "Default"
                if 0 <= texture_index < len(world_model.texture_names):
                    texture_name = world_model.texture_names[texture_index].name

                uv1 = surface.uv1
                uv2 = surface.uv2
                uv3 = surface.uv3
                if (
                    model.render_data
                    and render_uv_target_index == world_model_index
                    and poly_index in model.render_data.poly_uvs
                ):
                    uv1, uv2, uv3 = model.render_data.poly_uvs[poly_index]

                texture_info_node = edit_poly.create_child("textureinfo")
                texture_info_node.create_property(uv1)
                texture_info_node.create_property(uv2)
                texture_info_node.create_property(uv3)
                texture_info_node.create_child("sticktopoly", 1)
                texture_info_node.create_child("name", texture_name)

                edit_poly.create_child("flags")
                edit_poly.create_child("shade", [0, 0, 0])
                edit_poly.create_child("physicsmaterial", "Default")
                edit_poly.create_child("surfacekey", "")
                edit_poly.create_child("textures").create_container()

                if created_brush_node:
                    continue

                p_node = wm_child_list.create_child("worldnode")
                p_node.create_child("type", "___brush")
                p_node.create_child("brushindex", running_brush_id)
                p_node.create_child("nodeid", running_node_id)
                p_node.create_child("flags").create_container()
                p_props = p_node.create_child("properties")
                p_props.create_child("name", "Brush")
                p_props.create_child("propid", running_prop_id)

                prop_list = global_prop_container.create_child("proplist").create_container()
                prop_list.create_prop_entry("string", "Name", f"Brush_{world_model.world_name}_{running_prop_id}")
                prop_list.create_prop_entry("vector", "Pos", None).create_property("vector").create_property(Vector3(0, 0, 0))
                prop_list.create_prop_entry("rotation", "Rotation", None).create_property("eulerangles").create_property(Vector3(0, 0, 0))

                prop_list.create_prop_entry("bool", "Solid", int(surface.flags & (1 << 0) != 0))
                prop_list.create_prop_entry("bool", "Nonexistant", int(surface.flags & (1 << 1) != 0))
                prop_list.create_prop_entry("bool", "Invisible", int(surface.flags & (1 << 2) != 0))
                prop_list.create_prop_entry("bool", "Translucent", int(surface.flags & (1 << 3) != 0))
                prop_list.create_prop_entry("bool", "SkyPortal", int(surface.flags & (1 << 4) != 0))
                prop_list.create_prop_entry("bool", "FullyBright", int(surface.flags & (1 << 5) != 0))
                prop_list.create_prop_entry("bool", "FlatShade", int(surface.flags & (1 << 6) != 0))
                prop_list.create_prop_entry("bool", "GouraudShade", int(surface.flags & (1 << 12) != 0))
                prop_list.create_prop_entry("bool", "LightMap", int(surface.flags & (1 << 7) != 0))
                prop_list.create_prop_entry("bool", "Subdivide", int(surface.flags & (1 << 8) == 0))
                prop_list.create_prop_entry("bool", "HullMaker", int(surface.flags & (1 << 9) != 0))
                prop_list.create_prop_entry("bool", "AlwaysLightMap", int(surface.flags & (1 << 10) != 0))
                prop_list.create_prop_entry("bool", "DirectionalLight", int(surface.flags & (1 << 11) != 0))
                prop_list.create_prop_entry("bool", "Portal", int(surface.flags & (1 << 13) != 0))
                prop_list.create_prop_entry("bool", "NoSnap", 1)
                prop_list.create_prop_entry("bool", "SkyPan", int(surface.flags & (1 << 15) != 0))
                prop_list.create_prop_entry("bool", "Additive", int(surface.flags & (1 << 19) != 0))
                prop_list.create_prop_entry("bool", "TerrainOccluder", int(surface.flags & (1 << 18) != 0))
                prop_list.create_prop_entry("bool", "TimeOfDay", int(surface.flags & (1 << 20) != 0))
                prop_list.create_prop_entry("bool", "VisBlocker", int(surface.flags & (1 << 21) != 0))
                prop_list.create_prop_entry("bool", "NotAStep", int(surface.flags & (1 << 22) != 0))
                prop_list.create_prop_entry("bool", "NoWallWalk", int(surface.flags & (1 << 23) != 0))
                prop_list.create_prop_entry("bool", "BlockLight", int(surface.flags & (1 << 24) == 0))

                prop_list.create_prop_entry("longint", "DetailLevel", 0)
                prop_list.create_prop_entry("string", "Effect", "")
                prop_list.create_prop_entry("string", "EffectParam", "")
                prop_list.create_prop_entry("real", "FrictionCoefficient", 1.0)

                created_brush_node = True
                running_prop_id += 1
                running_brush_id += 1
                running_node_id += 1

        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="ascii", errors="ignore") as f:
            f.write(root_node.serialize())


KNOWN_EXTS = [
    ".dtx",
    ".dds",
    ".tga",
    ".png",
    ".ltb",
    ".lta",
    ".ltc",
    ".tb",
    ".wav",
    ".ogg",
    ".mp3",
    ".txt",
]

EXCLUDE_EXTS = {
    ".dll",
    ".exe",
    ".i64",
    ".idb",
    ".id0",
    ".id1",
    ".id2",
    ".id3",
    ".id4",
    ".nam",
    ".til",
    ".pdb",
}


def looks_like_path(s: str):
    if not s:
        return False
    if "/" in s or "\\" in s:
        return True
    return "." in os.path.basename(s)


def build_manifest(dat: DatFile, dat_path: str, resources_root: str):
    textures = set()
    for wm in dat.world_models:
        for tex in wm.texture_names:
            if tex.name:
                textures.add(tex.name)

    render_textures = set()
    if dat.render_data:
        render_textures |= dat.render_data.textures

    object_types = set()
    property_strings = set()
    resource_candidates = set()
    if dat.world_object_data:
        for obj in dat.world_object_data.world_objects:
            object_types.add(obj.name)
            for prop in obj.properties:
                if prop.code == ObjectProperty.PROP_STRING and isinstance(prop.value, str):
                    property_strings.add(prop.value)
                    if looks_like_path(prop.value):
                        resource_candidates.add(prop.value)

    obj_lto = os.path.join(resources_root, "Object.lto")
    if os.path.exists(obj_lto):
        resource_candidates.add("Object.lto")

    manifest = {
        "dat_path": os.path.abspath(dat_path),
        "dat_version": dat.version,
        "world_models": [wm.world_name for wm in dat.world_models],
        "textures": sorted(textures),
        "render_textures": sorted(render_textures),
        "object_types": sorted(object_types),
        "object_property_strings": sorted(property_strings),
        "resource_candidates": sorted(resource_candidates),
    }
    return manifest


def write_manifest(manifest, out_path):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    txt_path = os.path.splitext(out_path)[0] + ".txt"
    with open(txt_path, "w", encoding="utf-8") as f:
        for key in ["textures", "render_textures", "resource_candidates"]:
            f.write(f"[{key}]\n")
            for item in manifest.get(key, []):
                f.write(f"{item}\n")
            f.write("\n")


def build_resource_index(resources_root):
    by_base = {}
    by_name = {}
    for root, _dirs, files in os.walk(resources_root):
        for fname in files:
            lower_name = fname.lower()
            base = os.path.splitext(lower_name)[0]
            full = os.path.join(root, fname)
            by_base.setdefault(base, []).append(full)
            by_name.setdefault(lower_name, []).append(full)
    return by_base, by_name


def resolve_resource(name, resources_root, by_base, by_name):
    if not name:
        return []
    clean = name.replace("\\", os.sep).replace("/", os.sep)
    clean = clean.strip("\"")

    direct = os.path.join(resources_root, clean)
    if os.path.exists(direct):
        return [direct]

    lower_name = os.path.basename(clean).lower()
    if lower_name in by_name:
        return by_name[lower_name]

    base = os.path.splitext(lower_name)[0]
    results = []
    if base in by_base:
        results.extend(by_base[base])

    if not results and "." not in lower_name:
        for ext in KNOWN_EXTS:
            candidate = os.path.join(resources_root, clean + ext)
            if os.path.exists(candidate):
                results.append(candidate)
    return results


def copy_assets(manifest, resources_root, out_root):
    by_base, by_name = build_resource_index(resources_root)
    targets = set(manifest.get("textures", []))
    targets |= set(manifest.get("render_textures", []))
    targets |= set(manifest.get("resource_candidates", []))
    targets.add("Object.lto")

    copied = 0
    for name in sorted(targets):
        for path in resolve_resource(name, resources_root, by_base, by_name):
            rel = os.path.relpath(path, resources_root)
            dest = os.path.join(out_root, "Resources", rel)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            if not os.path.exists(dest):
                shutil.copy2(path, dest)
                copied += 1
    return copied


def copy_all_resources(resources_root, out_root):
    dest = os.path.join(out_root, "Resources")
    if os.path.exists(dest):
        shutil.rmtree(dest)
    for root, dirs, files in os.walk(resources_root):
        rel = os.path.relpath(root, resources_root)
        dest_root = os.path.join(dest, rel) if rel != "." else dest
        os.makedirs(dest_root, exist_ok=True)
        for fname in files:
            lower = fname.lower()
            if lower == "object.lto":
                should_copy = True
            else:
                should_copy = os.path.splitext(lower)[0] and os.path.splitext(lower)[1] not in EXCLUDE_EXTS
            if not should_copy:
                continue
            src = os.path.join(root, fname)
            dst = os.path.join(dest_root, fname)
            shutil.copy2(src, dst)


def collect_dat_files(inputs, recursive=False):
    dat_files = []
    for item in inputs:
        if os.path.isdir(item):
            if recursive:
                for root, _dirs, files in os.walk(item):
                    for fname in files:
                        if fname.lower().endswith(".dat"):
                            dat_files.append(os.path.join(root, fname))
            else:
                for fname in os.listdir(item):
                    if fname.lower().endswith(".dat"):
                        dat_files.append(os.path.join(item, fname))
        else:
            dat_files.append(item)
    return dat_files


def main():
    parser = argparse.ArgumentParser(description="FoM DAT -> LTA + manifest tool (LithTech Jupiter).")
    parser.add_argument("inputs", nargs="+", help="DAT files or directories.")
    parser.add_argument("--out", required=True, help="Output root directory.")
    parser.add_argument("--resources-root", default=os.path.join("Client", "Client_FoM", "Resources"))
    parser.add_argument("--lta", action="store_true", help="Write LTA output.")
    parser.add_argument("--manifest", action="store_true", help="Write asset manifest.")
    parser.add_argument("--copy-assets", action="store_true", help="Copy assets referenced by manifest.")
    parser.add_argument("--copy-all-resources", action="store_true", help="Copy entire Resources tree.")
    parser.add_argument("--skip-render-data", action="store_true", help="Skip render data parse (faster).")
    parser.add_argument("--recursive", action="store_true", help="Recurse when input is a directory.")
    args = parser.parse_args()

    if not args.lta and not args.manifest:
        args.lta = True
        args.manifest = True

    dat_files = collect_dat_files(args.inputs, recursive=args.recursive)
    if not dat_files:
        print("No DAT files found.")
        return 1

    resources_root = args.resources_root
    out_root = args.out
    os.makedirs(out_root, exist_ok=True)

    for dat_path in dat_files:
        dat = DatFile()
        dat.read(dat_path, parse_render=not args.skip_render_data)
        base = os.path.splitext(os.path.basename(dat_path))[0]

        if args.lta:
            lta_path = os.path.join(out_root, "Worlds", f"{base}.lta")
            LTAWriter().write(dat, lta_path)
            print(f"Wrote LTA: {lta_path}")

        manifest = None
        if args.manifest:
            manifest = build_manifest(dat, dat_path, resources_root)
            manifest_path = os.path.join(out_root, "Manifest", f"{base}.manifest.json")
            write_manifest(manifest, manifest_path)
            print(f"Wrote manifest: {manifest_path}")

        if args.copy_all_resources:
            copy_all_resources(resources_root, out_root)
            print("Copied full Resources tree.")
        elif args.copy_assets:
            if manifest is None:
                manifest = build_manifest(dat, dat_path, resources_root)
            copied = copy_assets(manifest, resources_root, out_root)
            print(f"Copied assets: {copied}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
