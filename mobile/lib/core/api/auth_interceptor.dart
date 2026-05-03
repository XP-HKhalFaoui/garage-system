import 'package:dio/dio.dart';
import '../auth/auth_service.dart';

class AuthInterceptor extends Interceptor {
  AuthInterceptor({required this.authService});

  final AuthService authService;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    // Requests marked as skipAuthInterceptor handle their own auth header.
    if (options.extra['skipAuthInterceptor'] == true) {
      handler.next(options);
      return;
    }
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
    // Don't try to refresh for requests that opted out.
    if (err.requestOptions.extra['skipAuthInterceptor'] == true) {
      handler.next(err);
      return;
    }

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
