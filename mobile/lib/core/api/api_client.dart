import 'package:dio/dio.dart';
import 'package:pretty_dio_logger/pretty_dio_logger.dart';
import '../config/app_config.dart';
import '../errors/app_exception.dart';
import 'auth_interceptor.dart';

class ApiClient {
  ApiClient({required AuthInterceptor authInterceptor}) {
    _dio = Dio(BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.addAll([
      authInterceptor,
      if (AppConfig.isDebug) PrettyDioLogger(requestBody: true),
    ]);
  }

  late final Dio _dio;

  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParams,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await _dio.get(path, queryParameters: queryParams);
      return fromJson != null ? fromJson(response.data) : response.data as T;
    } on DioException catch (e) {
      throw _mapError(e);
    }
  }

  Future<T> post<T>(
    String path, {
    dynamic body,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await _dio.post(path, data: body);
      if (fromJson != null && response.data != null) {
        return fromJson(response.data);
      }
      return response.data as T;
    } on DioException catch (e) {
      throw _mapError(e);
    }
  }

  Future<T> patch<T>(
    String path, {
    dynamic body,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await _dio.patch(path, data: body);
      if (fromJson != null && response.data != null) {
        return fromJson(response.data);
      }
      return response.data as T;
    } on DioException catch (e) {
      throw _mapError(e);
    }
  }

  Future<void> delete(String path) async {
    try {
      await _dio.delete(path);
    } on DioException catch (e) {
      throw _mapError(e);
    }
  }

  Future<Response> getRaw(String path, {Map<String, dynamic>? queryParams}) =>
      _dio.get(path, queryParameters: queryParams);

  Dio get dio => _dio;

  AppException _mapError(DioException e) {
    final statusCode = e.response?.statusCode;
    final data = e.response?.data;

    return switch (statusCode) {
      400 => ValidationException(
          _parseValidationErrors(data),
        ),
      401 => const UnauthorizedException(),
      404 => NotFoundException(
          data?['title']?.toString() ?? 'Ressource',
        ),
      409 => ConflictException(
          data?['detail']?.toString() ?? 'Conflit détecté',
        ),
      500 => ServerException(
          data?['detail']?.toString() ?? 'Erreur serveur',
        ),
      _ => NetworkException(
          e.type == DioExceptionType.connectionTimeout
              ? 'Délai de connexion dépassé'
              : e.message ?? 'Erreur réseau',
        ),
    };
  }

  Map<String, List<String>> _parseValidationErrors(dynamic data) {
    if (data == null) return {};
    try {
      final errors = data['errors'] as Map<String, dynamic>?;
      if (errors == null) return {};
      return errors.map(
        (key, value) => MapEntry(key, List<String>.from(value as List)),
      );
    } catch (_) {
      return {};
    }
  }
}
