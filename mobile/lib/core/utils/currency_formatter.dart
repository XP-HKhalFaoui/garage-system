import 'package:intl/intl.dart';

final _dzdFormat = NumberFormat('#,##0', 'fr');

String formatDZD(double amount) => '${_dzdFormat.format(amount)} DA';
String formatDZDCompact(double amount) {
  if (amount >= 1000000) return '${(amount / 1000000).toStringAsFixed(1)}M DA';
  if (amount >= 1000) return '${(amount / 1000).toStringAsFixed(1)}K DA';
  return formatDZD(amount);
}
