import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../shared/widgets/async_value_widget.dart';

class _DashboardData {
  const _DashboardData({
    required this.caJour,
    required this.orEnCours,
    required this.facturesNonSoldees,
    required this.articlesStockBas,
  });
  final double caJour;
  final int orEnCours;
  final int facturesNonSoldees;
  final int articlesStockBas;
}

final dashboardProvider =
    FutureProvider.autoDispose<_DashboardData>((ref) async {
  final api = ref.watch(apiClientProvider);
  final data = await api.get<Map<String, dynamic>>(
    '/api/stats/recap-journee',
    fromJson: (d) => d as Map<String, dynamic>,
  );
  return _DashboardData(
    caJour: (data['caJour'] as num?)?.toDouble() ?? 0,
    orEnCours: (data['orEnCours'] as int?) ?? 0,
    facturesNonSoldees: (data['facturesNonSoldees'] as int?) ?? 0,
    articlesStockBas: (data['articlesStockBas'] as int?) ?? 0,
  );
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final dashboard = ref.watch(dashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tableau de bord'),
        actions: [
          IconButton(
            icon: const Badge(
              label: Text('3'),
              child: Icon(Icons.notifications_outlined, color: Colors.white),
            ),
            onPressed: () {},
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(dashboardProvider.future),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Greeting
              Text(
                'Bonjour ${user?.firstName ?? ''} 👋',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              Text(
                formatDate(DateTime.now()),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.outline,
                    ),
              ),
              const SizedBox(height: 24),

              // Stats
              dashboard.when(
                loading: () => const LoadingWidget(),
                error: (e, _) =>
                    ErrorStateWidget(exception: e, onRetry: () => ref.refresh(dashboardProvider)),
                data: (data) => Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: _StatCard(
                            label: "CA du jour",
                            value: formatDZD(data.caJour),
                            icon: Icons.payments_outlined,
                            color: Colors.green,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _StatCard(
                            label: "OR en cours",
                            value: '${data.orEnCours}',
                            icon: Icons.build_outlined,
                            color: Colors.blue,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _StatCard(
                            label: "Factures en attente",
                            value: '${data.facturesNonSoldees}',
                            icon: Icons.receipt_long_outlined,
                            color: Colors.orange,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _StatCard(
                            label: "Stock bas",
                            value: '${data.articlesStockBas}',
                            icon: Icons.inventory_2_outlined,
                            color: data.articlesStockBas > 0
                                ? Colors.red
                                : Colors.green,
                            badge: data.articlesStockBas > 0,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Quick actions
              Text('Accès rapide',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      )),
              const SizedBox(height: 12),
              Row(
                children: [
                  _QuickAction(
                    icon: Icons.list_alt,
                    label: 'Atelier',
                    onTap: () => context.go('/admin/file-attente'),
                  ),
                  const SizedBox(width: 12),
                  _QuickAction(
                    icon: Icons.receipt_long,
                    label: 'Facturation',
                    onTap: () => context.go('/admin/facturation'),
                  ),
                  const SizedBox(width: 12),
                  _QuickAction(
                    icon: Icons.people,
                    label: 'Clients',
                    onTap: () => context.go('/admin/clients'),
                  ),
                  const SizedBox(width: 12),
                  _QuickAction(
                    icon: Icons.inventory_2,
                    label: 'Stock',
                    onTap: () => context.go('/admin/stock'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    this.badge = false,
  });
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final bool badge;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 20),
                const Spacer(),
                if (badge)
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            Text(label,
                style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            border: Border.all(
                color: Theme.of(context).colorScheme.outline.withOpacity(0.3)),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              Icon(icon,
                  color: Theme.of(context).colorScheme.primary),
              const SizedBox(height: 4),
              Text(label,
                  style: Theme.of(context).textTheme.labelSmall,
                  textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    );
  }
}
