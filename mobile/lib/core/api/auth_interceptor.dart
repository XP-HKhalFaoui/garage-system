import 'package:dio/dio.dart';
import '../auth/auth_service.dart';

class AuthInterceptor extends Interceptor {
  AuthInterceptor({required this.authService});

  final AuthService authService;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = authService.accessToken;
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode == 401) {
      final refreshed = await authService.refreshIfNeeded();
      if (refreshed) {
        final opts = err.requestOptions;
        opts.headers['Authorization'] = 'Bearer ${authService.accessToken}';
        try {
          final response = await Dio().fetch(opts);
          return handler.resolve(response);
        } catch (e) {
          return handler.next(err);
        }
      }
    }
    handler.next(err);
  }
}
