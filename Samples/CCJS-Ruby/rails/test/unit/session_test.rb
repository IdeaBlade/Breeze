require 'test_helper'

class SessionTest < ActiveSupport::TestCase

  test 'has attributes' do
    session = sessions(:keynote)
    assert(session.title == 'Keynote')
    assert(session.code == 'KEY01')
    assert(session.level == 'Beginner')
    assert(session.tags == 'Keynote')
    assert(session.description == 'Change the World')
  end

  test 'belongs to speaker' do
    session = sessions(:keynote)
    speaker = people(:landon)
    assert(session.speaker.class.name == 'Person')
    assert(session.speaker == speaker)
  end

  test 'belongs to room' do
    session = sessions(:keynote)
    room = rooms(:surf)
    assert(session.room.class.name == 'Room')
    assert(session.room == room)
  end

  test 'belongs to time slot' do
    session = sessions(:keynote)
    time_slot = time_slots(:one)
    assert(session.time_slot.class.name == 'TimeSlot')
    assert(session.time_slot == time_slot)
  end

  test 'belongs to track' do
    session = sessions(:keynote)
    track = tracks(:windows)
    assert(session.track.class.name == 'Track')
    assert(session.track == track)
  end

  test 'has many attendances' do
    session = sessions(:keynote)
    attendance = attendances(:one)
    assert(session.attendances.first.class.name == 'Attendance')
    assert(session.attendances.first == attendance)
  end

end
