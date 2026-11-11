#include "input/controller_manager.hpp"
#include <cassert>
#include <iostream>
int main(){
  using namespace dkmedia::input;
  ControllerManager manager;
  assert(manager.context()==Context::Ui);
  manager.set_context(Context::Games);
  assert(manager.context()==Context::Games);
  manager.set_context(Context::DroneFlight);
  assert(manager.context()==Context::DroneFlight);
  manager.set_enabled(false);
  assert(!manager.enabled());
  Mapping mapping;
  mapping.deadzone=99999;
  manager.set_mapping(mapping);
  assert(manager.mapping().deadzone==30000);
  mapping.deadzone=-2;
  manager.set_mapping(mapping);
  assert(manager.mapping().deadzone==4000);
  assert(std::string(action_name(Action::PlayPause))=="play-pause");
  for(const auto& device:manager.devices())assert(!device.path.empty());
  const auto events=manager.poll();
  assert(events.empty());
  std::cout<<"controller core smoke checks passed\n";
}
