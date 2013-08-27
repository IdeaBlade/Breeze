require 'test_helper'

class RoomTest < ActiveSupport::TestCase

  test 'has attributes' do
    room = rooms(:surf)
    assert(room.name == 'Surf')
  end

  test 'has many sessions' do
    room = rooms(:surf)
    session = sessions(:keynote)
    assert(room.sessions.first.class.name == 'Session')
    assert(room.sessions.first == session)
  end

end
