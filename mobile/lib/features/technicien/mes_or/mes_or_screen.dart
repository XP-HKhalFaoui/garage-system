import 'dart:async';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import '../../../shared/models/ordre_reparation.dart';
import '../../../core/api/endpoints.dart';
import '../../../core/api/signalr_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/widgets/empty_state_widget.dart';
import '../../../shared/widgets/skeleton_widgets.dart';

// ── Providers ──────────────────────────────────────────────────────────────────

final mesOrProvider =
    FutureProvider.autoDispose<List<OrdreReparation>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final user = ref.watch(authProvider).user;
  final data = await api.get<dynamic>(
    Endpoints.ordresReparation,
    queryParams: {
      'actif': true,
      if (user?.employeId != null) 'technicienId': user!.employeId,
    },
    fromJson: (d) => d,
  );
  final list = data is List ? data : (data as Map)['items'] as List? ?? [];
  return list
      .map((e) => OrdreReparation.fromJson(e as Map))
      .toList();
});

// Pointage state
final _isClockedInProvider = StateProvider<bool>((ref) => false);
final _clockInTimeProvider = StateProvider<DateTime?>((ref) => null);

// ── Screen ─────────────────────────────────────────────────────────────────────

class MesOrScreen extends HookConsumerWidget {
  const MesOrScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final ors = ref.watch(mesOrProvider);
    final isClockedIn = ref.watch(_isClockedInProvider);
    final clockInTime = ref.watch(_clockInTimeProvider);

    // Live elapsed time ticker
    final elapsed = useState<Duration>(Duration.zero);
    useEffect(() {
      if (!isClockedIn || clockInTime == null) {
        elapsed.value = Duration.zero;
        return null;
      }
      final timer = Timer.periodic(const Duration(seconds: 1), (_) {
        elapsed.value = DateTime.now().difference(clockInTime);
      });
      return timer.cancel;
    }, [isClockedIn, clockInTime]);

    // Filter state
    final selectedFilter = useState<String>('Tous');

