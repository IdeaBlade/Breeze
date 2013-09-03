require 'test_helper'

class TrackTest < ActiveSupport::TestCase

  test 'has attributes' do
    track = tracks(:windows)
    assert(track.name == 'Windows 8')
  end

  test 'has many sessions' do
    track = tracks(:windows)
    session = sessions(:keynote)
    assert(track.sessions.first.class.name == 'Session')
    assert(track.sessions.first == session)
  end

end
