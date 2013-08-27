require 'test_helper'

class SpeakersRoutesTest < ActionController::IntegrationTest
  test 'should route to speakers' do
    assert_routing('/breeze/Speakers', {controller: 'breeze/speakers', action: 'index'})
  end
end
