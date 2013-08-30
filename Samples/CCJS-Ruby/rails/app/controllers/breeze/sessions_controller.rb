# Sessions Controller Class
#
# Manage sessions
class Breeze::SessionsController < ApplicationController

  # Sessions list
  def index
    order  = get_order('time_slot_id')
    @attributes = get_selected_attributes('Session')
    @type = params['$select'] ? 'CodeCamper.SessionPartials, CCJS.Model' : 'CodeCamper.Sessions, CCJS.Model'
    @sessions = Session.joins('INNER JOIN people AS speakers ON sessions.speaker_id = speakers.id').select('DISTINCT sessions.*').order(order)
  end

  # Sessions details
  def show
    @session = Session.find(params[:id])
  end

  # Create session
  def create
    @session = Session.create(params[:session])
  end

  # Update session
  def update
    @session = Session.update(params[:id], params[:session])
  end

  # Delete session
  def destroy
    Session.destroy(params[:id])
    render(json: {}, :nothing => true, :status => :no_content)
  end

end
