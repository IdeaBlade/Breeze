class CreateTimeSlots < ActiveRecord::Migration
  def change
    create_table :time_slots do |t|
      t.datetime :start
      t.integer  :duration
      t.boolean  :is_session_slot, null: false, default: false
    end
  end
end
