# Speakers Controller Class
#
# Manage speakers
class Breeze::SpeakersController < ApplicationController

  # Speakers list
  def index
    order  = get_order('first_name')
    @attributes = get_selected_attributes('Person')
    @type = params['$select'] ? 'CodeCamper.SpeakerPartials, CCJS.Model' : 'CodeCamper.Speakers, CCJS.Model'
    @speakers = Person.joins(:sessions).select('DISTINCT people.*').order(order)
  end

end