    // Listen SignalR for new assignments
    ref.listen(signalRProvider, (_, signalR) {
      signalR.orStatusStream.listen((event) {
        if (event.technicienId == user?.employeId) {
          ref.invalidate(mesOrProvider);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Nouvel OR assigné : ${event.orId}'),
              backgroundColor: AppColors.primary,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      });
    });

    final prenom = user?.prenom ?? user?.nom ?? 'Technicien';

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(mesOrProvider.future),
        color: AppColors.primary,
        child: CustomScrollView(
          slivers: [
            // ── Header ─────────────────────────────────────────────────────
            SliverToBoxAdapter(
              child: _TechHeader(prenom: prenom),
            ),

            // ── Punch status ────────────────────────────────────────────────
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              sliver: SliverToBoxAdapter(
                child: _PunchCard(
                  isClockedIn: isClockedIn,
                  elapsed: elapsed.value,
                  onToggle: () {
                    if (isClockedIn) {
                      ref.read(_isClockedInProvider.notifier).state = false;
                      ref.read(_clockInTimeProvider.notifier).state = null;
                    } else {
                      ref.read(_isClockedInProvider.notifier).state = true;
                      ref.read(_clockInTimeProvider.notifier).state =
                          DateTime.now();
                    }
                  },
                ),
              ),
            ),

            // ── Tasks summary ───────────────────────────────────────────────
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              sliver: SliverToBoxAdapter(
                child: ors.when(
                  loading: () => SkeletonListView(
                    count: 1,
                    itemBuilder: () => const SkeletonORCard(),
                  ),
                  error: (_, __) => const SizedBox.shrink(),
                  data: (list) => _TasksSummaryCard(ors: list),
                ),
              ),
            ),

            // ── Mes OR ──────────────────────────────────────────────────────
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
              sliver: SliverToBoxAdapter(
                child: Row(
                  children: [
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Mes interventions',
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          Text(
                            'Toutes vos missions assignées',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.black38,
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Filter dropdown
                    _FilterDropdown(
                      value: selectedFilter.value,
                      onChanged: (v) => selectedFilter.value = v,
                    ),
                  ],
                ),
              ),
            ),

            // ── OR groups ───────────────────────────────────────────────────
            ors.when(
              loading: () => SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverList.builder(
                  itemCount: 4,
                  itemBuilder: (_, __) => const Padding(
                    padding: EdgeInsets.only(bottom: 10),
                    child: SkeletonORCard(),
                  ),
                ),
              ),
              error: (e, _) => SliverFillRemaining(
                child: Center(
                  child: Text(
                    'Erreur : $e',
                    style: const TextStyle(color: Colors.red),
                  ),
                ),
              ),
              data: (list) {
                final filtered = _applyFilter(list, selectedFilter.value);
                if (filtered.isEmpty) {
                  return SliverFillRemaining(
                    child: EmptyStateWidget(
                      icon: Icons.handyman_outlined,
                      title: 'Aucune intervention',
                      subtitle: selectedFilter.value == 'Tous'
                          ? 'Vous n\'avez pas d\'OR assigné'
                          : 'Aucun OR dans ce statut',
                      iconColor: AppColors.primary,
                    ),
                  );
                }

                // Group by status category
                final groups = _groupOrs(filtered);
                final entries = groups.entries.toList();

                return SliverPadding(
                  padding:
                      const EdgeInsets.fromLTRB(16, 0, 16, 32),
                  sliver: SliverList.builder(
                    itemCount: entries.length,
                    itemBuilder: (_, i) => _ORGroupRow(
                      group: entries[i],
                      onTap: (or_) =>
                          context.push('/technicien/or/${or_.id}'),
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  List<OrdreReparation> _applyFilter(
      List<OrdreReparation> list, String filter) {
    return switch (filter) {
      'En cours'  => list.where((o) => o.statut == ORStatut.enCours).toList(),
      'En attente'=> list.where((o) => o.statut == ORStatut.enAttente).toList(),
      'Terminés'  => list.where((o) => o.statut == ORStatut.termineTechnicien).toList(),
      _           => list,
    };
  }

  Map<_GroupKey, List<OrdreReparation>> _groupOrs(
      List<OrdreReparation> list) {
    final map = <_GroupKey, List<OrdreReparation>>{};
    for (final key in _GroupKey.values) {
      final items = list.where((o) => key.matches(o)).toList();
      if (items.isNotEmpty) map[key] = items;
    }
    return map;
  }
}

// ── Group key ──────────────────────────────────────────────────────────────────

enum _GroupKey {
  enAttente,
  enCours,
  suspendu,
  termine;

  String get label => switch (this) {
        enAttente => 'En attente',
        enCours   => 'En cours',
        suspendu  => 'Suspendu',
        termine   => 'Terminé',
      };

  IconData get icon => switch (this) {
        enAttente => Icons.hourglass_empty_rounded,
        enCours   => Icons.play_circle_rounded,
        suspendu  => Icons.pause_circle_rounded,
        termine   => Icons.check_circle_rounded,
      };

  Color get color => switch (this) {
        enAttente => AppColors.statusEnAttente,
        enCours   => AppColors.statusEnCours,
        suspendu  => AppColors.statusSuspendu,
        termine   => AppColors.statusTermine,
      };

  bool matches(OrdreReparation o) => switch (this) {
        enAttente => o.statut == ORStatut.enAttente,
        enCours   => o.statut == ORStatut.enCours,
        suspendu  => o.statut == ORStatut.suspendu,
        termine   => o.statut == ORStatut.termineTechnicien,
      };
}

// ── Header ─────────────────────────────────────────────────────────────────────

class _TechHeader extends StatelessWidget {
  const _TechHeader({required this.prenom});
  final String prenom;

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    return Container(
      padding: EdgeInsets.fromLTRB(20, top + 14, 20, 20),
      decoration: const BoxDecoration(
        gradient: AppGradients.header,
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(24),
          bottomRight: Radius.circular(24),
        ),
      ),
      child: Row(
        children: [
          // Avatar
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              shape: BoxShape.circle,
              border:
                  Border.all(color: Colors.white.withValues(alpha: 0.4), width: 1.5),
            ),
            child: Center(
              child: Text(
                prenom.isNotEmpty ? prenom[0].toUpperCase() : 'T',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
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
                  'Bonjour, $prenom 👋',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  'Tableau de bord technicien',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.7),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.notifications_outlined,
                color: Colors.white, size: 22),
            onPressed: () {},
          ),
        ],
      ),
    );
  }
}

// ── Punch card ─────────────────────────────────────────────────────────────────

class _PunchCard extends StatelessWidget {
  const _PunchCard({
    required this.isClockedIn,
    required this.elapsed,
    required this.onToggle,
  });
  final bool isClockedIn;
  final Duration elapsed;
  final VoidCallback onToggle;

