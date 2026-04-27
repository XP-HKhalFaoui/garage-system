using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace GarageSystem.Api.Hubs;

[Authorize]
public class OrdresHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "atelier");
        await base.OnConnectedAsync();
    }
}
