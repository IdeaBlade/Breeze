# TimeSlot Class
#
# Time Slot active record model
class TimeSlot < ActiveRecord::Base

  # Associations
  has_many :sessions
end
