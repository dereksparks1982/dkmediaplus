# DK Media Plus v0.0.69: Rename and Linux packaging preparation

Status: **GitHub source candidate**. Owner has not accepted a native release.
Date: 2026-11-11.

## Rename

- UI and product descriptions use **DK Media Plus**.
- Studio identity: **DK Softworks**.
- CMake project: `DKMediaPlus`, version `0.0.69`.
- Native executable filename: `dk-media-plus`.
- Web-service filename: `dk-media-web-service`, with the old on-disk service name accepted as a compatibility fallback.
- Linux application/desktop ID: `com.dksoftworks.DKMediaPlus`.
- Web/PWA documents and repository links use the new product name and GitHub path `dereksparks1982/dkmediaplus`.

Preserve existing keys, API route names, namespace identifiers, security ownership records, and `~/.config/reddmedia` and `~/.config/nougat-media-plus` data folders until migrations can be verified. The project must not silently erase server state, privacy receipts, existing preferences, or saved media. The historical name in old changelog entries describes past releases and is not the product's present name.

The existing approved icon image is retained without redrawing it. Some image filenames and historic archive sources retain old names until migration and artwork approval.

## Linux download-and-run preparation

`tools/packaging/create_appdir.py` is an offline maintainer source candidate. It requires native executable and service binaries, FFmpeg/FFprobe, VLC plugins, a verified complete Jellyfin runtime, a full llama.cpp runtime/model unless explicitly staging a **non-release AI stub**, yt-dlp, assets, and third-party licensing documents. It rejects unresolved Git LFS pointers. With preinstalled maintainer-supplied linuxdeploy and appimagetool it can assemble a staging AppDir/AppImage; it neither downloads packaging tools nor runs GitHub Actions.

**Not proven:** the entire C++ program builds after the reported Studio errors; dynamic runtime bundling correctness, clean-host playback, native window registration, media server startup, codec/plugin completeness, AI inference, license integrity, security tools, and the new GitHub Pages deployment. These require separate native/device checks before publishing a user-downloadable application.

## Source review

`tools/tests/test_dk_media_plus_identity.py` checks native version, target names, desktop app identity, PWA labels, repository links, and persistence compatibility. It is a source contract, not a substitute for compiling, running, or testing a packaged build.

No new app version, GitHub Actions, application binary, or downloadable package has been produced.
