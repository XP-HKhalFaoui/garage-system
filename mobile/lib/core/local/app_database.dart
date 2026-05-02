import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

// Run: dart run build_runner build --delete-conflicting-outputs
part 'app_database.g.dart';

class CachedOrs extends Table {
  TextColumn get id => text()();
  TextColumn get json => text()();
  IntColumn get updatedAt => integer()();

  @override
  Set<Column> get primaryKey => {id};
}

class CachedArticles extends Table {
  TextColumn get id => text()();
  TextColumn get json => text()();
  IntColumn get updatedAt => integer()();

  @override
  Set<Column> get primaryKey => {id};
}

class PendingUploads extends Table {
  TextColumn get id => text()();
  TextColumn get type => text()();
  TextColumn get payload => text()();
  IntColumn get createdAt => integer()();
  IntColumn get retries => integer().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {id};
}

@DriftDatabase(tables: [CachedOrs, CachedArticles, PendingUploads])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'garage.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}

final appDatabaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase();
  ref.onDispose(db.close);
  return db;
});
