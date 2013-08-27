require 'test_helper'

class Breeze::SessionsControllerTest < ActionController::TestCase

  def setup
    @session = sessions(:keynote)
    @session_attr = {speaker_id: 1, track_id: 1, time_slot_id: 1, room_id: 1, code: 'JVS307', title: 'SPA JumpStart', description: 'Build end-to-end SPA solutions including code structure', level: 'Beginner', tags: 'JavaScript|Knockout|MVVM|HTML5|Web'}
  end

  test 'should get sessions' do
    get :index
    assert_response :success

    sessions = assigns(:sessions)
    assert_not_nil(sessions)
    assert(sessions.include?(@session))
  end

  test 'should get session' do
    get :show, id: @session.id
    assert_response :success
    assert_not_nil(assigns(:session))
  end

  test 'should create session' do
    assert_difference('Session.count', 1) do
      post :create, session: @session_attr
    end
    assert_response :success
  end

  test 'should update session' do
    put :update, id: @session.id, session: {title: 'New Keynote'}
    assert_response :success
  end

  test 'should destroy session' do
    assert_difference('Session.count', -1) do
      delete :destroy, id: @session.id
    end
    assert_response :success
  end

end
