#!/usr/bin/env python3
"""Prepare a local DK Media Plus AppDir/AppImage without network or system changes.

Maintainer-only packaging tool. No GitHub Actions or automatic downloads.
A candidate still requires full runtime acceptance before public release.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
VERSION = "0.0.69"
NATIVE_TARGET = "dk-media-plus"  # CMake native output
MODEL_PATH = "components/ai/models/nomic-embed-text-v1.5-Q4_K_M.gguf"


def fail(message):
    raise RuntimeError(message)


def require_file(path, label, min_size=1):
    if not path.is_file() or path.stat().st_size < min_size:
        fail(f"Missing or incomplete {label}: {path}")
    with path.open("rb") as handle:
        if handle.read(80).startswith(b"version https://git-lfs.github.com/spec/v1"):
            fail(f"Unresolved Git LFS pointer for {label}: {path}")
    return path


def require_elf(path, label):
    require_file(path, label)
    with path.open("rb") as handle:
        if handle.read(4) != b"\x7fELF":
            fail(f"{label} is not an ELF executable: {path}")
    if not os.access(path, os.X_OK):
        fail(f"Not executable: {path}")
    return path


def library_path(name):
    result = subprocess.run(["ldconfig", "-p"], check=True, capture_output=True, text=True)
    for line in result.stdout.splitlines():
        if line.strip().startswith(name) and "=>" in line:
            candidate = Path(line.rsplit("=>", 1)[1].strip())
            if candidate.is_file():
                return candidate
    fail(f"Cannot locate {name}; missing runtime on the packaging host")


def vlc_plugin_dir():
    for root in (Path("/usr/lib"), Path("/lib"), Path("/usr/local/lib")):
        for path in sorted(root.glob("*/vlc/plugins")):
            if any(path.rglob("*.so")):
                return path
    fail("VLC plugins missing. The player cannot be bundled without its decoders.")


def copy_dir(source, target):
    if not source.is_dir():
        fail(f"Runtime directory missing: {source}")
    shutil.copytree(source, target, symlinks=True, dirs_exist_ok=True)


def check_pointers(root):
    for path in root.rglob("*"):
        if path.is_file() and not path.is_symlink() and path.stat().st_size < 180:
            with path.open("rb") as handle:
                if handle.read(80).startswith(b"version https://git-lfs.github.com/spec/v1"):
                    fail(f"Refusing to bundle unresolved Git LFS file: {path}")


def app_run():
    return """#!/bin/sh
