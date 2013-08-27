class CreateSessions < ActiveRecord::Migration
  def change
    create_table :sessions do |t|
      t.integer :speaker_id
      t.integer :track_id
      t.integer :time_slot_id
      t.integer :room_id
      t.string  :code
      t.string  :title
      t.text    :description
      t.string  :level
      t.text    :tags
    end

    add_index :sessions, :speaker_id
    add_index :sessions, :track_id
    add_index :sessions, :time_slot_id
    add_index :sessions, :room_id
  end
end
