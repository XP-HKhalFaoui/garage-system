import 'dart:math';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../core/api/endpoints.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../shared/models/ordre_reparation.dart';
import '../file_attente/file_attente_screen.dart';

// ── Providers ─────────────────────────────────────────────────────────────────

class _DashboardStats {
  const _DashboardStats({
    required this.caMois,
    required this.orEnCours,
    required this.facturesEnRetard,
    required this.stockBas,
  });
  final double caMois;
  final int orEnCours;
  final int facturesEnRetard;
  final int stockBas;
}

// ── CA semaine provider ───────────────────────────────────────────────────────

class _CaJour {
  const _CaJour(this.date, this.montant);
  final DateTime date;
  final double montant;
}

final caSemaineProvider = FutureProvider.autoDispose<List<_CaJour>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final data = await api.get<dynamic>(
    Endpoints.statsCaSemaine,
    fromJson: (d) => d,
  );
  final list = data as List<dynamic>;
  return list.map((item) {
    final m = Map<String, dynamic>.from(item as Map);
    return _CaJour(
      DateTime.parse((m['date'] ?? m['Date']).toString()),
      ((m['montant'] ?? m['Montant']) as num?)?.toDouble() ?? 0.0,
    );
  }).toList();
});

// ── Dashboard stats provider ──────────────────────────────────────────────────

final dashboardStatsProvider = FutureProvider.autoDispose<_DashboardStats>((ref) async {
  final api = ref.watch(apiClientProvider);
  final data = await api.get<dynamic>(
    Endpoints.statsRecapJournee,
    fromJson: (d) => d,
  );
  final m = Map<String, dynamic>.from(data as Map);
  return _DashboardStats(
    caMois:           (m['caMoisCourant'] ?? m['caJour'] as num?)?.toDouble() ?? 0,
    orEnCours:        (m['nbOREnCours'] ?? m['orEnCours'] as int?) ?? 0,
    facturesEnRetard: (m['nbFacturesEnRetard'] as int?) ?? 0,
    stockBas:         (m['nbArticlesSousMin'] ?? m['articlesSousStock'] as int?) ?? 0,
  );
});

