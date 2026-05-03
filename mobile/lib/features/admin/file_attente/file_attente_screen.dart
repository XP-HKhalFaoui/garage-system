import 'dart:async';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../../shared/models/ordre_reparation.dart';
import '../../../core/api/endpoints.dart';
import '../../../core/api/signalr_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/widgets/async_value_widget.dart';

// ── Techniciens provider ──────────────────────────────────────────────────────

class _TechnicienItem {
  const _TechnicienItem({required this.id, required this.nom, required this.prenom});
  final String id;
  final String nom;
  final String prenom;
  String get displayName => '$prenom $nom'.trim();
  String get initiales =>
      '${prenom.isNotEmpty ? prenom[0] : ''}${nom.isNotEmpty ? nom[0] : ''}'.toUpperCase();
}

final techniciensProvider = FutureProvider.autoDispose<List<_TechnicienItem>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.get<dynamic>(
    Endpoints.employes,
    queryParams: {'poste': 'Technicien', 'actif': true, 'pageSize': 100},
    fromJson: (d) => d,
  );
  List<dynamic> list;
  if (response is List) {
    list = response;
  } else if (response is Map) {
    final raw = response['items'] ?? response['data'] ?? [];
    list = raw is List ? raw : [];
  } else {
    list = [];
  }
  return list.map((e) {
    final m = Map<String, dynamic>.from(e as Map);
    return _TechnicienItem(
      id: (m['id'] ?? '').toString(),
      nom: (m['nom'] ?? '').toString(),
      prenom: (m['prénom'] ?? m['prenom'] ?? '').toString(),
    );
  }).toList();
});

// ── Provider ──────────────────────────────────────────────────────────────────

final fileAttenteProvider =
    FutureProvider.autoDispose<List<OrdreReparation>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.get<dynamic>(
    Endpoints.ordresReparation,
    queryParams: {'actif': true},
    fromJson: (d) => d,
  );

  List<dynamic> list;
  if (response is List) {
    list = response;
  } else if (response is Map) {
    final raw = response['items'] ?? response['data'] ?? response['results'] ?? [];
    list = raw is List ? raw : [];
  } else {
    list = [];
  }

  return list.map((e) => OrdreReparation.fromJson(e as Map)).toList();
});

// ── Kanban column config ──────────────────────────────────────────────────────

class _KanbanColumn {
  const _KanbanColumn(this.statut, this.label, this.color, this.icon);
  final ORStatut statut;
  final String label;
  final Color color;
  final IconData icon;
}

const _columns = [
  _KanbanColumn(ORStatut.enAttente,         'En attente', AppColors.statusEnAttente, Icons.hourglass_empty_rounded),
  _KanbanColumn(ORStatut.enCours,           'En cours',   AppColors.statusEnCours,   Icons.build_circle_rounded),
  _KanbanColumn(ORStatut.termineTechnicien, 'Terminé',    AppColors.statusTermine,   Icons.check_circle_rounded),
  _KanbanColumn(ORStatut.suspendu,          'Suspendu',   AppColors.statusSuspendu,  Icons.pause_circle_rounded),
];

// ── Screen ────────────────────────────────────────────────────────────────────

class FileAttenteScreen extends ConsumerStatefulWidget {
  const FileAttenteScreen({super.key});

  @override
  ConsumerState<FileAttenteScreen> createState() => _FileAttenteScreenState();
}

