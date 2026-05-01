import 'dart:convert';
import 'package:dio/dio.dart';
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

  String? _accessToken;
  String? get accessToken => _accessToken;

  Future<AuthResult> login(String email, String password) async {
    try {
      final response = await _dio.post(Endpoints.login, data: {
        'email': email,
        'password': password,
      });
      final data = response.data as Map<String, dynamic>;
      _accessToken = data['accessToken'] as String;
      await _tokenStorage.saveRefreshToken(data['refreshToken'] as String);
      final user = UserModel.fromJson(data['user'] as Map<String, dynamic>);
      return AuthResult(user: user, accessToken: _accessToken!);
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<void> logout() async {
    _accessToken = null;
    await _tokenStorage.deleteAll();
  }

  Future<bool> refreshIfNeeded() async {
    if (_accessToken != null && !_isTokenExpiringSoon(_accessToken!)) {
      return true;
    }
    final refreshToken = await _tokenStorage.getRefreshToken();
    if (refreshToken == null) return false;
    try {
      final response = await _dio.post(Endpoints.refresh, data: {
        'refreshToken': refreshToken,
      });
      final data = response.data as Map<String, dynamic>;
      _accessToken = data['accessToken'] as String;
      await _tokenStorage.saveRefreshToken(data['refreshToken'] as String);
      return true;
    } catch (_) {
      await logout();
      return false;
    }
  }

  Future<UserModel> getCurrentUser() async {
    final response = await _dio.get(Endpoints.me);
    return UserModel.fromJson(response.data as Map<String, dynamic>);
  }

  bool _isTokenExpiringSoon(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return true;
      final payload = jsonDecode(
        utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))),
      ) as Map<String, dynamic>;
      final exp = payload['exp'] as int;
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
      _ => NetworkException(e.message ?? 'Erreur réseau'),
    };
  }
}
