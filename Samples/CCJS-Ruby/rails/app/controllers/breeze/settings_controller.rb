# Settings Controller Class
#
# Manage settings
class Breeze::SettingsController < ApplicationController

  # Metadata information
  def metadata
    render json: SPEAKERS_METADATA
  end

  # Rooms, Tracks and Time Slots information
  def lookups
    @rooms      = Room.all
    @tracks     = Track.all
    @time_slots = TimeSlot.all
  end

end
