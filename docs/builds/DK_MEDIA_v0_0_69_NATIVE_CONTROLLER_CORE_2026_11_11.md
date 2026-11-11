# DK Media Plus v0.0.69: Native Linux controller core

This source slice adds a Linux joystick input module under `src/input/`, compiled into the native CMake executable. It deliberately does **not** simulate keyboard input, dispatch X11 events to other processes, hijack running emulators, or transmit anything to drone hardware.

## Contracts

- `ControllerManager::rescan()` discovers up to 16 `/dev/input/jsN` devices, opening read-only, nonblocking descriptors without replacing already-open devices.
- `poll()` reads a bounded number of joystick events per device and emits changed button/axis actions only. Disconnect removes device state and emits releases for held commands.
- `set_mapping()` permits per-device-agnostic Linux joystick button/axis indices. The dead-zone setting is bounded to 4000–30000 (signed 16-bit axis units).
- `Context::Ui` and `Context::Player` may emit actions. In Player, horizontal movement maps to seek actions; Games and DroneFlight are intentionally isolated and receive no controller events through this manager.
- `devices()` exposes device paths, Linux-provided names and session-local IDs. There is no native UI configuration persistence in this slice.
- Browser controller mapping lives independently in System → Controller and is **not** shared with this Linux source module.

## Local source-test lane

No GitHub Actions or automatic builds. On a Linux development computer with a C++17 compiler and Linux joystick headers, the controller core can be tested independently:

```bash
c++ -std=c++17 -Wall -Wextra -Werror -Isrc tests/controller_manager_test.cpp src/input/controller_manager.cpp -o /tmp/dk-media-controller-test && /tmp/dk-media-controller-test
```

The full application's optional CMake lane is `-DDK_MEDIA_CONTROLLER_TESTS=ON`, producing `dk_media_controller_test`. The default remains OFF.

## Acceptance gate

1. Compile the native executable and isolated controller core. No C++ compilation has been executed in this source-edit session.
2. Verify controller detection, disconnect, reconnect and different Linux joystick index mappings using actual DualSense/other hardware.
3. Wire `poll()` to the existing native X11 event/main-loop dispatcher and translate semantic actions to UI/Player commands. This remains **pending**.
4. Integrate a native **System → Controller** settings view and persistent mappings. Also **pending**.
5. Test joystick permissions, analog drift, held-key repeat, focus safety, game launches and playback interaction. Hardware support is not accepted without those checks.

Version remains **v0.0.69**; no executable, distribution archive, GitHub Action, or software download was created.
