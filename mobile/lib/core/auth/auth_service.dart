import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:local_auth/local_auth.dart';
import '../api/endpoints.dart';
import '../errors/app_exception.dart';
import 'token_storage.dart';
import '../../shared/models/user_model.dart';

class AuthResult {
  const AuthResult({required this.user, required this.accessToken});
  final UserModel user;
  final String accessToken;
}

class AuthService {
  AuthService({required Dio dio, required TokenStorage tokenStorage})
      : _dio = dio,
        _tokenStorage = tokenStorage;

  final Dio _dio;
  final TokenStorage _tokenStorage;
  final LocalAuthentication _localAuth = LocalAuthentication();

  String? _accessToken;
  String? get accessToken => _accessToken;

  // ── Login ─────────────────────────────────────────────────────────────────
  Future<AuthResult> login(String email, String password) async {
    try {
      final response = await _dio.post(Endpoints.login, data: {
        'email': email,
        'password': password,
      });
      final data = response.data as Map<String, dynamic>;
      _accessToken = data['accessToken'] as String;
      await _tokenStorage.saveRefreshToken(data['refreshToken'] as String);

      UserModel user;
      if (data.containsKey('user') && data['user'] != null) {
        user = UserModel.fromJson(data['user'] as Map<String, dynamic>);
      } else {
        user = await getCurrentUser();
      }
      return AuthResult(user: user, accessToken: _accessToken!);
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  /// Clears local state immediately (fast), then revokes the server token
  /// in the background — never blocks the caller waiting for the network.
  Future<void> logout() async {
    final refreshToken  = await _tokenStorage.getRefreshToken();
    final savedAccess   = _accessToken;

    // 1. Clear local state right away — this is what matters for the UI.
    _accessToken = null;
    await _tokenStorage.deleteRefreshToken();

    // 2. Fire-and-forget: tell the server to revoke the token.
    //    We don't await — a slow/unreachable server must never block logout.
    if (refreshToken != null && savedAccess != null) {
      _revokeOnServer(refreshToken, savedAccess);
    }
  }

  void _revokeOnServer(String refreshToken, String accessToken) {
    _dio
        .post(
          Endpoints.logout,
          data: {'refreshToken': refreshToken},
          options: Options(
            headers: {'Authorization': 'Bearer $accessToken'},
            extra: {'skipAuthInterceptor': true},
            sendTimeout:    const Duration(seconds: 5),
            receiveTimeout: const Duration(seconds: 5),
          ),
        )
        .ignore(); // result is discarded intentionally
  }

  // ── Refresh ───────────────────────────────────────────────────────────────
  /// Returns true if a valid access token is now available.
  /// ONLY clears the stored token on explicit 401/403 (revoked/expired).
  /// Network errors keep the token so the user stays "logged in".
  Future<bool> refreshIfNeeded() async {
    if (_accessToken != null && !_isTokenExpiringSoon(_accessToken!)) {
      return true;
    }
    final refreshToken = await _tokenStorage.getRefreshToken();
    if (refreshToken == null) return false;

    try {
      final response = await _dio.post(
        Endpoints.refresh,
        data: {'refreshToken': refreshToken},
        options: Options(extra: {'skipAuthInterceptor': true}),
      );
      final data = response.data as Map<String, dynamic>;
      _accessToken = data['accessToken'] as String;
      await _tokenStorage.saveRefreshToken(data['refreshToken'] as String);
      return true;
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      if (status == 401 || status == 403) {
        // Token explicitly rejected by the server — clear it.
        _accessToken = null;
        await _tokenStorage.deleteRefreshToken();
      }
      // Any other error (network, timeout) — keep the token, let caller retry.
      return false;
    } catch (_) {
      return false;
    }
  }

  // ── Current user ──────────────────────────────────────────────────────────
  Future<UserModel> getCurrentUser() async {
    try {
      final response = await _dio.get(
        Endpoints.me,
        options: Options(headers: {
          if (_accessToken != null) 'Authorization': 'Bearer $_accessToken',
        }),
      );
      return UserModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  // ── Biometric ─────────────────────────────────────────────────────────────
  Future<bool> isBiometricAvailable() async {
    try {
      final canCheck   = await _localAuth.canCheckBiometrics;
      final isSupported = await _localAuth.isDeviceSupported();
      return canCheck && isSupported;
    } catch (_) {
      return false;
    }
  }

  Future<bool> isBiometricEnabled() => _tokenStorage.isBiometricEnabled();

  Future<void> enableBiometric(String email, String password) =>
      _tokenStorage.setBiometricEnabled(
        enabled: true,
        email: email,
        password: password,
      );

  Future<void> disableBiometric() =>
      _tokenStorage.setBiometricEnabled(enabled: false);

  Future<AuthResult?> loginWithBiometric() async {
    final available = await isBiometricAvailable();
    if (!available) return null;

    final creds = await _tokenStorage.getBiometricCredentials();
    if (creds == null) return null;

    final authenticated = await _localAuth.authenticate(
      localizedReason: 'Identifiez-vous pour accéder à Garage System',
      options: const AuthenticationOptions(
        // ignore: avoid_redundant_argument_values
        biometricOnly: false,
        stickyAuth: true,
      ),
    );
    if (!authenticated) return null;

    return login(creds.email, creds.password);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  bool _isTokenExpiringSoon(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return true;
      final payload = jsonDecode(
        utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))),
      ) as Map<String, dynamic>;
      final exp    = payload['exp'] as int;
      final expiry = DateTime.fromMillisecondsSinceEpoch(exp * 1000);
      return expiry.difference(DateTime.now()).inMinutes < 2;
    } catch (_) {
      return true;
    }
  }

  AppException _handleDioError(DioException e) {
    return switch (e.response?.statusCode) {
      400 => ValidationException({}),
      401 => const UnauthorizedException(),
      404 => const NotFoundException('Ressource'),
      409 => ConflictException(e.response?.data?['detail'] ?? 'Conflit'),
      500 => const ServerException(),
      _   => NetworkException(e.message ?? 'Erreur réseau'),
    };
  }
}
