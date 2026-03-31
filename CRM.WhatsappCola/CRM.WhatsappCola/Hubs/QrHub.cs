using Microsoft.AspNetCore.SignalR;

namespace CRM.WhatsappCola.Hubs
{
    public class QrHub : Hub
    {
        public async Task NotificarQr(string payload)
        {
            await Clients.Others.SendAsync("NuevoQr", payload);
        }

        public async Task NotificarNumero(string payload)
        {
            await Clients.Others.SendAsync("NuevoNumero", payload);
        }
    }
}
