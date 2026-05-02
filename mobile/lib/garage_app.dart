import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/theme/app_theme.dart';
import 'shared/providers/auth_provider.dart';
import 'features/auth/login/login_screen.dart';
import 'features/admin/dashboard/dashboard_screen.dart';
import 'features/admin/facturation/factures_list_screen.dart';
import 'features/admin/facturation/facture_detail_screen.dart';
import 'features/admin/clients/clients_list_screen.dart';
import 'features/admin/clients/client_detail_screen.dart';
import 'features/admin/stock/stock_screen.dart';
import 'features/admin/file_attente/file_attente_screen.dart';
import 'features/technicien/mes_or/mes_or_screen.dart';
import 'features/technicien/detail_or/detail_or_screen.dart';
import 'features/technicien/pieces/consommer_pieces_screen.dart';
import 'features/technicien/photos/photos_or_screen.dart';

class RouterNotifier extends ChangeNotifier {
  final Ref _ref;

  RouterNotifier(this._ref) {
    _ref.listen(authProvider, (_, __) => notifyListeners());
  }
}

final routerNotifierProvider = Provider((ref) => RouterNotifier(ref));

final routerProvider = Provider<GoRouter>((ref) {
  final notifier = ref.watch(routerNotifierProvider);

  return GoRouter(
    initialLocation: '/login',
    refreshListenable: notifier,
    redirect: (context, state) {
      final authState = ref.read(authProvider);
      final isAuthenticated = authState.isAuthenticated;
      final user = authState.user;
      final location = state.matchedLocation;

      if (!isAuthenticated) {
        return location == '/login' ? null : '/login';
      }

      if (location == '/login' || location == '/') {
        return (user?.isAdmin ?? false) ? '/admin/dashboard' : '/technicien/mes-or';
      }

      if (user != null) {
        if (location.startsWith('/admin') && user.isTechnicien && !user.isAdmin) {
          return '/technicien/mes-or';
        }
        if (location.startsWith('/technicien') && user.isAdmin) {
          return '/admin/dashboard';
        }
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (_, __) => const LoginScreen(),
      ),
      ShellRoute(
        builder: (_, __, child) => AdminShell(child: child),
        routes: [
          GoRoute(
            path: '/admin/dashboard',
            builder: (_, __) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/admin/facturation',
            builder: (_, __) => const FacturesListScreen(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (_, state) =>
                    FactureDetailScreen(id: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(
            path: '/admin/clients',
            builder: (_, __) => const ClientsListScreen(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (_, state) =>
                    ClientDetailScreen(id: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(
            path: '/admin/stock',
            builder: (_, __) => const StockScreen(),
          ),
          GoRoute(
            path: '/admin/file-attente',
            builder: (_, __) => const FileAttenteScreen(),
          ),
        ],
      ),
      ShellRoute(
        builder: (_, __, child) => TechnicienShell(child: child),
        routes: [
          GoRoute(
            path: '/technicien/mes-or',
            builder: (_, __) => const MesOrScreen(),
          ),
          GoRoute(
            path: '/technicien/or/:id',
            builder: (_, state) =>
                DetailOrScreen(id: state.pathParameters['id']!),
            routes: [
              GoRoute(
                path: 'pieces',
                builder: (_, state) => ConsommerPiecesScreen(
                  orId: state.pathParameters['id']!,
                  orNumero: state.uri.queryParameters['numero'] ?? '',
                ),
              ),
              GoRoute(
                path: 'photos',
                builder: (_, state) => PhotosOrScreen(
                  orId: state.pathParameters['id']!,
                  immatriculation:
                      state.uri.queryParameters['immat'] ?? '',
                ),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});

class GarageApp extends ConsumerWidget {
  const GarageApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Garage System',
      theme: appTheme,
      darkTheme: appDarkTheme,
      themeMode: ThemeMode.system,
      routerConfig: router,
      locale: const Locale('fr'),
      supportedLocales: const [Locale('fr'), Locale('ar')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      debugShowCheckedModeBanner: false,
    );
  }
}

class AdminShell extends StatelessWidget {
  final Widget child;
  const AdminShell({super.key, required this.child});
  @override Widget build(BuildContext context) => Scaffold(body: child);
}
class TechnicienShell extends StatelessWidget {
  final Widget child;
  const TechnicienShell({super.key, required this.child});
  @override Widget build(BuildContext context) => Scaffold(body: child);
}
