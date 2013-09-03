# Track Class
#
# Track active record model
class Track < ActiveRecord::Base

  # Associations
  has_many :sessions
end