class _FileAttenteScreenState extends ConsumerState<FileAttenteScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: _columns.length + 1, vsync: this); // +1 for "Tous"

    _refreshTimer = Timer.periodic(const Duration(seconds: 60), (_) {
      ref.invalidate(fileAttenteProvider);
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final signalR = ref.read(signalRProvider);
      signalR.orStatusStream.listen((event) {
        ref.invalidate(fileAttenteProvider);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('OR ${event.orId} → ${event.nouveauStatut}'),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.primary,
          ));
        }
      });
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ors = ref.watch(fileAttenteProvider);

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(
        children: [
          // ── Header ──────────────────────────────────────────────────────
          _AtelierHeader(ors: ors),

          // ── Tab bar ──────────────────────────────────────────────────────
          ors.when(
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
            data: (all) => _KanbanTabBar(
              tabCtrl: _tabCtrl,
              all: all,
            ),
          ),

          // ── Tab views ────────────────────────────────────────────────────
          Expanded(
            child: AsyncValueWidget(
              value: ors,
              data: (all) => TabBarView(
                controller: _tabCtrl,
                children: [
                  // Tous
                  _KanbanTabContent(
                    ors: all,
                    onRefresh: () => ref.refresh(fileAttenteProvider.future),
                  ),
                  // Per-status columns
                  ..._columns.map((col) => _KanbanTabContent(
                        ors: all.where((o) => o.statut == col.statut).toList(),
                        onRefresh: () => ref.refresh(fileAttenteProvider.future),
                        emptyLabel: 'Aucun OR ${col.label.toLowerCase()}',
                      )),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Header ────────────────────────────────────────────────────────────────────

class _AtelierHeader extends StatelessWidget {
  const _AtelierHeader({required this.ors});
  final AsyncValue<List<OrdreReparation>> ors;

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    final total = ors.whenOrNull(data: (l) => l.length) ?? 0;
    final enCours = ors.whenOrNull(
            data: (l) => l.where((o) => o.statut == ORStatut.enCours).length) ??
        0;

    return Container(
      decoration: const BoxDecoration(
        gradient: AppGradients.headerSubtle,
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(24),
          bottomRight: Radius.circular(24),
        ),
      ),
      padding: EdgeInsets.fromLTRB(20, top + 12, 20, 16),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Atelier',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  'OR actifs — toutes dates',
                  style: TextStyle(
                      color: Colors.white.withOpacity(0.7), fontSize: 12),
                ),
              ],
            ),
          ),
          // Stats pills
          _HeaderPill(
            label: '$total OR',
            icon: Icons.list_alt_rounded,
            color: Colors.white.withOpacity(0.2),
          ),
          const SizedBox(width: 8),
          _HeaderPill(
            label: '$enCours en cours',
            icon: Icons.build_circle_rounded,
            color: AppColors.statusEnCours.withOpacity(0.25),
          ),
        ],
      ),
    );
  }
}

class _HeaderPill extends StatelessWidget {
  const _HeaderPill({required this.label, required this.icon, required this.color});
  final String label;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: 13),
          const SizedBox(width: 5),
          Text(label,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

class _KanbanTabBar extends StatelessWidget {
  const _KanbanTabBar({required this.tabCtrl, required this.all});
  final TabController tabCtrl;
  final List<OrdreReparation> all;

  int _count(ORStatut? statut) => statut == null
      ? all.length
      : all.where((o) => o.statut == statut).length;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      child: TabBar(
        controller: tabCtrl,
        isScrollable: true,
        tabAlignment: TabAlignment.start,
        labelColor: AppColors.primary,
        unselectedLabelColor: Colors.black45,
        indicatorColor: AppColors.primary,
        indicatorSize: TabBarIndicatorSize.label,
        labelStyle:
            const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        unselectedLabelStyle:
            const TextStyle(fontSize: 13, fontWeight: FontWeight.w400),
        dividerColor: AppColors.border,
        tabs: [
          _CountTab(label: 'Tous', count: _count(null), color: AppColors.primary),
          ..._columns.map((col) => _CountTab(
                label: col.label,
                count: _count(col.statut),
                color: col.color,
              )),
        ],
      ),
    );
  }
}

class _CountTab extends StatelessWidget {
  const _CountTab({required this.label, required this.count, required this.color});
  final String label;
  final int count;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Tab(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label),
          if (count > 0) ...[
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
              decoration: BoxDecoration(
                color: color.withOpacity(0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: color,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ── Tab content ───────────────────────────────────────────────────────────────

class _KanbanTabContent extends StatelessWidget {
  const _KanbanTabContent({
    required this.ors,
    required this.onRefresh,
    this.emptyLabel = 'Aucun ordre de réparation',
  });
  final List<OrdreReparation> ors;
  final Future<void> Function() onRefresh;
  final String emptyLabel;

  @override
  Widget build(BuildContext context) {
    if (ors.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.build_outlined, size: 48, color: Colors.black12),
            const SizedBox(height: 12),
            Text(emptyLabel,
                style: const TextStyle(color: Colors.black38, fontSize: 14)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      color: AppColors.primary,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        itemCount: ors.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) => _ORKanbanCard(
          or_: ors[i],
          onTap: () => _showDetail(context, ors[i]),
        ),
      ),
    );
  }

  void _showDetail(BuildContext context, OrdreReparation or_) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ORDetailSheet(or_: or_),
    );
  }
}

