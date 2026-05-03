import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Stream of ConnectivityResult — emits on each network change.
final connectivityProvider = StreamProvider<List<ConnectivityResult>>((ref) {
  return Connectivity().onConnectivityChanged;
});

/// Simple bool — true when at least one non-none connection exists.
final isOnlineProvider = Provider<bool>((ref) {
  final result = ref.watch(connectivityProvider);
  return result.whenOrNull(
        data: (results) => results.any((r) => r != ConnectivityResult.none),
      ) ??
      true; // Assume online while loading
});
