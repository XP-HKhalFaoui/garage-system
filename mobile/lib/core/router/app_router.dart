import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../shared/providers/auth_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/api/endpoints.dart';
import '../../core/api/signalr_service.dart';
import '../../shared/widgets/offline_banner.dart';
import '../../features/auth/login/login_screen.dart';
import '../../features/admin/dashboard/dashboard_screen.dart';
import '../../features/admin/facturation/factures_list_screen.dart';
import '../../features/admin/facturation/facture_detail_screen.dart';
import '../../features/admin/clients/clients_list_screen.dart';
import '../../features/admin/clients/client_detail_screen.dart';
import '../../features/admin/stock/stock_screen.dart';
import '../../features/admin/file_attente/file_attente_screen.dart';
import '../../features/admin/profil/profil_screen.dart';
import '../../features/technicien/mes_or/mes_or_screen.dart';
import '../../features/technicien/detail_or/detail_or_screen.dart';
import '../../features/technicien/pieces/consommer_pieces_screen.dart';
import '../../features/technicien/photos/photos_or_screen.dart';

// ── Badge providers ───────────────────────────────────────────────────────────

/// Count of stock critique articles (stockBas=true).
final stockCritiqueCountProvider = FutureProvider.autoDispose<int>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.get<dynamic>(
    Endpoints.articles,
    queryParams: {'stockBas': true, 'pageSize': 1},
    fromJson: (d) => d,
  );
  if (response is Map) {
    final total = response['total'] ?? response['totalCount'] ?? response['count'];
    if (total != null) return (total as num).toInt();
    // Fallback: count items in the response
    final items = response['items'] ?? response['data'] ?? [];
    return (items as List).length;
  }
  return 0;
});

/// Count of new OR events (resets when user navigates to Atelier tab).
final orAlerteCountProvider = StateProvider<int>((ref) => 0);