  String _fmt(Duration d) {
    final h = d.inHours;
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '${h}h ${m}m ${s}s';
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Status row
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
            boxShadow: AppShadows.card,
          ),
          child: Row(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text(
                        'Statut : ',
                        style: TextStyle(
                            fontSize: 14, color: Colors.black54),
                      ),
                      Text(
                        isClockedIn ? 'EN SERVICE' : 'HORS SERVICE',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: isClockedIn
                              ? AppColors.success
                              : AppColors.error,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Temps : ${_fmt(elapsed)}',
                    style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Colors.black87),
                  ),
                ],
              ),
              const Spacer(),
              GestureDetector(
                onTap: onToggle,
                child: Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: isClockedIn
                        ? AppColors.error
                        : AppColors.success,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isClockedIn
                        ? Icons.logout_rounded
                        : Icons.arrow_forward_rounded,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 10),

        // Clock in/out big button
        GestureDetector(
          onTap: onToggle,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            decoration: BoxDecoration(
              color: isClockedIn
                  ? AppColors.error.withValues(alpha: 0.10)
                  : const Color(0xFFE0F7F4),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isClockedIn
                    ? AppColors.error.withValues(alpha: 0.3)
                    : const Color(0xFF00BFA5).withValues(alpha: 0.3),
              ),
            ),
            child: Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _fmt(elapsed),
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: isClockedIn
                            ? AppColors.error
                            : const Color(0xFF00796B),
                      ),
                    ),
                    Text(
                      isClockedIn
                          ? 'Productivité enregistrée'
                          : 'Aucune session active',
                      style: TextStyle(
                        fontSize: 12,
                        color: isClockedIn
                            ? AppColors.error
                            : const Color(0xFF00796B),
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 20, vertical: 10),
                  decoration: BoxDecoration(
                    color: isClockedIn
                        ? AppColors.error
                        : const Color(0xFF00897B),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Text(
                    isClockedIn ? 'Pointer sortie' : 'Pointer entrée',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// ── Tasks summary card ─────────────────────────────────────────────────────────

class _TasksSummaryCard extends StatelessWidget {
  const _TasksSummaryCard({required this.ors});
  final List<OrdreReparation> ors;

  @override
  Widget build(BuildContext context) {
    final pending = ors
        .where((o) =>
            o.statut == ORStatut.enAttente || o.statut == ORStatut.suspendu)
        .length;
    final inProgress =
        ors.where((o) => o.statut == ORStatut.enCours).length;
    final completed =
        ors.where((o) => o.statut == ORStatut.termineTechnicien).length;
    final total = ors.length;
    final progress = total == 0 ? 0.0 : completed / total;

    return GestureDetector(
      onTap: () {},
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFFFFBE6),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
              color: AppColors.accent.withValues(alpha: 0.3)),
          boxShadow: AppShadows.card,
        ),
        child: Row(
          children: [
            // Circular progress
            SizedBox(
              width: 52,
              height: 52,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  CircularProgressIndicator(
                    value: progress,
                    strokeWidth: 5,
                    backgroundColor:
                        AppColors.accent.withValues(alpha: 0.15),
                    valueColor: const AlwaysStoppedAnimation<Color>(
                        AppColors.accent),
                  ),
                  Text(
                    '${(progress * 100).toInt()}%',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: AppColors.accent,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  RichText(
                    text: TextSpan(
                      style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: Colors.black87),
                      children: [
                        TextSpan(text: '$pending En attente'),
                        const TextSpan(
                            text: '  |  ',
                            style: TextStyle(color: Colors.black38)),
                        TextSpan(
                          text: '$completed Terminé(s)',
                          style: const TextStyle(color: AppColors.success),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    '$inProgress en cours · $total OR total',
                    style: const TextStyle(
                        fontSize: 12, color: Colors.black45),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded,
                color: Colors.black26, size: 20),
          ],
        ),
      ),
    );
  }
}

// ── Filter dropdown ────────────────────────────────────────────────────────────

class _FilterDropdown extends StatelessWidget {
  const _FilterDropdown({required this.value, required this.onChanged});
  final String value;
  final ValueChanged<String> onChanged;


  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () async {
        final result = await showModalBottomSheet<String>(
          context: context,
          backgroundColor: Colors.transparent,
          builder: (_) => _FilterSheet(current: value),
        );
        if (result != null) onChanged(result);
      },
      child: Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.primary.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
              color: AppColors.primary.withValues(alpha: 0.2)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(width: 4),
            const Icon(Icons.keyboard_arrow_down_rounded,
                size: 18, color: AppColors.primary),
          ],
        ),
      ),
    );
  }
}

