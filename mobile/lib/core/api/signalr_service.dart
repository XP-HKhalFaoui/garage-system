import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:signalr_netcore/signalr_client.dart';
import '../config/app_config.dart';
import '../auth/auth_service.dart';
import '../../shared/providers/auth_provider.dart';
import 'endpoints.dart';

class ORStatusEvent {
  const ORStatusEvent({
    required this.orId,
    required this.nouveauStatut,
    required this.technicienId,
  });
  final String orId;
  final String nouveauStatut;
  final String? technicienId;
}

class StockAlertEvent {
  const StockAlertEvent({
    required this.articleId,
    required this.designation,
    required this.stockActuel,
  });
  final String articleId;
  final String designation;
  final int stockActuel;
}

class SignalRService {
  SignalRService(this._authService);

  final AuthService _authService;
  HubConnection? _connection;

  final _orStatusController = StreamController<ORStatusEvent>.broadcast();
  final _stockAlertController = StreamController<StockAlertEvent>.broadcast();

  Stream<ORStatusEvent> get orStatusStream => _orStatusController.stream;
  Stream<StockAlertEvent> get stockAlertStream => _stockAlertController.stream;

  bool get isConnected =>
      _connection?.state == HubConnectionState.Connected;

  Future<void> connect() async {
    final token = _authService.accessToken;
    final url =
        '${AppConfig.apiBaseUrl}${Endpoints.hubOrdres}?access_token=$token';

    _connection = HubConnectionBuilder()
        .withUrl(url)
        .withAutomaticReconnect(retryDelays: [0, 2000, 5000, 10000])
        .build();

    _connection!.on('OR_STATUS_CHANGED', _onStatusChanged);
    _connection!.on('OR_ASSIGNED', _onAssigned);
    _connection!.on('STOCK_ALERT', _onStockAlert);

    _connection!.onreconnected(({connectionId}) {
      // Reconnected — republish state if needed
    });

    try {
      await _connection!.start();
    } catch (_) {
      // Silent — will retry automatically
    }
  }

  Future<void> disconnect() async {
    await _connection?.stop();
    _connection = null;
  }

  void _onStatusChanged(List<Object?>? args) {
    if (args == null || args.isEmpty) return;
    final data = args[0] as Map<String, dynamic>;
    _orStatusController.add(ORStatusEvent(
      orId: data['orId'] as String,
      nouveauStatut: data['nouveauStatut'] as String,
      technicienId: data['technicienId'] as String?,
    ));
  }

  void _onAssigned(List<Object?>? args) {
    if (args == null || args.isEmpty) return;
    final data = args[0] as Map<String, dynamic>;
    _orStatusController.add(ORStatusEvent(
      orId: data['orId'] as String,
      nouveauStatut: 'EnAttente',
      technicienId: data['technicienId'] as String?,
    ));
  }

  void _onStockAlert(List<Object?>? args) {
    if (args == null || args.isEmpty) return;
    final data = args[0] as Map<String, dynamic>;
    _stockAlertController.add(StockAlertEvent(
      articleId: data['articleId'] as String,
      designation: data['designation'] as String,
      stockActuel: (data['stockActuel'] as num).toInt(),
    ));
  }

  void dispose() {
    _orStatusController.close();
    _stockAlertController.close();
    disconnect();
  }
}

final signalRProvider = Provider<SignalRService>((ref) {
  final authService = ref.watch(authServiceProvider);
  final service = SignalRService(authService);

  ref.onDispose(service.dispose);

  // Connect when auth changes to authenticated
  ref.listen(authProvider, (prev, next) {
    if (next.isAuthenticated && !(prev?.isAuthenticated ?? false)) {
      service.connect();
    } else if (!next.isAuthenticated) {
      service.disconnect();
    }
  });

  return service;
});
