import 'package:flutter_test/flutter_test.dart';
import 'package:garage_app/core/utils/currency_formatter.dart';
import 'package:garage_app/core/utils/date_formatter.dart';

void main() {
  group('formatDZD', () {
    test('formats thousands correctly', () {
      expect(formatDZD(15000), contains('15'));
      expect(formatDZD(15000), contains('DA'));
    });

    test('formatDZDCompact for millions', () {
      expect(formatDZDCompact(1500000), contains('M DA'));
    });

    test('formatDZDCompact for thousands', () {
      expect(formatDZDCompact(5000), contains('K DA'));
    });
  });

  group('formatDate', () {
    test('formats date in dd/MM/yyyy', () {
      final date = DateTime(2024, 1, 15);
      expect(formatDate(date), '15/01/2024');
    });

    test('formatDateTime includes time', () {
      final date = DateTime(2024, 1, 15, 14, 30);
      expect(formatDateTime(date), '15/01/2024 14:30');
    });
  });
}
