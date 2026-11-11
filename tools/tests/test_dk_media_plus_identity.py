#!/usr/bin/env python3
"""DK Media Plus v0.0.69 brand/packager static contracts.

Run locally: python3 tools/tests/test_dk_media_plus_identity.py
Does not build or install anything, run Actions, or touch user media.
"""
import json
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[2]
def read(name): return (ROOT/name).read_text(encoding="utf-8")

class DKMediaIdentity(unittest.TestCase):
    def test_cmake_target_and_version(self):
        cm=read("CMakeLists.txt")
        for item in ("project(DKMediaPlus VERSION 0.0.69",
                     "add_executable(dk_media_plus",
                     'OUTPUT_NAME "dk-media-plus"',
                     "add_executable(dk_media_web_service",
                     'OUTPUT_NAME "dk-media-web-service"'):
            self.assertIn(item,cm)
        self.assertNotIn("project(NougatMediaPlus",cm)
        self.assertNotIn("Nougat_Media_Plus_v68",cm)
    def test_native_version_and_window(self):
        source=read("src/main.cpp")
        for item in ("DK Media Plus v0.0.69", "DKMediaPlus",
                     "com.dksoftworks.DKMediaPlus"):
            self.assertIn(item,source)
        self.assertNotIn("NougatMediaPlus",source)
        self.assertNotIn("ViewMode::DK Media Plus",source)
        self.assertNotIn("::studio::output_extension(",source)
        self.assertIn('Preset::SubtitleSrt: extension = ".srt"',source)
        self.assertNotIn("v0.0.68",source)
        self.assertIn(".config/nougat-media-plus",source,
                      "Legacy settings must remain readable")
    def test_desktop_launcher(self):
        launcher=read("com.dksoftworks.DKMediaPlus.desktop")
        for item in ("Name=DK Media Plus", "Exec=dk-media-plus",
                     "StartupWMClass=DKMediaPlus"):
            self.assertIn(item,launcher)
        self.assertNotIn("/home/",launcher)
    def test_browser_labels(self):
        for name in ("index.html","watch/index.html","components/web_player/index.html",
                     "manifest.webmanifest","watch/manifest.webmanifest",
                     "components/web_player/manifest.webmanifest"):
            content=read(name)
            self.assertIn("DK Media",content,name)
            self.assertNotIn("Nougat Media Plus",content,name)
            self.assertNotIn("Nougat Watch",content,name)
            if name.endswith(".webmanifest"):
                json.loads(content)
    def test_readme(self):
        text=read("README.md")
        self.assertTrue(text.startswith("# DK Media Plus"))
        self.assertIn("https://github.com/dereksparks1982/dkmediaplus",text)
        self.assertIn("https://dereksparks1982.github.io/dkmediaplus/watch/",text)
        self.assertIn("v0.0.69",text)
    def test_service_and_packaging(self):
        manager=read("src/media_server/media_server_manager.cpp")
        self.assertIn('components/web_player/dk-media-web-service',manager)
        self.assertIn('components/web_player/nougat-web-service',manager,
                      "Compatibility fallback must remain in place")
        pack=read("tools/packaging/create_appdir.py")
        self.assertIn('NATIVE_TARGET = "dk-media-plus"',pack)
        self.assertIn('build / "dk-media-web-service"',pack)
        self.assertIn("check_pointers",pack)
        self.assertIn("--linuxdeploy",pack)
        self.assertNotIn('"--executable", str(binary_dir / "components/web_player/nougat-web-service")',pack)
        self.assertIn("--developer-ai-stub",pack)

if __name__=="__main__":
    unittest.main(verbosity=2)
