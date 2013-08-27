class CreateAttendances < ActiveRecord::Migration
  def change
    create_table :attendances do |t|
      t.integer :session_id
      t.integer :person_id
      t.integer :rating
      t.text    :text
    end

    add_index :attendances, :session_id
    add_index :attendances, :person_id
  end
end
