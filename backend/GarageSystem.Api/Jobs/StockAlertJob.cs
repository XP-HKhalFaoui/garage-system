using GarageSystem.Api.Services;

namespace GarageSystem.Api.Jobs;

public class StockAlertJob
{
    private readonly StockService _stockService;
    private readonly ILogger<StockAlertJob> _logger;

    public StockAlertJob(StockService stockService, ILogger<StockAlertJob> logger)
    {
        _stockService = stockService;
        _logger       = logger;
    }

    public async Task ExecuteAsync()
    {
        _logger.LogInformation("StockAlertJob démarré à {Time}", DateTime.UtcNow);
        await _stockService.CheckStockAlertsAsync();
        _logger.LogInformation("StockAlertJob terminé");
    }
}