// ── Router notifier ───────────────────────────────────────────────────────────

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
      final isLoading      = authState.isLoading;
      final isAuthenticated = authState.isAuthenticated;
      final user = authState.user;
      final location = state.matchedLocation;

      // Still restoring session — stay put and wait.
      if (isLoading) return null;

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
        builder: (_, state, child) => AdminShell(child: child),
        routes: [
          GoRoute(path: '/admin/dashboard', builder: (_, __) => const DashboardScreen()),
          GoRoute(
            path: '/admin/facturation',
            builder: (_, __) => const FacturesListScreen(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (_, state) => FactureDetailScreen(id: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(
            path: '/admin/clients',
            builder: (_, __) => const ClientsListScreen(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (_, state) => ClientDetailScreen(id: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(path: '/admin/stock', builder: (_, __) => const StockScreen()),
          GoRoute(path: '/admin/file-attente', builder: (_, __) => const FileAttenteScreen()),
          GoRoute(path: '/admin/profil', builder: (_, __) => const ProfilScreen()),
        ],
      ),
      ShellRoute(
        builder: (_, __, child) => TechnicienShell(child: child),
        routes: [
          GoRoute(path: '/technicien/mes-or', builder: (_, __) => const MesOrScreen()),
          GoRoute(
            path: '/technicien/or/:id',
            builder: (_, state) => DetailOrScreen(id: state.pathParameters['id']!),
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
                  immatriculation: state.uri.queryParameters['immat'] ?? '',
                ),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});

// ── Admin Shell ───────────────────────────────────────────────────────────────

class AdminShell extends ConsumerStatefulWidget {
  const AdminShell({super.key, required this.child});
  final Widget child;

  @override
  ConsumerState<AdminShell> createState() => _AdminShellState();
}

class _AdminShellState extends ConsumerState<AdminShell> {
  static const _destinations = [
    _NavItem('/admin/dashboard',    Icons.dashboard_rounded,          Icons.dashboard_outlined,         'Accueil'),
    _NavItem('/admin/file-attente', Icons.build_circle_rounded,       Icons.build_circle_outlined,      'Atelier'),
    _NavItem('/admin/clients',      Icons.people_alt_rounded,         Icons.people_alt_outlined,        'Clients'),
    _NavItem('/admin/facturation',  Icons.receipt_long_rounded,       Icons.receipt_long_outlined,      'Factures'),
    _NavItem('/admin/stock',        Icons.inventory_2_rounded,        Icons.inventory_2_outlined,       'Stock'),
  ];

  int _selectedIndex(String location) {
    if (location.startsWith('/admin/file-attente')) return 1;
    if (location.startsWith('/admin/clients'))      return 2;
    if (location.startsWith('/admin/facturation'))  return 3;
    if (location.startsWith('/admin/stock'))        return 4;
    return 0;
  }

  @override
  void initState() {
    super.initState();
    // Listen SignalR OR events and increment badge
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final signalR = ref.read(signalRProvider);
      signalR.orStatusStream.listen((event) {
        if (!mounted) return;
        final location = GoRouterState.of(context).matchedLocation;
        if (!location.startsWith('/admin/file-attente')) {
          ref.read(orAlerteCountProvider.notifier).state++;
        }
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final selectedIndex = _selectedIndex(location);
    final user = ref.watch(authProvider).user;
    final isWide = MediaQuery.sizeOf(context).width >= 600;

    // Reset badge when on atelier tab
    if (location.startsWith('/admin/file-attente')) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (ref.read(orAlerteCountProvider) > 0) {
          ref.read(orAlerteCountProvider.notifier).state = 0;
        }
      });
    }

    if (isWide) {
      return _WideLayout(
        destinations: _destinations,
        selectedIndex: selectedIndex,
        user: user,
        onSelect: (i) => context.go(_destinations[i].path),
        ref: ref,
        child: widget.child,
      );
    }

    return Scaffold(
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(child: widget.child),
        ],
      ),
      bottomNavigationBar: _AppNavBar(
        destinations: _destinations,
        selectedIndex: selectedIndex,
        onSelect: (i) => context.go(_destinations[i].path),
        ref: ref,
      ),
    );
  }
}

// ── Wide layout (tablet) — NavigationRail ─────────────────────────────────────

class _WideLayout extends StatelessWidget {
  const _WideLayout({
    required this.child,
    required this.destinations,
    required this.selectedIndex,
    required this.user,
    required this.onSelect,
    required this.ref,
  });
  final Widget child;
  final List<_NavItem> destinations;
  final int selectedIndex;
  final dynamic user;
  final ValueChanged<int> onSelect;
  final WidgetRef ref;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: Row(
        children: [
          NavigationRail(
            backgroundColor: Colors.white,
            selectedIndex: selectedIndex,
            onDestinationSelected: onSelect,
            labelType: NavigationRailLabelType.all,
            useIndicator: true,
            indicatorColor: AppColors.primary.withOpacity(0.12),
            selectedIconTheme: const IconThemeData(color: AppColors.primary),
            selectedLabelTextStyle: const TextStyle(
              color: AppColors.primary,
              fontWeight: FontWeight.w600,
              fontSize: 11,
            ),
            unselectedLabelTextStyle: const TextStyle(fontSize: 11),
            leading: Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: GestureDetector(
                onTap: () => context.push('/admin/profil'),
                child: Column(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: const BoxDecoration(
                        gradient: AppGradients.header,
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          _initials(user),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      user?.prenom ?? user?.nom ?? '',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),
            ),
            destinations: destinations
                .map((d) => NavigationRailDestination(
                      icon: Icon(d.outlinedIcon),
                      selectedIcon: Icon(d.filledIcon),
                      label: Text(d.label),
                    ))
                .toList(),
          ),
          const VerticalDivider(width: 1),
          Expanded(child: child),
        ],
      ),
          ),
        ],
      ),
    );
  }

  String _initials(dynamic user) {
    if (user == null) return '?';
    final fn = (user.prenom ?? '') as String;
    final ln = (user.nom ?? '') as String;
    if (fn.isEmpty && ln.isEmpty) return '?';
    return '${fn.isNotEmpty ? fn[0] : ''}${ln.isNotEmpty ? ln[0] : ''}'.toUpperCase();
  }
}

