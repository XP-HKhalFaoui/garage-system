import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../shared/providers/auth_provider.dart';
import '../../features/auth/login/login_screen.dart';
import '../../features/admin/dashboard/dashboard_screen.dart';
import '../../features/admin/facturation/factures_list_screen.dart';
import '../../features/admin/facturation/facture_detail_screen.dart';
import '../../features/admin/clients/clients_list_screen.dart';
import '../../features/admin/clients/client_detail_screen.dart';
import '../../features/admin/stock/stock_screen.dart';
import '../../features/admin/file_attente/file_attente_screen.dart';
import '../../features/technicien/mes_or/mes_or_screen.dart';
import '../../features/technicien/detail_or/detail_or_screen.dart';
import '../../features/technicien/pieces/consommer_pieces_screen.dart';
import '../../features/technicien/photos/photos_or_screen.dart';

final _adminShellKey = GlobalKey<NavigatorState>(debugLabel: 'admin-shell');
final _techShellKey = GlobalKey<NavigatorState>(debugLabel: 'tech-shell');

GoRouter createRouter(WidgetRef ref) {
  final auth = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final isAuthenticated = auth.isAuthenticated;
      final user = auth.user;
      final location = state.matchedLocation;

      if (!isAuthenticated) {
        return location == '/login' ? null : '/login';
      }

      if (location == '/login' || location == '/') {
        return user!.isAdmin ? '/admin/dashboard' : '/technicien/mes-or';
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

      // Admin shell
      ShellRoute(
        navigatorKey: _adminShellKey,
        builder: (context, state, child) =>
            AdminShell(child: child),
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

      // Technicien shell
      ShellRoute(
        navigatorKey: _techShellKey,
        builder: (context, state, child) =>
            TechnicienShell(child: child),
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
}

class AdminShell extends StatelessWidget {
  const AdminShell({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        onDestinationSelected: (index) {
          switch (index) {
            case 0:
              context.go('/admin/dashboard');
            case 1:
              context.go('/admin/facturation');
            case 2:
              context.go('/admin/clients');
            case 3:
              context.go('/admin/stock');
            case 4:
              context.go('/admin/file-attente');
          }
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Tableau',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'Facturation',
          ),
          NavigationDestination(
            icon: Icon(Icons.people_outlined),
            selectedIcon: Icon(Icons.people),
            label: 'Clients',
          ),
          NavigationDestination(
            icon: Icon(Icons.inventory_2_outlined),
            selectedIcon: Icon(Icons.inventory_2),
            label: 'Stock',
          ),
          NavigationDestination(
            icon: Icon(Icons.list_alt_outlined),
            selectedIcon: Icon(Icons.list_alt),
            label: 'Atelier',
          ),
        ],
      ),
    );
  }
}

class TechnicienShell extends StatelessWidget {
  const TechnicienShell({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.build_outlined),
            selectedIcon: Icon(Icons.build),
            label: 'Mes OR',
          ),
          NavigationDestination(
            icon: Icon(Icons.notifications_outlined),
            selectedIcon: Icon(Icons.notifications),
            label: 'Notifications',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outlined),
            selectedIcon: Icon(Icons.person),
            label: 'Profil',
          ),
        ],
        onDestinationSelected: (index) {
          if (index == 0) context.go('/technicien/mes-or');
        },
      ),
    );
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  // Rebuild router when auth state changes
  ref.watch(authProvider);
  // We need a WidgetRef to use ref.watch inside createRouter
  // Instead, use a simple approach with a refresh listenable
  throw UnimplementedError('Use routerWithRef instead');
});
