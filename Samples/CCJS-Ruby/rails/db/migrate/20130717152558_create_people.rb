class CreatePeople < ActiveRecord::Migration
  def change
    create_table :people do |t|
      t.string :first_name
      t.string :last_name
      t.string :email
      t.string :blog
      t.string :twitter
      t.string :gender
      t.string :image_source
      t.text   :bio
    end
  end
end
