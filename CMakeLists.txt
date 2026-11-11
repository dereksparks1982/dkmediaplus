cmake_minimum_required(VERSION 3.16)
project(DKMediaPlus VERSION 0.0.69 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

option(REDDMEDIA_P2P_STUB "Build P2P engine without libtorrent for isolated source/UI validation" OFF)
option(REDDMEDIA_AI_STUB "Build deterministic AI test lane without loading llama.cpp" OFF)

find_package(Threads REQUIRED)

# Compatible RPCS3 runtime boundary
set(NMP_RPCS3_RUNTIME_DIR "${CMAKE_SOURCE_DIR}/components/games/runtime/rpcs3")
file(MAKE_DIRECTORY "${NMP_RPCS3_RUNTIME_DIR}")
configure_file("${CMAKE_SOURCE_DIR}/src/games/rpcs3_runtime_wrapper.sh" "${NMP_RPCS3_RUNTIME_DIR}/rpcs3" COPYONLY)

add_executable(dk_media_plus
    src/main.cpp
    src/input/controller_manager.cpp
    src/legal_notice.cpp
    src/network_center.cpp
    src/satellite_center.cpp
    components/satellite/sgp4/sgp4.c
    src/radio/radio_backend.cpp
    src/radio/v4l2_radio_provider.cpp
    src/chat/nougat_chat.cpp
    src/games/emulator_host.cpp
    src/games/emulator_registry.cpp
    src/studio/media_job_engine.cpp
    src/studio/media_inspector.cpp
    src/studio/studio_service.cpp
    src/studio/folder_batch_planner.cpp
    src/studio/advanced_export.cpp
    src/studio/profile_library.cpp
    src/games/ps3_profile.cpp
    src/console/runtime_manager.cpp
    src/games/uo_client.cpp
    src/games/uo_playable_runtime.cpp
    src/games/uo_server_manager.cpp
    src/youtube_compat.cpp
    src/nougat/nougat_bridge.cpp
    src/search/secure_search.cpp
    src/privacy/privacy_policy.cpp
    src/privacy/privacy_receipt.cpp
    src/privacy/privacy_broker_client.cpp
    src/crawler/crawler_access_manager.cpp
    src/security/scanner_process.cpp
    src/lan/lan_media_service.cpp
    src/lan/lan_viewer_service.cpp
    src/safety/child_safe_controls.cpp
    src/security/security_advisory_service.cpp
    src/alerts/public_safety_alerts.cpp
    src/world_tv/world_tv_service.cpp
    src/diagnostics/diagnostic_engine.cpp
    src/media_server/jellyfin_api_client.cpp
    src/media_server/library_poster.cpp
    src/media_server/library_metadata_cache.cpp
    src/media_server/media_server_manager.cpp
    src/live_tv/tuner_backend.cpp
    src/live_tv/hdhomerun_provider.cpp
    src/recommendations/embedding_engine.cpp
    src/recommendations/recommendation_engine.cpp
    src/recommendations/tmdb_client.cpp
    src/recommendations/viewing_history.cpp
    src/recommendations/watch_provider_preferences.cpp
    src/p2p_engine.cpp
    src/p2p_stream_server.cpp
    src/ytdlp_stream_server.cpp
)

set_target_properties(dk_media_plus PROPERTIES OUTPUT_NAME "dk-media-plus")
target_include_directories(dk_media_plus PRIVATE "${CMAKE_SOURCE_DIR}/src")
target_compile_options(dk_media_plus PRIVATE -Wall -Wextra -Werror)
target_link_libraries(dk_media_plus PRIVATE X11 dl Threads::Threads m)

if(REDDMEDIA_AI_STUB)
    target_compile_definitions(dk_media_plus PRIVATE REDDMEDIA_AI_STUB=1)
else()
    set(REDDMEDIA_AI_RUNTIME "${CMAKE_SOURCE_DIR}/components/ai/runtime" CACHE PATH
        "Installed llama.cpp runtime used by DK Media Plus")
    find_path(LLAMA_INCLUDE_DIR llama.h
        PATHS "${REDDMEDIA_AI_RUNTIME}/include"
        NO_DEFAULT_PATH REQUIRED)
    find_library(LLAMA_LIBRARY llama
        PATHS "${REDDMEDIA_AI_RUNTIME}/lib" "${REDDMEDIA_AI_RUNTIME}/lib64"
        NO_DEFAULT_PATH REQUIRED)
    target_include_directories(dk_media_plus PRIVATE "${LLAMA_INCLUDE_DIR}")
    target_link_libraries(dk_media_plus PRIVATE "${LLAMA_LIBRARY}")
    target_link_options(dk_media_plus PRIVATE
        "-Wl,--disable-new-dtags"
        "-Wl,-rpath-link,${REDDMEDIA_AI_RUNTIME}/lib"
        "-Wl,-rpath-link,${REDDMEDIA_AI_RUNTIME}/lib64")
    set_target_properties(dk_media_plus PROPERTIES
        BUILD_WITH_INSTALL_RPATH TRUE
        INSTALL_RPATH "\$ORIGIN/components/ai/runtime/lib;\$ORIGIN/components/ai/runtime/lib64"
        INSTALL_RPATH_USE_LINK_PATH FALSE)
endif()

if(REDDMEDIA_P2P_STUB)
    target_compile_definitions(dk_media_plus PRIVATE REDDMEDIA_P2P_STUB=1)
else()
    find_package(PkgConfig REQUIRED)
    pkg_check_modules(LIBTORRENT REQUIRED IMPORTED_TARGET libtorrent-rasterbar)
    target_link_libraries(dk_media_plus PRIVATE PkgConfig::LIBTORRENT)
endif()

add_executable(dk_media_web_service
    src/lan/web_player_daemon.cpp
    src/lan/lan_media_service.cpp
    src/media_server/jellyfin_api_client.cpp
    src/media_server/library_poster.cpp
)
target_compile_options(dk_media_web_service PRIVATE -Wall -Wextra -Werror)
target_link_libraries(dk_media_web_service PRIVATE Threads::Threads)
set_target_properties(dk_media_web_service PROPERTIES OUTPUT_NAME "dk-media-web-service")



# Source-level Linux gamepad smoke test; opt-in locally, no GitHub Actions.
option(DK_MEDIA_CONTROLLER_TESTS "Build Linux controller core smoke test" OFF)
if(DK_MEDIA_CONTROLLER_TESTS)
    enable_testing()
    add_executable(dk_media_controller_test
        tests/controller_manager_test.cpp
        src/input/controller_manager.cpp)
    target_include_directories(dk_media_controller_test PRIVATE "${CMAKE_SOURCE_DIR}/src")
    target_compile_options(dk_media_controller_test PRIVATE -Wall -Wextra -Werror)
    add_test(NAME dk_media_controller_core COMMAND dk_media_controller_test)
endif()
