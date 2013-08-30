# Attendance Class
#
# Attendance active record model
class Attendance < ActiveRecord::Base

  # Associations
  belongs_to :session
  belongs_to :person
end
