require 'test_helper'

class SessionsRoutesTest < ActionController::IntegrationTest
  test 'should route to sessions' do
    assert_routing('/breeze/Sessions', {controller: 'breeze/sessions', action: 'index'})
  end

  test 'should route to session' do
    assert_routing('/breeze/Sessions/1', {controller: 'breeze/sessions', action: 'show', id: '1'})
  end

  test 'should route to create session' do
    assert_routing({path: '/breeze/Sessions', method: 'post'}, {controller: 'breeze/sessions', action: 'create'})
  end

  test 'should route to update session' do
    assert_routing({path: '/breeze/Sessions/1', method: 'put'}, {controller: 'breeze/sessions', action: 'update', id: '1'})
  end

  test 'should route to delete session' do
    assert_routing({path: '/breeze/Sessions/1', method: 'delete'}, {controller: 'breeze/sessions', action: 'destroy', id: '1'})
  end
end
