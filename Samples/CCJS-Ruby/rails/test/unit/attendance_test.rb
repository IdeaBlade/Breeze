require 'test_helper'

class AttendanceTest < ActiveSupport::TestCase

  test 'has attributes' do
    attendance = attendances(:one)
    assert(attendance.rating == 1)
    assert(attendance.text == 'Attendance')
  end

  test 'belongs to session' do
    attendance = attendances(:one)
    session = sessions(:keynote)
    assert(attendance.session.class.name == 'Session')
    assert(attendance.session == session)
  end

  test 'belongs to speaker' do
    attendance = attendances(:one)
    person = people(:landon)
    assert(attendance.person.class.name == 'Person')
    assert(attendance.person == person)
  end

end
