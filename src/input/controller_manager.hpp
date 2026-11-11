#pragma once
#include <cstdint>
#include <string>
#include <vector>
namespace dkmedia::input {
enum class Context { Ui, Player, Games, DroneFlight };
enum class Action { Up, Down, Left, Right, Select, Back, Previous, Next, PlayPause, SeekBackward, SeekForward };
struct Event { Action action; bool pressed; std::uint32_t device; };
struct Mapping {
    int select=0, back=1, previous=4, next=5, play_pause=9;
    int axis_x=0, axis_y=1;
    int dpad_x=6, dpad_y=7;
    int deadzone=16000;
};
struct Device { std::string path; std::string name; std::uint32_t id=0; };
class ControllerManager {
public:
    ControllerManager();
    ~ControllerManager();
    ControllerManager(const ControllerManager&)=delete;
    ControllerManager& operator=(const ControllerManager&)=delete;
    // Poll on UI thread; never forwards events into the emulator or aircraft.
    std::vector<Event> poll();
    void set_context(Context context) noexcept;
    Context context() const noexcept;
    void set_enabled(bool enabled) noexcept;
    bool enabled() const noexcept;
    void set_mapping(const Mapping& mapping) noexcept;
    const Mapping& mapping() const noexcept;
    std::vector<Device> devices() const;
    void rescan();
private:
    struct Handle;
    std::vector<Handle*> handles_;
    Context context_=Context::Ui;
    Mapping mapping_{};
    bool enabled_=true;
    std::uint32_t next_id_=1;
    void close_all() noexcept;
};
const char* action_name(Action action) noexcept;
} // namespace dkmedia::input
