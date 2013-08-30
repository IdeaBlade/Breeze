require 'test_helper'

class TimeSlotTest < ActiveSupport::TestCase

  test 'has attributes' do
    time_slot = time_slots(:one)
    assert(time_slot.start == '2014-03-29 08:00:00.000')
    assert(time_slot.duration == 45)
    assert(time_slot.is_session_slot == false)
  end

  test 'has many sessions' do
    time_slot = time_slots(:one)
    session = sessions(:keynote)
    assert(time_slot.sessions.first.class.name == 'Session')
    assert(time_slot.sessions.first == session)
  end

end
