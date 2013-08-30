require 'test_helper'

class PersonTest < ActiveSupport::TestCase

  test 'has attributes' do
    person = people(:landon)
    assert(person.first_name == 'Landon')
    assert(person.last_name == 'Papa')
    assert(person.email == 'landon@contoso.com')
    assert(person.blog == 'http://johnpapa.net')
    assert(person.twitter == 'landonpapa')
    assert(person.gender == 'M')
    assert(person.image_source == 'felix_fanboi.jpg')
    assert(person.bio == 'Fellow nor girls have way')
  end

  test 'has many sessions' do
    person = people(:landon)
    session = sessions(:keynote)
    assert(person.sessions.first.class.name == 'Session')
    assert(person.sessions.first == session)
  end

  test 'has many attendances' do
    person = people(:landon)
    attendance = attendances(:one)
    assert(person.attendances.first.class.name == 'Attendance')
    assert(person.attendances.first == attendance)
  end

end
