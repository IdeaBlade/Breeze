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
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Runtime.Serialization;

namespace DomainModel
{
    [DataContract(IsReference = true)]
    public class PhoneNumber : AuditEntityBase, IHasRoot
    {
        internal PhoneNumber()
        {
        }

        /// <summary>Gets or sets the Id. </summary>
        [DataMember]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        [Required]
        public Guid Id { get; internal set; }

        /// <summary>Gets or sets the AreaCode. </summary>
        [DataMember]
        [Required]
        [StringLength(3, MinimumLength = 3)]
        public string AreaCode { get; set; }

        /// <summary>Gets or sets the Number. </summary>
        [DataMember]
        [Required]
        [StringLength(8, MinimumLength = 7)]
        public string Number { get; set; }

        /// <summary>Gets or sets the PhoneNumberTypeId. </summary>
        [DataMember]
        [Required]
        public Guid PhoneNumberTypeId { get; set; }

        /// <summary>Gets or sets the StaffingResourceId. </summary>
        [DataMember]
        [Required]
        public Guid StaffingResourceId { get; set; }

        /// <summary>Gets or sets the Primary. </summary>
        [DataMember]
        [Required]
        public bool Primary { get; set; }

        /// <summary>Gets or sets the StaffingResource. </summary>
        [DataMember]
        public StaffingResource StaffingResource { get; set; }

        /// <summary>Gets or sets the PhoneNumberType. </summary>
        [DataMember]
        public PhoneNumberType PhoneNumberType { get; set; }

        #region IHasRoot Members

        public object Root
        {
            get { return StaffingResource; }
        }

        #endregion
    }
}