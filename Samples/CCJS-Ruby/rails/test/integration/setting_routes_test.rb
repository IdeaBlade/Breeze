require 'test_helper'

class SettingsRoutesTest < ActionController::IntegrationTest
  test 'should route to metadata' do
    assert_routing('/breeze/Metadata', {controller: 'breeze/settings', action: 'metadata'})
  end

  test 'should route to lookups' do
    assert_routing('/breeze/Lookups', {controller: 'breeze/settings', action: 'lookups'})
  end
end
