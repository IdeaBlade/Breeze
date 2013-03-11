using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CodeCamper.Models
{

    #region Attendance
    /// <summary>
    /// A class representing a case of a <see cref="Person"/> attending a <see cref="Session"/>.
    /// A many-to-many link between <see cref="Person"/> and <see cref="Session"/>
    /// with a session evaluation payload.
    /// </summary>
    public class Attendance
    {
        public int PersonId { get; set; }
        public Person Person { get; set; }

        public int SessionId { get; set; }
        public Session Session { get; set; }

        /// <summary>Get and set the person's rating of the session from 1-5 (0=not rated).</summary>
        [Range(0, 5)]
        public int Rating { get; set; }

        /// <summary>Get and set the person's session evaluation text.</summary>
        public string Text { get; set; }
    }
    #endregion

    #region Person

    public class Person
    {
        public Person()
        {
            Gender = " "; // make no assumption
            ImageSource = string.Empty;
        }

        public int Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }
        public string Blog { get; set; }
        public string Twitter { get; set; }

        [StringLength(1, MinimumLength = 1)]
        public string Gender { get; set; }

        public string ImageSource { get; set; }
        public string Bio { get; set; }

        public virtual ICollection<Session> SpeakerSessions { get; set; }
        public virtual ICollection<Attendance> AttendanceList { get; set; }
    }

    #endregion

    #region Room

    public class Room
    {
        public int Id { get; set; }
        public string Name { get; set; }
    }

    #endregion

    #region Session

    public class Session
    {
        public int Id { get; set; }

        [Required, MaxLength(50)]
        public string Title { get; set; }

        public string Code { get; set; }
        public int SpeakerId { get; set; }
        public int TrackId { get; set; }
        public int TimeSlotId { get; set; }
        public int RoomId { get; set; }
        public string Level { get; set; }
        public string Tags { get; set; }
        public string Description { get; set; }

        public virtual Person Speaker { get; set; }
        public virtual Track Track { get; set; }
        public virtual TimeSlot TimeSlot { get; set; }
        public virtual Room Room { get; set; }

        public virtual ICollection<Attendance>
            AttendanceList { get; set; }
    }

    #endregion

    #region TimeSlot

    public class TimeSlot
    {
        public TimeSlot()
        {
            IsSessionSlot = true;
        }

        public int Id { get; set; }
        public DateTime Start { get; set; }
        public bool IsSessionSlot { get; set; }

        /// <summary>Duration of session in minutes.</summary>
        public int Duration { get; set; }
    }

    #endregion

    #region Track

    public class Track
    {
        public int Id { get; set; }
        public string Name { get; set; }
    }

    #endregion

}