import 'package:intl/intl.dart';

final _dateFormat = DateFormat('dd/MM/yyyy', 'fr');
final _dateTimeFormat = DateFormat('dd/MM/yyyy HH:mm', 'fr');
final _timeFormat = DateFormat('HH:mm', 'fr');

String formatDate(DateTime date) => _dateFormat.format(date);
String formatDateTime(DateTime date) => _dateTimeFormat.format(date);
String formatTime(DateTime date) => _timeFormat.format(date);

String formatRelative(DateTime date) {
  final now = DateTime.now();
  final diff = now.difference(date);
  if (diff.inMinutes < 1) return 'À l\'instant';
  if (diff.inMinutes < 60) return 'Il y a ${diff.inMinutes} min';
  if (diff.inHours < 24) return 'Il y a ${diff.inHours}h';
  return formatDate(date);
}
