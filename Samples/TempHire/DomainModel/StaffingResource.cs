//====================================================================================================================
// Copyright (c) 2013 IdeaBlade
//====================================================================================================================
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE 
// WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS 
// OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR 
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE. 
//====================================================================================================================
// USE OF THIS SOFTWARE IS GOVERENED BY THE LICENSING TERMS WHICH CAN BE FOUND AT
// http://cocktail.ideablade.com/licensing
//====================================================================================================================

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Runtime.Serialization;

namespace DomainModel
{
    [DataContract(IsReference = true)]
    public class StaffingResource : AuditEntityBase
    {
        internal StaffingResource()
        {
        }

        [NotMapped]
        public string FullName
        {
            get
            {
                return !string.IsNullOrWhiteSpace(MiddleName)
                           ? string.Format("{0} {1} {2}", FirstName.Trim(), MiddleName.Trim(), LastName.Trim())
                           : string.Format("{0} {1}", FirstName.Trim(), LastName.Trim());
            }
        }

        /// <summary>Gets or sets the Id. </summary>
        [DataMember]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        [Required]
        public Guid Id { get; internal set; }

        /// <summary>Gets or sets the FirstName. </summary>
        [DataMember]
        [Required]
        public string FirstName { get; set; }

        /// <summary>Gets or sets the MiddleName. </summary>
        [DataMember]
        public string MiddleName { get; set; }

        /// <summary>Gets or sets the LastName. </summary>
        [DataMember]
        [Required]
        public string LastName { get; set; }

        /// <summary>Gets or sets the Summary. </summary>
        [DataMember]
        [Required]
        public string Summary { get; set; }

        /// <summary>Gets the Addresses. </summary>
        [DataMember]
        public ICollection<Address> Addresses { get; internal set; }

        /// <summary>Gets the PhoneNumbers. </summary>
        [DataMember]
        public ICollection<PhoneNumber> PhoneNumbers { get; internal set; }

        /// <summary>Gets the Rates. </summary>
        [DataMember]
        public ICollection<Rate> Rates { get; internal set; }

        /// <summary>Gets the WorkExperience. </summary>
        [DataMember]
        public ICollection<WorkExperienceItem> WorkExperience { get; internal set; }

        /// <summary>Gets the Skills. </summary>
        [DataMember]
        public ICollection<Skill> Skills { get; internal set; }

        /// <summary>Gets or sets the PrimaryAddress. </summary>
        [NotMapped]
        public Address PrimaryAddress
        {
            get { return Addresses.FirstOrDefault(a => a.Primary); }
            set
            {
                if (value.StaffingResource != this)
                    throw new InvalidOperationException("Address is not associated with this StaffingResource.");

                Addresses.Where(a => a.Primary).ForEach(a => a.Primary = false);
                value.Primary = true;
            }
        }

        /// <summary>Gets or sets the PrimaryPhoneNumber. </summary>
        [NotMapped]
        public PhoneNumber PrimaryPhoneNumber
        {
            get { return PhoneNumbers.FirstOrDefault(a => a.Primary); }
            set
            {
                if (value.StaffingResource != this)
                    throw new InvalidOperationException("PhoneNumber is not associated with this StaffingResource.");

                PhoneNumbers.Where(p => p.Primary).ForEach(p => p.Primary = false);
                value.Primary = true;
            }
        }
    }
}