// ── Custom bottom nav bar ─────────────────────────────────────────────────────

class _AppNavBar extends StatelessWidget {
  const _AppNavBar({
    required this.destinations,
    required this.selectedIndex,
    required this.onSelect,
    required this.ref,
  });
  final List<_NavItem> destinations;
  final int selectedIndex;
  final ValueChanged<int> onSelect;
  final WidgetRef ref;

  @override
  Widget build(BuildContext context) {
    final orCount = ref.watch(orAlerteCountProvider);
    final stockCount = ref.watch(stockCritiqueCountProvider).whenOrNull(data: (v) => v) ?? 0;

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark
            ? const Color(0xFF1E293B)
            : Colors.white,
        border: Border(
          top: BorderSide(color: AppColors.border, width: 1),
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.06),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 60,
          child: Row(
            children: List.generate(destinations.length, (i) {
              final item = destinations[i];
              final selected = selectedIndex == i;
              // Badge count: index 1 = Atelier, index 4 = Stock
              final badgeCount = i == 1
                  ? orCount
                  : i == 4
                      ? stockCount
                      : 0;
              return Expanded(
                child: _NavBarItem(
                  item: item,
                  selected: selected,
                  badgeCount: badgeCount,
                  onTap: () => onSelect(i),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}

class _NavBarItem extends StatelessWidget {
  const _NavBarItem({
    required this.item,
    required this.selected,
    required this.onTap,
    this.badgeCount = 0,
  });
  final _NavItem item;
  final bool selected;
  final VoidCallback onTap;
  final int badgeCount;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      splashFactory: InkSparkle.splashFactory,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeInOut,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                decoration: BoxDecoration(
                  color: selected ? AppColors.primary.withValues(alpha: 0.10) : Colors.transparent,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Icon(
                  selected ? item.filledIcon : item.outlinedIcon,
                  size: 22,
                  color: selected ? AppColors.primary : Colors.black38,
                ),
              ),
              if (badgeCount > 0)
                Positioned(
                  top: 0,
                  right: 4,
                  child: Container(
                    padding: const EdgeInsets.all(3),
                    decoration: const BoxDecoration(
                      color: AppColors.error,
                      shape: BoxShape.circle,
                    ),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text(
                      badgeCount > 99 ? '99+' : '$badgeCount',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 2),
          AnimatedDefaultTextStyle(
            duration: const Duration(milliseconds: 200),
            style: TextStyle(
              fontSize: 10,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
              color: selected ? AppColors.primary : Colors.black38,
            ),
            child: Text(item.label),
          ),
        ],
      ),
    );
  }
}

// ── Nav item data ─────────────────────────────────────────────────────────────

class _NavItem {
  const _NavItem(this.path, this.filledIcon, this.outlinedIcon, this.label);
  final String path;
  final IconData filledIcon;
  final IconData outlinedIcon;
  final String label;
}

// ── Technicien Shell ──────────────────────────────────────────────────────────

class TechnicienShell extends StatelessWidget {
  const TechnicienShell({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(child: child),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppColors.border)),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF0F172A).withOpacity(0.06),
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: 60,
            child: Row(
              children: [
                _NavBarItem(
                  item: const _NavItem('/technicien/mes-or', Icons.build_circle_rounded, Icons.build_circle_outlined, 'Mes OR'),
                  selected: true,
                  onTap: () => context.go('/technicien/mes-or'),
                ),
                const _NavBarItem(
                  item: _NavItem('', Icons.notifications_rounded, Icons.notifications_outlined, 'Alertes'),
                  selected: false,
                  onTap: _noop,
                ),
                _NavBarItem(
                  item: const _NavItem('', Icons.person_rounded, Icons.person_outline_rounded, 'Profil'),
                  selected: false,
                  onTap: () => context.push('/admin/profil'),
                ),
              ].map((w) => Expanded(child: w)).toList(),
            ),
          ),
        ),
      ),
    );
  }

  static void _noop() {}
}
