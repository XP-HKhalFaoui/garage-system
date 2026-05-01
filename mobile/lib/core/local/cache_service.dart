import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../shared/models/ordre_reparation.dart';
import 'app_database.dart';

class CacheService {
  CacheService(this._db);
  final AppDatabase _db;

  Future<void> saveOrs(List<OrdreReparation> ors) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    await _db.batch((batch) {
      for (final or_ in ors) {
        batch.insert(
          _db.cachedOrs,
          CachedOrsCompanion.insert(
            id: or_.id,
            json: jsonEncode({'id': or_.id, 'numero': or_.numero}),
            updatedAt: now,
          ),
          mode: InsertMode.insertOrReplace,
        );
      }
    });
  }

  Future<List<Map<String, dynamic>>> getOrs() async {
    final rows = await _db.select(_db.cachedOrs).get();
    return rows
        .map((r) => jsonDecode(r.json) as Map<String, dynamic>)
        .toList();
  }

  Future<void> savePendingUpload(String type, Map<String, dynamic> payload) async {
    await _db.into(_db.pendingUploads).insert(PendingUploadsCompanion.insert(
      id: '${DateTime.now().millisecondsSinceEpoch}',
      type: type,
      payload: jsonEncode(payload),
      createdAt: DateTime.now().millisecondsSinceEpoch,
    ));
  }

  Future<void> processPendingUploads(
      Future<void> Function(String type, Map<String, dynamic> payload) upload) async {
    final connectivity = await Connectivity().checkConnectivity();
    if (connectivity == ConnectivityResult.none) return;

    final pending = await _db.select(_db.pendingUploads).get();
    for (final row in pending) {
      try {
        final payload = jsonDecode(row.payload) as Map<String, dynamic>;
        await upload(row.type, payload);
        await (_db.delete(_db.pendingUploads)
              ..where((t) => t.id.equals(row.id)))
            .go();
      } catch (_) {
        await (_db.update(_db.pendingUploads)
              ..where((t) => t.id.equals(row.id)))
            .write(PendingUploadsCompanion(
              retries: Value(row.retries + 1),
            ));
      }
    }
  }
}

final cacheServiceProvider = Provider<CacheService>((ref) {
  final db = ref.watch(appDatabaseProvider);
  return CacheService(db);
});