// ── OR Kanban card ────────────────────────────────────────────────────────────

class _ORKanbanCard extends StatelessWidget {
  const _ORKanbanCard({required this.or_, required this.onTap});
  final OrdreReparation or_;
  final VoidCallback onTap;

  Color get _statusColor => switch (or_.statut) {
        ORStatut.enAttente         => AppColors.statusEnAttente,
        ORStatut.enCours           => AppColors.statusEnCours,
        ORStatut.termineTechnicien => AppColors.statusTermine,
        ORStatut.suspendu          => AppColors.statusSuspendu,
        ORStatut.livre             => AppColors.statusLivre,
        ORStatut.annule            => AppColors.statusAnnule,
      };

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
          boxShadow: AppShadows.card,
        ),
        child: IntrinsicHeight(
          child: Row(
            children: [
              // Status stripe
              Container(
                width: 4,
                decoration: BoxDecoration(
                  color: _statusColor,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(16),
                    bottomLeft: Radius.circular(16),
                  ),
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Top row
                      Row(
                        children: [
                          Text(
                            or_.numero,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                          if (or_.priorite == Priorite.urgent) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.urgent.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                'URGENT',
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.urgent,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                          ],
                          const Spacer(),
                          // Status badge
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: _statusColor.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              or_.statut.label,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: _statusColor,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      // Vehicle
                      Row(
                        children: [
                          const Icon(Icons.directions_car_rounded,
                              size: 15, color: Colors.black38),
                          const SizedBox(width: 6),
                          Text(
                            or_.vehicule.immatriculation,
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            or_.vehicule.label,
                            style: const TextStyle(
                                fontSize: 12, color: Colors.black45),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      // Client
                      Row(
                        children: [
                          const Icon(Icons.person_outline_rounded,
                              size: 15, color: Colors.black38),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              or_.client.nom,
                              style: const TextStyle(fontSize: 13),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          // Technicien avatar
                          if (or_.technicien != null)
                            Row(
                              children: [
                                Container(
                                  width: 24,
                                  height: 24,
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withOpacity(0.12),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Center(
                                    child: Text(
                                      or_.technicien!.initiales,
                                      style: const TextStyle(
                                          fontSize: 9,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.primary),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  or_.technicien!.displayName,
                                  style: const TextStyle(
                                      fontSize: 11, color: Colors.black45),
                                ),
                              ],
                            )
                          else
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.orange.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                'Non assigné',
                                style: TextStyle(
                                    fontSize: 10,
                                    color: Colors.orange,
                                    fontWeight: FontWeight.w500),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              // Chevron
              const Padding(
                padding: EdgeInsets.only(right: 8),
                child:
                    Icon(Icons.chevron_right_rounded, color: Colors.black26),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── OR detail sheet ───────────────────────────────────────────────────────────

class _ORDetailSheet extends ConsumerStatefulWidget {
  const _ORDetailSheet({required this.or_});
  final OrdreReparation or_;

  @override
  ConsumerState<_ORDetailSheet> createState() => _ORDetailSheetState();
}

class _ORDetailSheetState extends ConsumerState<_ORDetailSheet> {
  bool _assigning = false;

  Future<void> _assigner(String technicienId) async {
    setState(() => _assigning = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.patch<void>(
        Endpoints.orAssigner(widget.or_.id),
        body: {'technicienId': technicienId},
      );
      ref.invalidate(fileAttenteProvider);
      if (mounted) {
        Navigator.of(context).pop(); // close assign sheet
        Navigator.of(context).pop(); // close detail sheet
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Technicien assigné'),
          backgroundColor: AppColors.success,
          behavior: SnackBarBehavior.floating,
        ));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(e.toString()),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ));
      }
    } finally {
      if (mounted) setState(() => _assigning = false);
    }
  }

  void _showAssignSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AssignTechnicienSheet(onSelect: _assigner),
    );
  }

  @override
  Widget build(BuildContext context) {
    final or_ = widget.or_;
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(
          20, 12, 20, MediaQuery.paddingOf(context).bottom + 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                  color: Colors.black12,
                  borderRadius: BorderRadius.circular(2)),
            ),
          ),
          const SizedBox(height: 16),

          // Header
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(or_.numero,
                        style: Theme.of(context)
                            .textTheme
                            .titleLarge
                            ?.copyWith(color: AppColors.primary)),
                    Text(
                      '${or_.vehicule.immatriculation} · ${or_.vehicule.label}',
                      style: const TextStyle(color: Colors.black45, fontSize: 13),
                    ),
                  ],
                ),
              ),
              if (or_.priorite == Priorite.urgent)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.urgent.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.urgent.withOpacity(0.3)),
                  ),
                  child: const Text('URGENT',
                      style: TextStyle(
                          color: AppColors.urgent,
                          fontSize: 11,
                          fontWeight: FontWeight.w700)),
                ),
            ],
          ),
          const SizedBox(height: 16),

          // Info rows
          _InfoRow(Icons.person_outline_rounded, or_.client.nom),
          if (or_.technicien != null)
            _InfoRow(Icons.engineering_rounded, or_.technicien!.displayName),
          if (or_.diagnostic != null)
            _InfoRow(Icons.notes_rounded, or_.diagnostic!),

          const SizedBox(height: 20),

          // Actions
          if (or_.statut == ORStatut.termineTechnicien)
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.receipt_long_rounded, size: 18),
                label: const Text('Créer la facture'),
              ),
            ),
          if (or_.technicien == null) ...[
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _assigning ? null : _showAssignSheet,
                icon: _assigning
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator.adaptive(strokeWidth: 2),
                      )
                    : const Icon(Icons.person_add_rounded, size: 18),
                label: const Text('Assigner un technicien'),
              ),
            ),
          ] else ...[
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _assigning ? null : _showAssignSheet,
                icon: const Icon(Icons.swap_horiz_rounded, size: 18),
                label: const Text('Changer de technicien'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ── Assign technicien sheet ───────────────────────────────────────────────────

class _AssignTechnicienSheet extends ConsumerWidget {
  const _AssignTechnicienSheet({required this.onSelect});
  final Future<void> Function(String technicienId) onSelect;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final techniciens = ref.watch(techniciensProvider);

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(
          20, 12, 20, MediaQuery.paddingOf(context).bottom + 12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                  color: Colors.black12,
                  borderRadius: BorderRadius.circular(2)),
            ),
          ),
          const SizedBox(height: 16),
          Text('Choisir un technicien',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          techniciens.when(
            loading: () => const Center(
                child: Padding(
              padding: EdgeInsets.all(24),
              child: CircularProgressIndicator.adaptive(),
            )),
            error: (e, _) => Center(
              child: Text('Erreur: $e',
                  style: const TextStyle(color: AppColors.error)),
            ),
            data: (list) {
              if (list.isEmpty) {
                return const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text('Aucun technicien disponible',
                        style: TextStyle(color: Colors.black45)),
                  ),
                );
              }
              return ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: list.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (_, i) {
                  final t = list[i];
                  return ListTile(
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                    leading: CircleAvatar(
                      backgroundColor: AppColors.primary.withOpacity(0.12),
                      child: Text(
                        t.initiales,
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    title: Text(t.displayName,
                        style: const TextStyle(fontWeight: FontWeight.w500)),
                    trailing: const Icon(Icons.chevron_right_rounded,
                        color: Colors.black26),
                    onTap: () => onSelect(t.id),
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow(this.icon, this.text);
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.black38),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text,
                style: const TextStyle(fontSize: 14),
                overflow: TextOverflow.ellipsis),
          ),
        ],
      ),
    );
  }
}