class _FilterSheet extends StatelessWidget {
  const _FilterSheet({required this.current});
  final String current;

  static const _options = ['Tous', 'En cours', 'En attente', 'Terminés'];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(
          20, 12, 20, MediaQuery.paddingOf(context).bottom + 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
                color: Colors.black12,
                borderRadius: BorderRadius.circular(2)),
          ),
          const SizedBox(height: 16),
          const Text('Filtrer les interventions',
              style:
                  TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          ..._options.map((opt) {
            final selected = opt == current;
            return InkWell(
              onTap: () => Navigator.pop(context, opt),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 13),
                decoration: BoxDecoration(
                  color: selected
                      ? AppColors.primary.withValues(alpha: 0.07)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: selected
                        ? AppColors.primary.withValues(alpha: 0.3)
                        : AppColors.border,
                    width: selected ? 1.5 : 1,
                  ),
                ),
                child: Row(
                  children: [
                    Text(opt,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: selected
                              ? FontWeight.w600
                              : FontWeight.w400,
                          color: selected
                              ? AppColors.primary
                              : Colors.black87,
                        )),
                    const Spacer(),
                    if (selected)
                      const Icon(Icons.check_circle_rounded,
                          color: AppColors.primary, size: 20),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}

// ── OR group row ───────────────────────────────────────────────────────────────

class _ORGroupRow extends StatelessWidget {
  const _ORGroupRow({
    required this.group,
    required this.onTap,
  });
  final MapEntry<_GroupKey, List<OrdreReparation>> group;
  final ValueChanged<OrdreReparation> onTap;

  @override
  Widget build(BuildContext context) {
    final key = group.key;
    final items = group.value;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: () {
          // If single OR → navigate directly
          if (items.length == 1) {
            onTap(items.first);
          } else {
            showModalBottomSheet(
              context: context,
              isScrollControlled: true,
              backgroundColor: Colors.transparent,
              builder: (_) => _ORListSheet(
                  key_: key, ors: items, onTap: onTap),
            );
          }
        },
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
            boxShadow: AppShadows.card,
          ),
          child: Row(
            children: [
              // Icon
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: key.color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(key.icon, color: key.color, size: 20),
              ),
              const SizedBox(width: 14),
              // Label
              Expanded(
                child: Text(
                  key.label,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Colors.black87,
                  ),
                ),
              ),
              // Count badge
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                  color: key.color.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${items.length}',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: key.color,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              const Icon(Icons.chevron_right_rounded,
                  color: Colors.black26, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}

// ── OR list bottom sheet ───────────────────────────────────────────────────────

class _ORListSheet extends StatelessWidget {
  const _ORListSheet(
      {required this.key_, required this.ors, required this.onTap});
  final _GroupKey key_;
  final List<OrdreReparation> ors;
  final ValueChanged<OrdreReparation> onTap;

  Widget _buildTrailing(OrdreReparation or_) {
    if (or_.priorite == Priorite.urgent) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: AppColors.urgent.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(6),
        ),
        child: const Text(
          'URGENT',
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w700,
            color: AppColors.urgent,
          ),
        ),
      );
    }
    return const Icon(Icons.chevron_right_rounded, color: Colors.black26);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(
          0, 12, 0, MediaQuery.paddingOf(context).bottom + 8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
                color: Colors.black12,
                borderRadius: BorderRadius.circular(2)),
          ),
          // Title
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
            child: Row(
              children: [
                Icon(key_.icon, color: key_.color, size: 20),
                const SizedBox(width: 8),
                Text(
                  '${key_.label} (${ors.length})',
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          // List
          ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.sizeOf(context).height * 0.55,
            ),
            child: ListView.separated(
              shrinkWrap: true,
              itemCount: ors.length,
              separatorBuilder: (_, __) =>
                  const Divider(height: 1, indent: 20, endIndent: 20),
              itemBuilder: (_, i) {
                final or_ = ors[i];
                return ListTile(
                  onTap: () {
                    Navigator.pop(context);
                    onTap(or_);
                  },
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                  leading: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: key_.color.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Center(
                      child: Text(
                        or_.vehicule.immatriculation
                            .substring(0, 2)
                            .toUpperCase(),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: key_.color,
                        ),
                      ),
                    ),
                  ),
                  title: Text(
                    or_.vehicule.immatriculation,
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  subtitle: Text(
                    '${or_.numero}  ·  ${or_.client.nom}',
                    style: const TextStyle(fontSize: 12, color: Colors.black45),
                  ),
                  trailing: _buildTrailing(or_),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
