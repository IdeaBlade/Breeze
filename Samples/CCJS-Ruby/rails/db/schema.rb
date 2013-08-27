# encoding: UTF-8
# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended to check this file into your version control system.

ActiveRecord::Schema.define(:version => 20130723173528) do

  create_table "attendances", :force => true do |t|
    t.integer "session_id"
    t.integer "person_id"
    t.integer "rating"
    t.text    "text"
  end

  add_index "attendances", ["person_id"], :name => "index_attendances_on_person_id"
  add_index "attendances", ["session_id"], :name => "index_attendances_on_session_id"

  create_table "people", :force => true do |t|
    t.string "first_name"
    t.string "last_name"
    t.string "email"
    t.string "blog"
    t.string "twitter"
    t.string "gender"
    t.string "image_source"
    t.text   "bio"
  end

  create_table "rooms", :force => true do |t|
    t.string "name"
  end

  create_table "sessions", :force => true do |t|
    t.integer "speaker_id"
    t.integer "track_id"
    t.integer "time_slot_id"
    t.integer "room_id"
    t.string  "code"
    t.string  "title"
    t.text    "description"
    t.string  "level"
    t.text    "tags"
  end

  add_index "sessions", ["room_id"], :name => "index_sessions_on_room_id"
  add_index "sessions", ["speaker_id"], :name => "index_sessions_on_speaker_id"
  add_index "sessions", ["time_slot_id"], :name => "index_sessions_on_time_slot_id"
  add_index "sessions", ["track_id"], :name => "index_sessions_on_track_id"

  create_table "time_slots", :force => true do |t|
    t.datetime "start"
    t.integer  "duration"
    t.boolean  "is_session_slot", :default => false, :null => false
  end

  create_table "tracks", :force => true do |t|
    t.string "name"
  end

end
