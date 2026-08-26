from __future__ import annotations

import hashlib
import json
import struct
from pathlib import Path

ASSET = Path("client/public/models/luna/brain/source/3d-vh-f-allen-brain.glb")


def read_glb(path: Path) -> tuple[dict, int]:
    with path.open("rb") as source:
        header = source.read(12)
        magic, version, total_length = struct.unpack("<4sII", header)
        if magic != b"glTF":
            raise ValueError("Not a GLB 2.x asset")
        chunk_length, chunk_type = struct.unpack("<I4s", source.read(8))
        if chunk_type != b"JSON":
            raise ValueError("GLB has no initial JSON chunk")
        document = json.loads(source.read(chunk_length).decode("utf-8").rstrip(" \t\r\n\0"))
        return document, total_length


def accessor_bounds(document: dict) -> list[dict]:
    output = []
    for index, accessor in enumerate(document.get("accessors", [])):
        if accessor.get("type") == "VEC3" and "min" in accessor and "max" in accessor:
            output.append({
                "index": index,
                "count": accessor.get("count"),
                "min": accessor["min"],
                "max": accessor["max"],
            })
    return output


def main() -> None:
    document, total_length = read_glb(ASSET)
    nodes = document.get("nodes", [])
    transforms = [
        {
            "index": index,
            "name": node.get("name"),
            "mesh": node.get("mesh"),
            "translation": node.get("translation"),
            "rotation": node.get("rotation"),
            "scale": node.get("scale"),
            "matrix": node.get("matrix"),
            "extras": node.get("extras"),
        }
        for index, node in enumerate(nodes)
        if any(key in node for key in ("translation", "rotation", "scale", "matrix", "extras"))
    ]
    result = {
        "file": str(ASSET),
        "bytes": ASSET.stat().st_size,
        "sha256": hashlib.sha256(ASSET.read_bytes()).hexdigest(),
        "declaredGlbLength": total_length,
        "asset": document.get("asset", {}),
        "scenes": document.get("scenes", []),
        "scene": document.get("scene"),
        "extensionsUsed": document.get("extensionsUsed", []),
        "extensionsRequired": document.get("extensionsRequired", []),
        "topLevelExtras": document.get("extras"),
        "nodeCount": len(nodes),
        "meshCount": len(document.get("meshes", [])),
        "nodeTransformsAndExtras": transforms,
        "positionAccessorBounds": accessor_bounds(document),
    }
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