set -e
HERE="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
export PATH="$HERE/usr/bin:$PATH"
export LD_LIBRARY_PATH="$HERE/usr/lib:$HERE/usr/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH:-}"
export VLC_PLUGIN_PATH="$HERE/usr/lib/vlc/plugins"
exec "$HERE/usr/bin/dk-media-plus" "$@"
"""


def stage(args):
    if sys.platform != "linux" or os.uname().machine != "x86_64":
        fail("x86_64 Linux packaging host required")
    build = args.build_dir.resolve()
    app = require_elf(build / NATIVE_TARGET, "native application")
    server = require_elf(build / "dk-media-web-service", "web service")
    cache = require_file(build / "CMakeCache.txt", "CMake build cache").read_text()
    stub = "REDDMEDIA_AI_STUB:BOOL=ON" in cache
    if stub and not args.developer_ai_stub:
        fail("Release packaging rejects AI-stub builds; supply the real AI runtime")
    if args.developer_ai_stub and not stub:
        fail("--developer-ai-stub is only permitted with a stub-configured build")
    if not args.developer_ai_stub:
        require_file(ROOT / MODEL_PATH, "embedding model", 1_000_000)
        if not any((ROOT / "components/ai/runtime/lib").glob("libllama.so*")):
            fail("llama.cpp runtime missing")
    tools = {}
    for name in ("ffmpeg", "ffprobe", "zenity"):
        location = shutil.which(name)
        if not location:
            fail(f"Missing packaging-host runtime: {name}")
        tools[name] = require_elf(Path(location), name)
    for name in ("LICENSE", "THIRD_PARTY_NOTICES.md", "COPYRIGHT.md"):
        require_file(ROOT / name, "legal notices")
    linuxdeploy = args.linuxdeploy.resolve()
    require_file(linuxdeploy, "linuxdeploy")
    if not os.access(linuxdeploy, os.X_OK):
        fail("linuxdeploy is not executable")
    appimagetool = args.appimagetool.resolve() if args.appimagetool else None
    if appimagetool:
        require_file(appimagetool, "appimagetool")
        if not os.access(appimagetool, os.X_OK):
            fail("appimagetool is not executable")
    out = args.output_dir.resolve()
    if out == ROOT or (ROOT in out.parents and out != ROOT / "dist"):
        fail("Choose the project's dist folder or an external output folder")
    out.mkdir(parents=True, exist_ok=True)
    label = "DK-Media-Plus-DEVELOPER-STUB" if stub else "DK-Media-Plus"
    final = out / (label + ".AppDir")
    image = out / (label + "-v" + VERSION + "-x86_64.AppImage")
    if final.exists() or (appimagetool and image.exists()):
        fail(f"Output already exists; refusing overwrite: {final} / {image}")

    with tempfile.TemporaryDirectory(prefix="dk-media-stage-", dir=out) as temp:
        appdir = Path(temp) / "DKMediaPlus.AppDir"
        binary_dir = appdir / "usr/bin"
        binary_dir.mkdir(parents=True)
        shutil.copy2(app, binary_dir / "dk-media-plus")
        copy_dir(ROOT / "assets", binary_dir / "assets")
        copy_dir(ROOT / "components/web_player", binary_dir / "components/web_player")
        (binary_dir / "components/web_player/nougat-web-service").unlink(missing_ok=True)
        shutil.copy2(server, binary_dir / "components/web_player/dk-media-web-service")
        copy_dir(ROOT / "components/jellyfin/runtime/jellyfin",
                 binary_dir / "components/jellyfin/runtime/jellyfin")
        copy_dir(ROOT / "components/ai/runtime",
                 binary_dir / "components/ai/runtime")
        if not stub:
            model_dest = binary_dir / MODEL_PATH
            model_dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / MODEL_PATH, model_dest)
        ytdlp = binary_dir / "tools/yt-dlp/yt-dlp"
        ytdlp.parent.mkdir(parents=True)
        shutil.copy2(require_file(ROOT / "tools/yt-dlp/yt-dlp", "yt-dlp"), ytdlp)
        if not os.access(ytdlp, os.X_OK):
            fail("Bundled yt-dlp is not executable")
        copy_dir(vlc_plugin_dir(), appdir / "usr/lib/vlc/plugins")
        license_dest = appdir / "usr/share/doc/dkmediaplus"
        license_dest.mkdir(parents=True)
        for name in ("LICENSE", "THIRD_PARTY_NOTICES.md", "COPYRIGHT.md"):
            shutil.copy2(ROOT / name, license_dest / name)
        check_pointers(binary_dir)
        # Preserve upstream license texts alongside the suite-level notices.
        copy_dir(ROOT / "licenses", license_dest / "licenses")
        desktop = appdir / "com.dksoftworks.DKMediaPlus.desktop"
        desktop.write_text("[Desktop Entry]\nType=Application\nName=DK Media Plus\n"
                           "Comment=Media center, radio, games and studio\n"
                           "Exec=dk-media-plus\nIcon=dkmediaplus\nTerminal=false\n"
                           "Categories=AudioVideo;Player;\nStartupNotify=true\n")
        icon = appdir / "dkmediaplus.png"
        shutil.copy2(require_file(ROOT / "assets/branding/nougat-media-plus-dock-N.png",
                                  "desktop icon"), icon)
        command = [
            str(linuxdeploy), "--appdir", str(appdir),
            "--executable", str(binary_dir / "dk-media-plus"),
            "--executable", str(binary_dir / "components/web_player/nougat-web-service"),
            "--executable", str(tools["ffmpeg"]), "--executable", str(tools["ffprobe"]),
            "--executable", str(tools["zenity"]),
            "--library", str(library_path("libvlc.so.5")),
            "--library", str(library_path("libvlccore.so.")),
            "--desktop-file", str(desktop), "--icon-file", str(icon)
        ]
        subprocess.run(command, check=True)
        launcher = appdir / "AppRun"
        if launcher.exists() or launcher.is_symlink():
            launcher.unlink()
        launcher.write_text(app_run())
        launcher.chmod(0o755)
        (license_dest / "CANDIDATE_STATUS.txt").write_text(
            "DK Media Plus v" + VERSION + "\n"
            "AI stub: " + str(stub) + "\n"
            "Development candidate: device, codec and streaming acceptance NOT VERIFIED.\n"
        )
        check_pointers(appdir)
        shutil.move(str(appdir), final)
    print("Staged AppDir:", final)
    if appimagetool:
        env = os.environ.copy()
        env["ARCH"] = "x86_64"
        subprocess.run([str(appimagetool), str(final), str(image)],
                       env=env, check=True)
        print("Candidate AppImage:", image)
    print("Packaging source only; not a release acceptance or runtime certification.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--build-dir", type=Path, default=ROOT / "build-surface")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "dist")
    parser.add_argument("--linuxdeploy", type=Path, required=True)
    parser.add_argument("--appimagetool", type=Path)
    parser.add_argument("--developer-ai-stub", action="store_true",
                        help="Developer-only bundle, never for publishing")
    args = parser.parse_args()
    try:
        stage(args)
    except (RuntimeError, OSError, subprocess.CalledProcessError) as error:
        print("PACKAGING FAILED:", error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
