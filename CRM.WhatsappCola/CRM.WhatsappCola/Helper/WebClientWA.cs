using System.Net;

namespace CRM.WhatsappCola.Helper
{
    public class WebClientWA : WebClient
    {
        protected override WebRequest GetWebRequest(Uri uri)
        {
            WebRequest w = base.GetWebRequest(uri);
            w.Timeout = Int32.MaxValue;
            return w;
        }
    }
}
