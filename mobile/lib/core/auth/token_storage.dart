import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  static const _refreshTokenKey   = 'refresh_token';
  static const _biometricEnabledKey = 'biometric_enabled';
  static const _biometricEmailKey   = 'biometric_email';
  static const _biometricPasswordKey = 'biometric_password';

  final FlutterSecureStorage _storage;

  TokenStorage({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
            );

  // ── Refresh token ────────────────────────────────────────────────────────
  Future<void> saveRefreshToken(String token) =>
      _storage.write(key: _refreshTokenKey, value: token);

  Future<String?> getRefreshToken() =>
      _storage.read(key: _refreshTokenKey);

  Future<void> deleteRefreshToken() =>
      _storage.delete(key: _refreshTokenKey);

  Future<void> deleteAll() => _storage.deleteAll();

  // ── Biometric ────────────────────────────────────────────────────────────
  Future<void> setBiometricEnabled({
    required bool enabled,
    String? email,
    String? password,
  }) async {
    await _storage.write(
      key: _biometricEnabledKey,
      value: enabled ? 'true' : 'false',
    );
    if (enabled && email != null && password != null) {
      await _storage.write(key: _biometricEmailKey,    value: email);
      await _storage.write(key: _biometricPasswordKey, value: password);
    } else if (!enabled) {
      await _storage.delete(key: _biometricEmailKey);
      await _storage.delete(key: _biometricPasswordKey);
    }
  }

  Future<bool> isBiometricEnabled() async {
    final v = await _storage.read(key: _biometricEnabledKey);
    return v == 'true';
  }

  Future<({String email, String password})?> getBiometricCredentials() async {
    final email    = await _storage.read(key: _biometricEmailKey);
    final password = await _storage.read(key: _biometricPasswordKey);
    if (email == null || password == null) return null;
    return (email: email, password: password);
  }
}
