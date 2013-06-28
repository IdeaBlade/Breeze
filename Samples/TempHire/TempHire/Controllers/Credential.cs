using Newtonsoft.Json;

namespace CustomerPortal.Controllers
{
    public class Credential
    {
        [JsonProperty("username")]
        public string Username { get; set; }

        [JsonProperty("password")]
        public string Password { get; set; }
    }
}