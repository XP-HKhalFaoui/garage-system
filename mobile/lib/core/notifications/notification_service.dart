import 'dart:convert';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._();
  factory NotificationService() => _instance;
  NotificationService._();

  final _plugin = FlutterLocalNotificationsPlugin();

  Future<void> setup() async {
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    await _plugin.initialize(
      const InitializationSettings(android: android, iOS: ios),
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );
  }

  void _onNotificationTapped(NotificationResponse response) {
    if (response.payload == null) return;
    try {
      final data = jsonDecode(response.payload!) as Map<String, dynamic>;
      // Navigation handled by the app router based on payload type
      final type = data['type'] as String?;
      final id = data['id'] as String?;
      if (type != null && id != null) {
        _pendingNavigation = (type: type, id: id);
      }
    } catch (_) {}
  }

  ({String type, String id})? _pendingNavigation;
  ({String type, String id})? consumePendingNavigation() {
    final nav = _pendingNavigation;
    _pendingNavigation = null;
    return nav;
  }

  Future<void> showORAssigned(String numero, String immat, String orId) async {
    await _plugin.show(
      orId.hashCode,
      'Nouvel OR assigné',
      'OR $numero — $immat vous a été affecté',
      NotificationDetails(
        android: AndroidNotificationDetails(
          'or_channel',
          'Ordres de réparation',
          channelDescription: 'Notifications des ordres de réparation',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: const DarwinNotificationDetails(),
      ),
      payload: jsonEncode({'type': 'or', 'id': orId}),
    );
  }

  Future<void> showStockAlert(String designation, int stock) async {
    await _plugin.show(
      designation.hashCode,
      'Stock bas : $designation',
      'Seulement $stock unité(s) restante(s)',
      NotificationDetails(
        android: AndroidNotificationDetails(
          'stock_channel',
          'Alertes stock',
          importance: Importance.defaultImportance,
        ),
        iOS: const DarwinNotificationDetails(),
      ),
    );
  }

  Future<void> showNewFacture(String numero, String client) async {
    await _plugin.show(
      numero.hashCode,
      'Nouvelle facture à encaisser',
      '$numero — $client',
      NotificationDetails(
        android: AndroidNotificationDetails(
          'facturation_channel',
          'Facturation',
          importance: Importance.defaultImportance,
        ),
        iOS: const DarwinNotificationDetails(),
      ),
    );
  }
}