// ── Screen ────────────────────────────────────────────────────────────────────

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final stats = ref.watch(dashboardStatsProvider);
    final ors = ref.watch(fileAttenteProvider);

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(dashboardStatsProvider);
          ref.invalidate(caSemaineProvider);
          ref.invalidate(fileAttenteProvider);
        },
        color: AppColors.primary,
        child: CustomScrollView(
          slivers: [
            // ── Gradient header ──────────────────────────────────────────────
            SliverToBoxAdapter(
              child: _DashboardHeader(user: user, stats: stats),
            ),

            // ── KPI cards ────────────────────────────────────────────────────
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
              sliver: SliverToBoxAdapter(
                child: stats.when(
                  loading: () => const _KpiSkeleton(),
                  error: (_, __) => const SizedBox.shrink(),
                  data: (s) => _KpiGrid(stats: s),
                ),
              ),
            ),

            // ── CA semaine chart ─────────────────────────────────────────────
            SliverToBoxAdapter(
              child: _SectionHeader(title: 'CA cette semaine'),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
              sliver: SliverToBoxAdapter(
                child: ref.watch(caSemaineProvider).when(
                  loading: () => const _SkeletonBox(height: 160),
                  error: (_, __) => const SizedBox.shrink(),
                  data: (data) => _CaChart(data: data),
                ),
              ),
            ),

            // ── Atelier du jour ──────────────────────────────────────────────
            SliverToBoxAdapter(
              child: _SectionHeader(
                title: 'Atelier du jour',
                actionLabel: 'Tout voir',
                onAction: () => context.go('/admin/file-attente'),
              ),
            ),
            SliverToBoxAdapter(
              child: SizedBox(
                height: 140,
                child: ors.when(
                  loading: () => const Center(child: CircularProgressIndicator.adaptive()),
                  error: (_, __) => const SizedBox.shrink(),
                  data: (list) {
                    final active = list
                        .where((o) =>
                            o.statut == ORStatut.enCours ||
                            o.statut == ORStatut.enAttente)
                        .take(10)
                        .toList();
                    if (active.isEmpty) {
                      return const Center(
                        child: Text('Aucun OR actif aujourd\'hui',
                            style: TextStyle(color: Colors.black38)),
                      );
                    }
                    return ListView.separated(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: active.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 10),
                      itemBuilder: (_, i) => _ORMiniCard(or_: active[i]),
                    );
                  },
                ),
              ),
            ),

            // ── Accès rapide ─────────────────────────────────────────────────
            SliverToBoxAdapter(
              child: _SectionHeader(title: 'Accès rapide'),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
              sliver: SliverToBoxAdapter(
                child: _QuickActions(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Gradient header ───────────────────────────────────────────────────────────

class _DashboardHeader extends StatelessWidget {
  const _DashboardHeader({required this.user, required this.stats});
  final dynamic user;
  final AsyncValue<_DashboardStats> stats;

  String get _greeting {
    final h = DateTime.now().hour;
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    return Container(
      decoration: const BoxDecoration(
        gradient: AppGradients.headerSubtle,
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(28),
          bottomRight: Radius.circular(28),
        ),
      ),
      padding: EdgeInsets.fromLTRB(20, top + 16, 20, 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top row
          Row(
            children: [
              // Avatar — tap → Profil
              GestureDetector(
                onTap: () => context.push('/admin/profil'),
                child: Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white30, width: 1.5),
                  ),
                  child: Center(
                    child: Text(
                      _initials(user),
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$_greeting, ${user?.prenom ?? user?.nom ?? 'Administrateur'} 👋',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      formatDate(DateTime.now()),
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.7),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              // Notification bell
              Stack(
                children: [
                  IconButton(
                    onPressed: () {},
                    icon: const Icon(Icons.notifications_outlined,
                        color: Colors.white, size: 24),
                  ),
                  Positioned(
                    right: 8,
                    top: 8,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: AppColors.accent,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),

          // Alert pill
          stats.whenOrNull(
            data: (s) => s.stockBas > 0
                ? Padding(
                    padding: const EdgeInsets.only(top: 14),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.urgent.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                            color: AppColors.urgent.withOpacity(0.4)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.warning_amber_rounded,
                              color: Colors.white70, size: 14),
                          const SizedBox(width: 6),
                          Text(
                            '${s.stockBas} article(s) en stock critique',
                            style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 12,
                                fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                    ),
                  )
                : null,
          ) ?? const SizedBox.shrink(),
        ],
      ),
    );
  }

  String _initials(dynamic user) {
    if (user == null) return 'A';
    final fn = (user.prenom ?? '') as String;
    final ln = (user.nom ?? '') as String;
    if (fn.isEmpty && ln.isEmpty) return 'A';
    return '${fn.isNotEmpty ? fn[0] : ''}${ln.isNotEmpty ? ln[0] : ''}'.toUpperCase();
  }
}

// ── KPI Grid ──────────────────────────────────────────────────────────────────

class _KpiGrid extends StatelessWidget {
  const _KpiGrid({required this.stats});
  final _DashboardStats stats;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 20, bottom: 8),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _KpiCard(
                  label: 'CA du mois',
                  value: formatDZD(stats.caMois),
                  icon: Icons.payments_rounded,
                  iconColor: AppColors.success,
                  trend: '+12%',
                  trendUp: true,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _KpiCard(
                  label: 'OR en cours',
                  value: '${stats.orEnCours}',
                  icon: Icons.build_circle_rounded,
                  iconColor: AppColors.info,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _KpiCard(
                  label: 'Factures en retard',
                  value: '${stats.facturesEnRetard}',
                  icon: Icons.receipt_long_rounded,
                  iconColor: AppColors.warning,
                  alert: stats.facturesEnRetard > 0,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _KpiCard(
                  label: 'Stock critique',
                  value: '${stats.stockBas}',
                  icon: Icons.inventory_2_rounded,
                  iconColor: stats.stockBas > 0 ? AppColors.error : AppColors.success,
                  alert: stats.stockBas > 0,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  const _KpiCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.iconColor,
    this.trend,
    this.trendUp,
    this.alert = false,
  });
  final String label;
  final String value;
  final IconData icon;
  final Color iconColor;
  final String? trend;
  final bool? trendUp;
  final bool alert;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: alert ? iconColor.withOpacity(0.3) : AppColors.border,
        ),
        boxShadow: AppShadows.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: iconColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: iconColor, size: 18),
              ),
              const Spacer(),
              if (trend != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: (trendUp == true ? AppColors.success : AppColors.error)
                        .withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    trend!,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: trendUp == true ? AppColors.success : AppColors.error,
                    ),
                  ),
                ),
              if (alert && trend == null)
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: iconColor,
                    shape: BoxShape.circle,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: alert ? iconColor : null,
                ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.black45,
                ),
          ),
        ],
      ),
    );
  }
}

class _KpiSkeleton extends StatelessWidget {
  const _KpiSkeleton();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 20, bottom: 8),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(child: _SkeletonBox(height: 100)),
              const SizedBox(width: 12),
              Expanded(child: _SkeletonBox(height: 100)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _SkeletonBox(height: 100)),
              const SizedBox(width: 12),
              Expanded(child: _SkeletonBox(height: 100)),
            ],
          ),
        ],
      ),
    );
  }
}

// ── OR mini card (horizontal scroll) ─────────────────────────────────────────

class _ORMiniCard extends StatelessWidget {
  const _ORMiniCard({required this.or_});
  final OrdreReparation or_;

