require 'test_helper'

class Breeze::SettingsControllerTest < ActionController::TestCase

  test 'should get metadata' do
    get :metadata
    assert_response :success
  end

  test 'should get lookups' do
    get :lookups
    assert_response :success

    rooms = assigns(:rooms)
    assert_not_nil(rooms)
    assert(rooms.include?(rooms(:surf)))

    tracks = assigns(:tracks)
    assert_not_nil(tracks)
    assert(tracks.include?(tracks(:windows)))

    time_slots = assigns(:time_slots)
    assert_not_nil(time_slots)
    assert(time_slots.include?(time_slots(:one)))
  end

end
