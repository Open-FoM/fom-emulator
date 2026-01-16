#!/usr/bin/env python3
import argparse
import binascii
import os
import struct
import sys
import zlib


DTX_COMMANDSTRING_LEN = 128
DTX_HEADER_SIZE = 164

# BPPIdent from pixelformat.h
BPP_8P = 0
BPP_8 = 1
BPP_16 = 2
BPP_32 = 3
BPP_S3TC_DXT1 = 4
BPP_S3TC_DXT3 = 5
BPP_S3TC_DXT5 = 6
BPP_32P = 7
BPP_24 = 8

BPP_NAMES = {
    BPP_8P: "BPP_8P",
    BPP_8: "BPP_8",
    BPP_16: "BPP_16",
    BPP_32: "BPP_32",
    BPP_S3TC_DXT1: "BPP_S3TC_DXT1",
    BPP_S3TC_DXT3: "BPP_S3TC_DXT3",
    BPP_S3TC_DXT5: "BPP_S3TC_DXT5",
    BPP_32P: "BPP_32P",
    BPP_24: "BPP_24",
}

# DTX flags (subset)
DTX_FULLBRITE = 1 << 0
DTX_PREFER16BIT = 1 << 1
DTX_SECTIONSFIXED = 1 << 3
DTX_PREFER4444 = 1 << 7
DTX_PREFER5551 = 1 << 8
DTX_32BITSYSCOPY = 1 << 9
DTX_CUBEMAP = 1 << 10
DTX_BUMPMAP = 1 << 11
DTX_LUMBUMPMAP = 1 << 12

PIXEL_BYTES = {
    BPP_8P: 1,
    BPP_8: 1,
    BPP_16: 2,
    BPP_32: 4,
    BPP_S3TC_DXT1: 0,
    BPP_S3TC_DXT3: 0,
    BPP_S3TC_DXT5: 0,
    BPP_32P: 1,
    BPP_24: 3,
}


def is_compressed(bpp):
    return bpp in (BPP_S3TC_DXT1, BPP_S3TC_DXT3, BPP_S3TC_DXT5)


def calc_image_size(bpp, width, height):
    if is_compressed(bpp):
        if bpp == BPP_S3TC_DXT1:
            return (width * height) // 2
        return width * height
    return width * height * PIXEL_BYTES[bpp]


def read_header(fp):
    data = fp.read(DTX_HEADER_SIZE)
    if len(data) != DTX_HEADER_SIZE:
        raise ValueError("file too small for DTX header")
    (
        res_type,
        version,
        base_w,
        base_h,
        n_mips,
        n_sections,
        i_flags,
        user_flags,
        extra,
        command
    ) = struct.unpack("<IiHHHHii12s128s", data)
    command = command.split(b"\x00", 1)[0]
    return {
        "res_type": res_type,
        "version": version,
        "base_w": base_w,
        "base_h": base_h,
        "n_mips": n_mips,
        "n_sections": n_sections,
        "i_flags": i_flags,
        "user_flags": user_flags,
        "extra": extra,
        "command": command.decode("ascii", errors="ignore"),
    }


def bpp_from_extra(extra):
    bpp = extra[2]
    if bpp == 0:
        return BPP_32
    return bpp


def clamp_u8(v):
    if v < 0:
        return 0
    if v > 255:
        return 255
    return v


def unpack_565(c):
    r = ((c >> 11) & 0x1F) * 255 // 31
    g = ((c >> 5) & 0x3F) * 255 // 63
    b = (c & 0x1F) * 255 // 31
    return r, g, b


