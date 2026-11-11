# DK Media Plus

## DK Softworks · House of Culture

**DK Softworks** is the studio and project identity. **DK** draws on the Russian abbreviation **ДК** for **Дом культуры** (*Dom kultury*), meaning **“House of Culture.”** Traditionally, a *dom kultury* is a community center for the arts, creativity, performance, and learning.

This identifies the present project or its stewardship; it does not change existing licenses, copyright holders, original creators, or historical credits.


**DK Media Plus** is a Linux-first media center and entertainment platform developed under the **DK Softworks** studio identity.

Current development line: **v0.0.69**. It brings personal movies and TV, music and radio, live television, games, production tools, and network capabilities together in one project.

## Watch your movies and TV

**[Open DK Watch (simplified phone player)](https://dereksparks1982.github.io/dkmediaplus/watch/)**

**[Open the full DK Media Web Player](https://dereksparks1982.github.io/dkmediaplus/)**

The browser viewers are prepared on the dedicated, web-only `gh-pages` branch. The repository's Pages setting must publish from `gh-pages` at `/(root)`. GitHub Pages deployment remains unverified until that setting is corrected and GitHub reports success. Your personal media files **are not uploaded to GitHub**. Playback, catalogs, and artwork come from your running DK Media Plus media server through an HTTPS bridge, including the compatible bridge used for the Hanafi web viewer.

DK Watch is the straightforward way to watch from a phone or tablet: connect to your host, search movies or TV, tap a title, play it, and resume later. Watch's **Continue** filter and the full player's Continue Watching section use the same per-server browser-local playback positions. The full web player has a larger interface with additional modules.

**Connect once for both viewers:** In the full web player, choose **CONNECT** in the top bar to enter or test your HTTPS media server. Quick Watch uses the same saved server setting in that browser.

**To stream remotely:** keep your DK Media Plus media host running and reachable through an HTTPS endpoint that allows connections from the DK Media Plus Pages origin. The web page alone cannot serve files from a computer that is offline. If your host address changes, open **Change media server** in DK Watch and enter your own HTTPS bridge address.

## What DK Media Plus includes

| Area | Purpose |
| --- | --- |
| **Media Library & Player** | Organize movies and television, view posters and metadata, resume playback, select audio/subtitle tracks, navigate chapters, and manage local and network media. |
| **DK Watch & Web Player** | Explore and stream your library on phones, tablets, and computers, with compatible direct-play or host-transcoded streams. The full web player also includes a standard-gamepad navigation foundation (hardware testing pending). |
| **Live TV & World TV** | Discover compatible broadcast tuners and streams, organize channels, and work with TV guides and international broadcasters. |
| **Music & Radio** | Play and explore audio sources, internet radio, compatible receivers, and radio/signal features. |
| **Games** | Organize games and supported emulators, artwork, controller settings, and game launching in the DK Media Plus experience. User-owned game content and firmware are not included. |
| **Studio** | Media conversion, remuxing, audio extraction, export queues, editing foundations, file processing, and other production tools. |
| **Search, Streaming & P2P** | Explore media and online resources through supported search, stream and transfer facilities. |
| **Network & System** | Diagnose services, connected hardware, streaming connectivity, and system health. |

DK Media Plus is an evolving project. Features vary by platform, compatible hardware, external services, and installed backends. **A feature in the source code or roadmap is not necessarily available in the current tested application.** Some advanced tools are native-only and cannot run in a browser.

## Linux and browser support

The primary application targets **Linux**. The native CMake project is **DKMediaPlus**, and the intended release executable is **`dk-media-plus`**. Self-contained Linux packaging is in development; source builds are not yet a tested one-click distribution. The web companions run in modern mobile and desktop browsers; compatibility depends on your device, the source media format, and the server's ability to stream or transcode that format.

The browser interface is a frontend, not a cloud-storage service. To browse and play your own media, the DK Media Plus host must be online. Network access may require your own HTTPS bridge and appropriate security settings.

## Linux packaging status

An offline maintainer packaging candidate is under `tools/packaging/`. It checks local native binaries, requires bundled third-party runtimes, preserves license notices, and rejects unresolved Git LFS pointers. An AppImage must still pass fresh-system playback, server, codec, and AI acceptance tests before release. No GitHub Actions or automatic downloads are part of this packaging work.

## Full-resolution image compressor

In **STUDIO → IMAGE COMPRESSOR**, compress large images locally to JPEG files sized for GitHub uploads **without reducing their pixel dimensions**. The same tool is available as a standalone, offline-capable HTML file: [Full-resolution Image Compressor](tools/Salem_1851_Full_Resolution_GitHub_Compressor.html). It was created for the 6,502 × 6,674 pixel 1851 Salem map; the map itself belongs in Capital & Consequence at `assets/artwork/maps/` and is not copied into DK Media Plus. The default 23 MiB target is below a 25 MB upload threshold. Check detailed lettering after lossy JPEG compression. No image is uploaded to DK Media Plus or a third-party service.

## Project and documentation

Repository: **[DK Media Plus on GitHub](https://github.com/dereksparks1982/dkmediaplus)**.

- [Roadmap](ROADMAP.md): planned features and current development priorities.
- [Changelog](CHANGELOG.md): releases and development history.
- [Dependencies](DEPENDENCIES.md): external and build requirements.
- [Contributing](CONTRIBUTING.md): how to help improve DK Media Plus.
- [Company Bible](COMPANY_BIBLE.md): project architecture and development conventions.
- [Documentation](docs/): technical design notes, feature-specific documentation, and source audits.
- [Legal Notice](LEGAL_NOTICE.md), [License](LICENSE), [Copyright](COPYRIGHT.md), and [Third-Party Notices](THIRD_PARTY_NOTICES.md).

**DK Media Plus · DK Softworks**
