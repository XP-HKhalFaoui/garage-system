import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'core/notifications/notification_service.dart';
import 'garage_app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('fr', null);
  await NotificationService().setup();
  runApp(const ProviderScope(child: GarageApp()));
}
