# Session Class
#
# Session active record model
class Session < ActiveRecord::Base

  # Setup accessible attributes
  attr_accessible :title, :code, :speaker_id, :track_id, :time_slot_id, :room_id, :level, :tags, :description

  # Associations
  belongs_to :speaker, foreign_key: :speaker_id, class_name: 'Person'
  belongs_to :room
  belongs_to :time_slot
  belongs_to :track
  has_many   :attendances
end
