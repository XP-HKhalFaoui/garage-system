import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../core/auth/auth_service.dart';
import '../../core/auth/token_storage.dart';
import '../../core/api/auth_interceptor.dart';
import '../../core/api/api_client.dart';
import '../../shared/models/user_model.dart';
import '../../core/config/app_config.dart';

class AuthState {
  const AuthState({
    this.isAuthenticated = false,
    this.user,
    this.isLoading = false,
    this.error,
  });

  final bool isAuthenticated;
  final UserModel? user;
  final bool isLoading;
  final String? error;

  AuthState copyWith({
    bool? isAuthenticated,
    UserModel? user,
    bool? isLoading,
    String? error,
  }) =>
      AuthState(
        isAuthenticated: isAuthenticated ?? this.isAuthenticated,
        user: user ?? this.user,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

final tokenStorageProvider = Provider<TokenStorage>((_) => TokenStorage());

final _rawDioProvider = Provider<Dio>((_) => Dio(BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    )));

final authServiceProvider = Provider<AuthService>((ref) {
  final tokenStorage = ref.watch(tokenStorageProvider);
  final dio = ref.watch(_rawDioProvider);
  return AuthService(dio: dio, tokenStorage: tokenStorage);
});

final authInterceptorProvider = Provider<AuthInterceptor>((ref) {
  final authService = ref.watch(authServiceProvider);
  return AuthInterceptor(authService: authService);
});

final apiClientProvider = Provider<ApiClient>((ref) {
  final interceptor = ref.watch(authInterceptorProvider);
  return ApiClient(authInterceptor: interceptor);
});

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._authService) : super(const AuthState());

  final AuthService _authService;

  // ── Normal login ───────────────────────────────────────────────────────────
  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final result = await _authService.login(email, password);
      state = AuthState(isAuthenticated: true, user: result.user);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
        isAuthenticated: false,
      );
      rethrow;
    }
  }

  // ── Biometric login ────────────────────────────────────────────────────────
  /// Returns true if biometric auth succeeded and user is now authenticated.
  Future<bool> biometricLogin() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final result = await _authService.loginWithBiometric();
      if (result == null) {
        state = state.copyWith(isLoading: false);
        return false;
      }
      state = AuthState(isAuthenticated: true, user: result.user);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  Future<void> logout() async {
    // 1. Flip state immediately → RouterNotifier fires → GoRouter goes to /login.
    //    The user sees the login screen with zero delay.
    state = const AuthState();
    // 2. Clear tokens + fire-and-forget server revocation (non-blocking).
    await _authService.logout();
  }

  // ── Auto-login on app start ────────────────────────────────────────────────
  /// Tries to restore the session from the stored refresh token.
  /// On network errors: keeps the user in loading state and retries gracefully.
  /// Only logs out (clears tokens) on explicit auth failures (401/403).
  Future<void> tryAutoLogin() async {
    state = state.copyWith(isLoading: true);
    try {
      final refreshed = await _authService.refreshIfNeeded();
      if (refreshed) {
        final user = await _authService.getCurrentUser();
        state = AuthState(isAuthenticated: true, user: user);
      } else {
        // refreshIfNeeded returns false but may have kept the token intact
        // (network error). Set unauthenticated but don't clear anything.
        state = const AuthState();
      }
    } catch (_) {
      // Don't clear tokens — the error might be transient.
      state = const AuthState();
    }
  }

  // ── Biometric helpers ──────────────────────────────────────────────────────
  Future<bool> isBiometricAvailable() => _authService.isBiometricAvailable();
  Future<bool> isBiometricEnabled()   => _authService.isBiometricEnabled();
  Future<void> enableBiometric(String email, String password) =>
      _authService.enableBiometric(email, password);
  Future<void> disableBiometric() => _authService.disableBiometric();
}

final authProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final authService = ref.watch(authServiceProvider);
  return AuthNotifier(authService);
});
