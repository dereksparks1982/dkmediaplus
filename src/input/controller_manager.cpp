#include "controller_manager.hpp"
#include <linux/joystick.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/ioctl.h>
#include <cerrno>
#include <algorithm>
#include <array>
#include <cstring>
#include <string>
#include <vector>
namespace dkmedia::input {
struct ControllerManager::Handle {
    int fd=-1;
    Device device;
    std::array<std::int16_t,16> axes{};
    std::array<bool,16> buttons{};
    std::array<bool,11> actions{};
};
namespace {
constexpr int kMaxDevices=16;
constexpr std::size_t kMaxEventsPerPoll=128;
bool active_axis(int value,int threshold,int direction) {
    return direction<0 ? value<-threshold : value>threshold;
}
std::array<bool,11> snapshot(const std::array<std::int16_t,16>& axes,
                              const std::array<bool,16>& buttons, const Mapping& m) {
    auto axis=[&](int index)->int { return index>=0 && index<16 ? axes[static_cast<std::size_t>(index)] : 0; };
    auto key=[&](int index)->bool { return index>=0 && index<16 && buttons[static_cast<std::size_t>(index)]; };
    // Standard Linux joystick axes are not uniform across hardware.
    // The mapping is intentionally configurable rather than claiming DS5 parity.
    const int x=axis(m.axis_x),y=axis(m.axis_y),dx=axis(m.dpad_x),dy=axis(m.dpad_y);
    return {{
        active_axis(y,m.deadzone,-1)||active_axis(dy,m.deadzone,-1),
        active_axis(y,m.deadzone, 1)||active_axis(dy,m.deadzone, 1),
        active_axis(x,m.deadzone,-1)||active_axis(dx,m.deadzone,-1),
        active_axis(x,m.deadzone, 1)||active_axis(dx,m.deadzone, 1),
        key(m.select),key(m.back),key(m.previous),key(m.next),key(m.play_pause),
        key(m.previous),key(m.next)
    }};
}
}
ControllerManager::ControllerManager(){rescan();}
ControllerManager::~ControllerManager(){close_all();}
void ControllerManager::close_all() noexcept {
    for(auto* h:handles_){if(h->fd>=0)::close(h->fd);delete h;}
    handles_.clear();
}
void ControllerManager::rescan(){
    // Keep existing file descriptors open; do not steal devices from emulators.
    for(int i=0;i<kMaxDevices;++i){
        const std::string path="/dev/input/js"+std::to_string(i);
        if(std::any_of(handles_.begin(),handles_.end(),[&](const Handle* h){return h->device.path==path;})) continue;
        const int fd=::open(path.c_str(),O_RDONLY|O_NONBLOCK|O_CLOEXEC);
        if(fd<0)continue;
        char name[128] = {};
        if(::ioctl(fd,JSIOCGNAME(sizeof(name)),name)<0)std::strncpy(name,"Linux joystick",sizeof(name)-1);
        auto* h=new Handle();
        h->fd=fd;h->device={path,std::string(name),next_id_++};
        handles_.push_back(h);
    }
}
std::vector<Device> ControllerManager::devices()const{
    std::vector<Device> result;
    for(const auto* h:handles_)result.push_back(h->device);
    return result;
}
void ControllerManager::set_context(Context context)noexcept{context_=context;}
Context ControllerManager::context()const noexcept{return context_;}
void ControllerManager::set_enabled(bool enabled)noexcept{enabled_=enabled;}
bool ControllerManager::enabled()const noexcept{return enabled_;}
void ControllerManager::set_mapping(const Mapping& mapping)noexcept{
    mapping_=mapping;mapping_.deadzone=std::clamp(mapping.deadzone,4000,30000);
    for(auto* h:handles_)h->actions.fill(false);
}
const Mapping& ControllerManager::mapping()const noexcept{return mapping_;}
std::vector<Event> ControllerManager::poll(){
    std::vector<Event> events;
    for(auto it=handles_.begin();it!=handles_.end();){
        Handle* h=*it;
        bool disconnected=false;
        for(std::size_t n=0;n<kMaxEventsPerPoll;++n){
            js_event raw{};
            const ssize_t size=::read(h->fd,&raw,sizeof(raw));
            if(size<0){
                if(errno==EINTR)continue;
                if(errno==EAGAIN||errno==EWOULDBLOCK)break;
                disconnected=true;break;
            }
            if(size==0){disconnected=true;break;}
            if(size!=sizeof(raw)){disconnected=true;break;}
            const unsigned char type=raw.type & static_cast<unsigned char>(~JS_EVENT_INIT);
            if(type==JS_EVENT_BUTTON && raw.number<h->buttons.size())h->buttons[raw.number]=raw.value!=0;
            if(type==JS_EVENT_AXIS && raw.number<h->axes.size())h->axes[raw.number]=raw.value;
            const auto now=snapshot(h->axes,h->buttons,mapping_);
            for(std::size_t j=0;j<now.size();++j){
                if(h->actions[j]==now[j])continue;
                h->actions[j]=now[j];
                if(enabled_ && context_!=Context::Games && context_!=Context::DroneFlight)
                    events.push_back({static_cast<Action>(j),now[j],h->device.id});
            }
        }
        if(disconnected){
            // Drop all held buttons on unplug to avoid stuck navigation.
            for(std::size_t j=0;j<h->actions.size();++j)
                if(h->actions[j] && enabled_ && context_!=Context::Games && context_!=Context::DroneFlight)
                    events.push_back({static_cast<Action>(j),false,h->device.id});
            ::close(h->fd);delete h;it=handles_.erase(it);
        }else ++it;
    }
    return events;
}
const char* action_name(Action action)noexcept{
    switch(action){
    case Action::Up:return "up";case Action::Down:return "down";
    case Action::Left:return "left";case Action::Right:return "right";
    case Action::Select:return "select";case Action::Back:return "back";
    case Action::Previous:return "previous";case Action::Next:return "next";
    case Action::PlayPause:return "play-pause";
    case Action::SeekBackward:return "seek-backward";
    case Action::SeekForward:return "seek-forward";
    }
    return "unknown";
}
} // namespace dkmedia::input
