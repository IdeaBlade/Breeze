require 'test_helper'

class Breeze::SpeakersControllerTest < ActionController::TestCase

  test 'should get speakers' do
    get :index
    assert_response :success

    speakers = assigns(:speakers)
    assert_not_nil(speakers)
    assert(speakers.include?(people(:landon)))
  end

end
