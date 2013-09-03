id = 0
node('$id') { id += 1 }
node('$type') { 'CodeCamper.Lookups, CCJS.Model' }
child(@rooms, object_root: false) do
  node('$id') { id += 1 }
  node('$type') { 'CodeCamper.Room, CCJS.Model' }
  attributes :id, :name
end
child(@tracks, object_root: false) do
  node('$id') { id += 1 }
  node('$type') { 'CodeCamper.Track, CCJS.Model' }
  attributes :id, :name
end
child(@time_slots, object_root: false) do
  node('$id') { id += 1 }
  node('$type') { 'CodeCamper.TimeSlot, CCJS.Model' }
  attributes :id, :start, :duration, :is_session_slot
end