  Color get _statusColor => switch (or_.statut) {
        ORStatut.enAttente => AppColors.statusEnAttente,
        ORStatut.enCours   => AppColors.statusEnCours,
        ORStatut.termineTechnicien => AppColors.statusTermine,
        _ => AppColors.statusAnnule,
      };

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 150,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
        boxShadow: AppShadows.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Status dot + numero
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: _statusColor,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  or_.numero,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            or_.vehicule.immatriculation,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            or_.vehicule.label,
            style: const TextStyle(fontSize: 11, color: Colors.black45),
            overflow: TextOverflow.ellipsis,
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: _statusColor.withOpacity(0.12),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              or_.statut.label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: _statusColor,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Section header ────────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, this.actionLabel, this.onAction});
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
      child: Row(
        children: [
          Text(title,
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700)),
          const Spacer(),
          if (actionLabel != null)
            GestureDetector(
              onTap: onAction,
              child: Text(
                actionLabel!,
                style: const TextStyle(
                  color: AppColors.primary,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ── Quick actions ─────────────────────────────────────────────────────────────

class _QuickActions extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final actions = [
      _QuickActionData(Icons.build_circle_rounded,  'Atelier',    AppColors.statusEnCours,   '/admin/file-attente'),
      _QuickActionData(Icons.people_alt_rounded,    'Clients',    AppColors.statusLivre,     '/admin/clients'),
      _QuickActionData(Icons.receipt_long_rounded,  'Facturation',AppColors.statusEnAttente, '/admin/facturation'),
      _QuickActionData(Icons.inventory_2_rounded,   'Stock',      AppColors.statusTermine,   '/admin/stock'),
    ];

    return GridView.count(
      crossAxisCount: 4,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 8,
      crossAxisSpacing: 8,
      children: actions
          .map((a) => _QuickActionTile(data: a, onTap: () => context.go(a.route)))
          .toList(),
    );
  }
}

class _QuickActionTile extends StatelessWidget {
  const _QuickActionTile({required this.data, required this.onTap});
  final _QuickActionData data;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        decoration: BoxDecoration(
          color: data.color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: data.color.withOpacity(0.2)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(data.icon, color: data.color, size: 26),
            const SizedBox(height: 6),
            Text(
              data.label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: data.color,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickActionData {
  const _QuickActionData(this.icon, this.label, this.color, this.route);
  final IconData icon;
  final String label;
  final Color color;
  final String route;
}

// ── CA semaine chart ──────────────────────────────────────────────────────────

class _CaChart extends StatelessWidget {
  const _CaChart({required this.data});
  final List<_CaJour> data;

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) return const SizedBox.shrink();

    final maxY = data.map((d) => d.montant).reduce(max);
    final effectiveMax = maxY == 0 ? 1000.0 : maxY * 1.25;
    final today = DateTime.now();
    final todayIdx = data.indexWhere((d) =>
        d.date.year == today.year &&
        d.date.month == today.month &&
        d.date.day == today.day);

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: AppShadows.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Total semaine
          Row(
            children: [
              Text(
                formatDZD(data.fold(0.0, (s, d) => s + d.montant)),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 8),
              const Text(
                '7 derniers jours',
                style: TextStyle(fontSize: 12, color: Colors.black38),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 120,
            child: BarChart(
              BarChartData(
                maxY: effectiveMax,
                minY: 0,
                barGroups: data.asMap().entries.map((e) {
                  final isToday = e.key == todayIdx;
                  return BarChartGroupData(
                    x: e.key,
                    barRods: [
                      BarChartRodData(
                        toY: e.value.montant,
                        color: isToday
                            ? AppColors.primary
                            : AppColors.primary.withOpacity(0.35),
                        width: 22,
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(6),
                        ),
                      ),
                    ],
                  );
                }).toList(),
                titlesData: FlTitlesData(
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 24,
                      getTitlesWidget: (value, _) {
                        final idx = value.toInt();
                        if (idx < 0 || idx >= data.length) {
                          return const SizedBox.shrink();
                        }
                        final label = DateFormat('E', 'fr_FR')
                            .format(data[idx].date)
                            .substring(0, 2);
                        final isToday = idx == todayIdx;
                        return Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Text(
                            label,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: isToday
                                  ? FontWeight.w700
                                  : FontWeight.w400,
                              color: isToday
                                  ? AppColors.primary
                                  : Colors.black38,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  leftTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                  topTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                  rightTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                ),
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  horizontalInterval: effectiveMax / 4,
                  getDrawingHorizontalLine: (_) => FlLine(
                    color: Colors.black.withOpacity(0.05),
                    strokeWidth: 1,
                  ),
                ),
                borderData: FlBorderData(show: false),
                barTouchData: BarTouchData(
                  touchTooltipData: BarTouchTooltipData(
                    getTooltipItem: (group, _, rod, __) => BarTooltipItem(
                      formatDZD(rod.toY),
                      const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Skeleton box ──────────────────────────────────────────────────────────────

class _SkeletonBox extends StatelessWidget {
  const _SkeletonBox({required this.height});
  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.06),
        borderRadius: BorderRadius.circular(16),
      ),
    );
  }
}
