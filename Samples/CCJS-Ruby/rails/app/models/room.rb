# Room Class
#
# Room active record model
class Room < ActiveRecord::Base

  # Associations
  has_many :sessions
end