def decode_dxt1(data, width, height):
    out = bytearray(width * height * 4)
    block_w = (width + 3) // 4
    block_h = (height + 3) // 4
    idx = 0
    for by in range(block_h):
        for bx in range(block_w):
            if idx + 8 > len(data):
                break
            c0, c1, bits = struct.unpack_from("<HHI", data, idx)
            idx += 8
            r0, g0, b0 = unpack_565(c0)
            r1, g1, b1 = unpack_565(c1)
            colors = [
                (r0, g0, b0, 255),
                (r1, g1, b1, 255),
                (0, 0, 0, 255),
                (0, 0, 0, 255),
            ]
            if c0 > c1:
                colors[2] = ((2 * r0 + r1) // 3, (2 * g0 + g1) // 3, (2 * b0 + b1) // 3, 255)
                colors[3] = ((r0 + 2 * r1) // 3, (g0 + 2 * g1) // 3, (b0 + 2 * b1) // 3, 255)
            else:
                colors[2] = ((r0 + r1) // 2, (g0 + g1) // 2, (b0 + b1) // 2, 255)
                colors[3] = (0, 0, 0, 0)

            for py in range(4):
                for px in range(4):
                    x = bx * 4 + px
                    y = by * 4 + py
                    if x >= width or y >= height:
                        continue
                    shift = 2 * (py * 4 + px)
                    sel = (bits >> shift) & 0x3
                    r, g, b, a = colors[sel]
                    off = (y * width + x) * 4
                    out[off:off + 4] = bytes((r, g, b, a))
    return out


def decode_dxt3(data, width, height):
    out = bytearray(width * height * 4)
    block_w = (width + 3) // 4
    block_h = (height + 3) // 4
    idx = 0
    for by in range(block_h):
        for bx in range(block_w):
            if idx + 16 > len(data):
                break
            alpha64 = struct.unpack_from("<Q", data, idx)[0]
            idx += 8
            c0, c1, bits = struct.unpack_from("<HHI", data, idx)
            idx += 8
            r0, g0, b0 = unpack_565(c0)
            r1, g1, b1 = unpack_565(c1)
            colors = [
                (r0, g0, b0),
                (r1, g1, b1),
                ((2 * r0 + r1) // 3, (2 * g0 + g1) // 3, (2 * b0 + b1) // 3),
                ((r0 + 2 * r1) // 3, (g0 + 2 * g1) // 3, (b0 + 2 * b1) // 3),
            ]
            for py in range(4):
                for px in range(4):
                    x = bx * 4 + px
                    y = by * 4 + py
                    if x >= width or y >= height:
                        continue
                    shift = 2 * (py * 4 + px)
                    sel = (bits >> shift) & 0x3
                    a4 = (alpha64 >> (4 * (py * 4 + px))) & 0xF
                    a = a4 * 17
                    r, g, b = colors[sel]
                    off = (y * width + x) * 4
                    out[off:off + 4] = bytes((r, g, b, a))
    return out


def decode_dxt5(data, width, height):
    out = bytearray(width * height * 4)
    block_w = (width + 3) // 4
    block_h = (height + 3) // 4
    idx = 0
    for by in range(block_h):
        for bx in range(block_w):
            if idx + 16 > len(data):
                break
            a0 = data[idx]
            a1 = data[idx + 1]
            alpha_bits = int.from_bytes(data[idx + 2:idx + 8], "little")
            idx += 8
            c0, c1, bits = struct.unpack_from("<HHI", data, idx)
            idx += 8
            r0, g0, b0 = unpack_565(c0)
            r1, g1, b1 = unpack_565(c1)
            colors = [
                (r0, g0, b0),
                (r1, g1, b1),
                ((2 * r0 + r1) // 3, (2 * g0 + g1) // 3, (2 * b0 + b1) // 3),
                ((r0 + 2 * r1) // 3, (g0 + 2 * g1) // 3, (b0 + 2 * b1) // 3),
            ]
            alphas = [0] * 8
            alphas[0] = a0
            alphas[1] = a1
            if a0 > a1:
                alphas[2] = (6 * a0 + 1 * a1) // 7
                alphas[3] = (5 * a0 + 2 * a1) // 7
                alphas[4] = (4 * a0 + 3 * a1) // 7
                alphas[5] = (3 * a0 + 4 * a1) // 7
                alphas[6] = (2 * a0 + 5 * a1) // 7
                alphas[7] = (1 * a0 + 6 * a1) // 7
            else:
                alphas[2] = (4 * a0 + 1 * a1) // 5
                alphas[3] = (3 * a0 + 2 * a1) // 5
                alphas[4] = (2 * a0 + 3 * a1) // 5
                alphas[5] = (1 * a0 + 4 * a1) // 5
                alphas[6] = 0
                alphas[7] = 255

            for py in range(4):
                for px in range(4):
                    x = bx * 4 + px
                    y = by * 4 + py
                    if x >= width or y >= height:
                        continue
                    shift = 2 * (py * 4 + px)
                    sel = (bits >> shift) & 0x3
                    a_idx = (alpha_bits >> (3 * (py * 4 + px))) & 0x7
                    a = alphas[a_idx]
                    r, g, b = colors[sel]
                    off = (y * width + x) * 4
                    out[off:off + 4] = bytes((r, g, b, a))
    return out


def decode_uncompressed(data, width, height, bpp, flags):
    if bpp == BPP_32:
        out = bytearray(width * height * 4)
        for i in range(width * height):
            b = data[i * 4 + 0]
            g = data[i * 4 + 1]
            r = data[i * 4 + 2]
            a = data[i * 4 + 3]
            out[i * 4 + 0] = r
            out[i * 4 + 1] = g
            out[i * 4 + 2] = b
            out[i * 4 + 3] = a
        return out
    if bpp == BPP_24:
        out = bytearray(width * height * 4)
        for i in range(width * height):
            b = data[i * 3 + 0]
            g = data[i * 3 + 1]
            r = data[i * 3 + 2]
            out[i * 4 + 0] = r
            out[i * 4 + 1] = g
            out[i * 4 + 2] = b
            out[i * 4 + 3] = 255
        return out
    if bpp == BPP_16:
        out = bytearray(width * height * 4)
        prefer_4444 = (flags & DTX_PREFER4444) != 0
        prefer_5551 = (flags & DTX_PREFER5551) != 0 or (flags & DTX_FULLBRITE) != 0
        for i in range(width * height):
            val = struct.unpack_from("<H", data, i * 2)[0]
            if prefer_4444:
                a = ((val >> 12) & 0xF) * 17
                r = ((val >> 8) & 0xF) * 17
                g = ((val >> 4) & 0xF) * 17
                b = (val & 0xF) * 17
            elif prefer_5551:
                a = 255 if (val & 0x8000) else 0
                r = ((val >> 10) & 0x1F) * 255 // 31
                g = ((val >> 5) & 0x1F) * 255 // 31
                b = (val & 0x1F) * 255 // 31
            else:
                a = 255
                r = ((val >> 11) & 0x1F) * 255 // 31
                g = ((val >> 5) & 0x3F) * 255 // 63
                b = (val & 0x1F) * 255 // 31
            out[i * 4 + 0] = r
            out[i * 4 + 1] = g
            out[i * 4 + 2] = b
            out[i * 4 + 3] = a
        return out
    return None


def write_png(path, width, height, rgba):
    # PNG signature
    sig = b"\x89PNG\r\n\x1a\n"
    # IHDR
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    chunks = []
    chunks.append(make_chunk(b"IHDR", ihdr))
    # IDAT
    stride = width * 4
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        start = y * stride
        raw.extend(rgba[start:start + stride])
    compressed = zlib.compress(bytes(raw), level=9)
    chunks.append(make_chunk(b"IDAT", compressed))
    chunks.append(make_chunk(b"IEND", b""))

    with open(path, "wb") as f:
        f.write(sig)
        for c in chunks:
            f.write(c)


def make_chunk(chunk_type, data):
    length = struct.pack(">I", len(data))
    crc = binascii.crc32(chunk_type)
    crc = binascii.crc32(data, crc)
    crc_bytes = struct.pack(">I", crc & 0xFFFFFFFF)
    return length + chunk_type + data + crc_bytes


def decode_mip_to_rgba(mip_data, width, height, bpp, flags):
    if bpp == BPP_S3TC_DXT1:
        return decode_dxt1(mip_data, width, height)
    if bpp == BPP_S3TC_DXT3:
        return decode_dxt3(mip_data, width, height)
    if bpp == BPP_S3TC_DXT5:
        return decode_dxt5(mip_data, width, height)
    return decode_uncompressed(mip_data, width, height, bpp, flags)


def load_mips(fp, bpp, base_w, base_h, n_mips):
    mips = []
    w = base_w
    h = base_h
    for i in range(n_mips):
        size = calc_image_size(bpp, w, h)
        data = fp.read(size)
        if len(data) != size:
            raise ValueError("unexpected EOF reading mip data")
        mips.append((w, h, data))
        w = max(1, w // 2)
        h = max(1, h // 2)
    return mips


def convert_one(dtx_path, out_path, mip_index, allow_cubemap, quiet):
    with open(dtx_path, "rb") as f:
        header = read_header(f)
        if header["res_type"] != 0:
            raise ValueError("not a DTX file (res type != 0)")
        bpp = bpp_from_extra(header["extra"])
        bpp_name = BPP_NAMES.get(bpp, str(bpp))
        if header["version"] != -5 and not quiet:
            print("warn: unexpected DTX version {} in {}".format(header["version"], dtx_path))
        if header["i_flags"] & DTX_CUBEMAP and not allow_cubemap:
            if not quiet:
                print("skip: cubemap DTX (use --allow-cubemap) {}".format(dtx_path))
            return False
        if header["i_flags"] & (DTX_BUMPMAP | DTX_LUMBUMPMAP):
            if not quiet:
                print("skip: bumpmap DTX {}".format(dtx_path))
            return False
        if bpp in (BPP_8P, BPP_8, BPP_32P):
            if not quiet:
                print("skip: palettized DTX {} (bpp {})".format(dtx_path, bpp_name))
            return False

        mips = load_mips(f, bpp, header["base_w"], header["base_h"], header["n_mips"])
        if mip_index < 0 or mip_index >= len(mips):
            raise ValueError("mip index {} out of range".format(mip_index))
        width, height, mip_data = mips[mip_index]
        rgba = decode_mip_to_rgba(mip_data, width, height, bpp, header["i_flags"])
        if rgba is None:
            if not quiet:
                print("skip: unsupported bpp {} in {}".format(bpp_name, dtx_path))
            return False
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        write_png(out_path, width, height, rgba)
        if not quiet:
            print("ok: {} -> {} ({} {}x{})".format(dtx_path, out_path, bpp_name, width, height))
        return True


def iter_dtx_files(root):
    for base, _, files in os.walk(root):
        for name in files:
            if name.lower().endswith(".dtx"):
                yield os.path.join(base, name)


def main():
    parser = argparse.ArgumentParser(description="Convert LithTech DTX textures to PNG.")
    parser.add_argument("input", help="DTX file or directory")
    parser.add_argument("--out", required=True, help="output file or directory")
    parser.add_argument("--root", default=None, help="root folder for relative output paths")
    parser.add_argument("--mip", type=int, default=0, help="mip index to export (default 0)")
    parser.add_argument("--allow-cubemap", action="store_true", help="allow cubemap DTX (exports base face only)")
    parser.add_argument("--skip-existing", action="store_true", help="skip if output exists")
    parser.add_argument("--quiet", action="store_true", help="less output")
    args = parser.parse_args()

    input_path = args.input
    out_path = args.out

    if os.path.isdir(input_path):
        root = args.root or input_path
        total = 0
        converted = 0
        for dtx_path in iter_dtx_files(input_path):
            total += 1
            rel = os.path.relpath(dtx_path, root)
            rel_no_ext = os.path.splitext(rel)[0] + ".png"
            dst = os.path.join(out_path, rel_no_ext)
            if args.skip_existing and os.path.exists(dst):
                continue
            try:
                if convert_one(dtx_path, dst, args.mip, args.allow_cubemap, args.quiet):
                    converted += 1
            except Exception as e:
                if not args.quiet:
                    print("fail: {} ({})".format(dtx_path, e))
        if not args.quiet:
            print("done: {} converted out of {}".format(converted, total))
    else:
        if os.path.isdir(out_path):
            base = os.path.splitext(os.path.basename(input_path))[0] + ".png"
            dst = os.path.join(out_path, base)
        else:
            dst = out_path
        if args.skip_existing and os.path.exists(dst):
            if not args.quiet:
                print("skip: exists {}".format(dst))
            return 0
        convert_one(input_path, dst, args.mip, args.allow_cubemap, args.quiet)

    return 0


if __name__ == "__main__":
    sys.exit(main())
