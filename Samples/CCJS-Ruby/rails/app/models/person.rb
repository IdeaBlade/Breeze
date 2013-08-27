# Person Class
#
# Person active record model
class Person < ActiveRecord::Base

  # Associations
  has_many :sessions, foreign_key: :speaker_id
  has_many :attendances
end
