import 'dart:async';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import '../../../shared/models/facture.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../shared/widgets/async_value_widget.dart';
import 'factures_provider.dart';

// ── Filter config ─────────────────────────────────────────────────────────────

class _StatutOption {
  const _StatutOption(this.label, this.key, this.color, this.icon);
  final String label;
  final String? key;
  final Color color;
  final IconData icon;
}

const _statutOptions = [
  _StatutOption('Toutes',          null,                  AppColors.primary,        Icons.receipt_long_rounded),
  _StatutOption('Émises',          'Emise',               AppColors.info,           Icons.send_rounded),
  _StatutOption('Part. payées',    'PartiellementPayee',  AppColors.warning,        Icons.payments_rounded),
  _StatutOption('Soldées',         'Soldee',              AppColors.success,        Icons.check_circle_rounded),
  _StatutOption('En retard',       'EnRetard',            AppColors.error,          Icons.warning_amber_rounded),
];

// ── Screen ────────────────────────────────────────────────────────────────────

class FacturesListScreen extends HookConsumerWidget {
  const FacturesListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedStatut = useState<_StatutOption>(_statutOptions[0]);
    final searchQuery = useState('');
    final searchCtrl = useTextEditingController();
    Timer? debounce;

    final filter = FacturesFilter(
      statut: selectedStatut.value.key,
      search: searchQuery.value.isEmpty ? null : searchQuery.value,
    );
    final factures = ref.watch(facturesProvider(filter));

    // Summary counts
    final counts = factures.whenOrNull(data: (list) {
      return {
        'total':   list.length,
        'retard':  list.where((f) => f.statut == FactureStatut.enRetard).length,
        'emises':  list.where((f) => f.statut == FactureStatut.emise).length,
        'soldees': list.where((f) => f.statut == FactureStatut.soldee).length,
      };
    });

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(
        children: [
          // ── Gradient header ──────────────────────────────────────────────
          _FacturesHeader(
            counts: counts,
            selectedStatut: selectedStatut.value,
            onFilterTap: () => _showFilterSheet(
              context,
              selectedStatut.value,
              (opt) => selectedStatut.value = opt,
            ),
          ),

          // ── Search bar ───────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: TextField(
              controller: searchCtrl,
              decoration: InputDecoration(
                hintText: 'N° facture, client...',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: searchQuery.value.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          searchCtrl.clear();
                          searchQuery.value = '';
                        },
                      )
                    : null,
              ),
              onChanged: (v) {
                debounce?.cancel();
                debounce = Timer(const Duration(milliseconds: 400), () {
                  searchQuery.value = v;
                });
              },
            ),
          ),

          // ── Active filter pill ───────────────────────────────────────────
          if (selectedStatut.value.key != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: selectedStatut.value.color.withOpacity(0.10),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                          color: selectedStatut.value.color.withOpacity(0.3)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(selectedStatut.value.icon,
                            size: 13, color: selectedStatut.value.color),
                        const SizedBox(width: 5),
                        Text(
                          selectedStatut.value.label,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: selectedStatut.value.color,
                          ),
                        ),
                        const SizedBox(width: 6),
                        GestureDetector(
                          onTap: () =>
                              selectedStatut.value = _statutOptions[0],
                          child: Icon(Icons.close_rounded,
                              size: 14,
                              color: selectedStatut.value.color),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  factures.whenOrNull(
                        data: (l) => Text(
                          '${l.length} résultat(s)',
                          style: const TextStyle(
                              fontSize: 12, color: Colors.black38),
                        ),
                      ) ??
                      const SizedBox.shrink(),
                ],
              ),
            ),

          const SizedBox(height: 8),

          // ── List ─────────────────────────────────────────────────────────
          Expanded(
            child: AsyncValueWidget(
              value: factures,
              data: (list) {
                if (list.isEmpty) {
                  return const EmptyStateWidget(
                    title: 'Aucune facture',
                    icon: Icons.receipt_long_outlined,
                  );
                }
                return RefreshIndicator(
                  onRefresh: () =>
                      ref.refresh(facturesProvider(filter).future),
                  color: AppColors.primary,
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                    itemCount: list.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (_, i) => _FactureCard(
                      facture: list[i],
                      onTap: () =>
                          context.push('/admin/facturation/${list[i].id}'),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _showFilterSheet(
    BuildContext context,
    _StatutOption current,
    ValueChanged<_StatutOption> onSelect,
  ) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => _FilterSheet(
        current: current,
        onSelect: (opt) {
          onSelect(opt);
          Navigator.pop(context);
        },
      ),
    );
  }
}

// ── Header ────────────────────────────────────────────────────────────────────

class _FacturesHeader extends StatelessWidget {
  const _FacturesHeader({
    required this.counts,
    required this.selectedStatut,
    required this.onFilterTap,
  });
  final Map<String, int>? counts;
  final _StatutOption selectedStatut;
  final VoidCallback onFilterTap;

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    final hasFilter = selectedStatut.key != null;

    return Container(
      decoration: const BoxDecoration(
        gradient: AppGradients.headerSubtle,
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(24),
          bottomRight: Radius.circular(24),
        ),
      ),
      padding: EdgeInsets.fromLTRB(20, top + 12, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title row
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Facturation',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              // Filter button
              GestureDetector(
                onTap: onFilterTap,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                  decoration: BoxDecoration(
                    color: hasFilter
                        ? Colors.white
                        : Colors.white.withOpacity(0.18),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                        color: hasFilter
                            ? Colors.white
                            : Colors.white.withOpacity(0.3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.filter_list_rounded,
                        size: 16,
                        color: hasFilter ? AppColors.primary : Colors.white,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        hasFilter ? selectedStatut.label : 'Filtrer',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: hasFilter ? AppColors.primary : Colors.white,
                        ),
                      ),
                      if (hasFilter) ...[
                        const SizedBox(width: 4),
                        Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: selectedStatut.color,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),

          // KPI pills
          if (counts != null) ...[
            const SizedBox(height: 14),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _KpiPill('${counts!['total']} factures', Icons.receipt_long_rounded, Colors.white70),
                  const SizedBox(width: 8),
                  if ((counts!['retard'] ?? 0) > 0)
                    _KpiPill('${counts!['retard']} en retard', Icons.warning_amber_rounded, AppColors.error),
                  if ((counts!['retard'] ?? 0) > 0) const SizedBox(width: 8),
                  _KpiPill('${counts!['emises']} émises', Icons.send_rounded, Colors.white60),
                  const SizedBox(width: 8),
                  _KpiPill('${counts!['soldees']} soldées', Icons.check_circle_rounded, AppColors.success),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _KpiPill extends StatelessWidget {
  const _KpiPill(this.label, this.icon, this.color);
  final String label;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 5),
          Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

// ── Filter bottom sheet ───────────────────────────────────────────────────────

class _FilterSheet extends StatelessWidget {
  const _FilterSheet({required this.current, required this.onSelect});
  final _StatutOption current;
  final ValueChanged<_StatutOption> onSelect;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(
          20, 12, 20, MediaQuery.paddingOf(context).bottom + 16),
      child: SingleChildScrollView(
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
            const Text(
              'Filtrer par statut',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 16),
            ..._statutOptions.map((opt) => _FilterOption(
                  option: opt,
                  selected: current.key == opt.key,
                  onTap: () => onSelect(opt),
                )),
          ],
        ),
      ),
    );
  }
}

class _FilterOption extends StatelessWidget {
  const _FilterOption({
    required this.option,
    required this.selected,
    required this.onTap,
  });
  final _StatutOption option;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: selected
              ? option.color.withOpacity(0.08)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected
                ? option.color.withOpacity(0.4)
                : AppColors.border,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: option.color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(option.icon, size: 17, color: option.color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                option.label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight:
                      selected ? FontWeight.w600 : FontWeight.w400,
                  color: selected ? option.color : Colors.black87,
                ),
              ),
            ),
            if (selected)
              Icon(Icons.check_circle_rounded,
                  color: option.color, size: 20),
          ],
        ),
      ),
    );
  }
}

// ── Facture card ──────────────────────────────────────────────────────────────

class _FactureCard extends StatelessWidget {
  const _FactureCard({required this.facture, required this.onTap});
  final Facture facture;
  final VoidCallback onTap;

  Color get _color => switch (facture.statut) {
        FactureStatut.emise             => AppColors.info,
        FactureStatut.partiellementPayee => AppColors.warning,
        FactureStatut.soldee            => AppColors.success,
        FactureStatut.enRetard          => AppColors.error,
      };

  IconData get _icon => switch (facture.statut) {
        FactureStatut.emise             => Icons.send_rounded,
        FactureStatut.partiellementPayee => Icons.payments_rounded,
        FactureStatut.soldee            => Icons.check_circle_rounded,
        FactureStatut.enRetard          => Icons.warning_amber_rounded,
      };

  @override
  Widget build(BuildContext context) {
    final isRetard = facture.statut == FactureStatut.enRetard;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isRetard
                ? AppColors.error.withOpacity(0.35)
                : AppColors.border,
          ),
          boxShadow: AppShadows.card,
        ),
        child: IntrinsicHeight(
          child: Row(
            children: [
              // Left color stripe
              Container(
                width: 4,
                decoration: BoxDecoration(
                  color: _color,
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
                            facture.numero,
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                              color: AppColors.primary,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            formatDate(facture.dateFacture),
                            style: const TextStyle(
                                fontSize: 12, color: Colors.black38),
                          ),
                        ],
                      ),
                      const SizedBox(height: 5),

                      // Client
                      Row(
                        children: [
                          const Icon(Icons.person_outline_rounded,
                              size: 13, color: Colors.black38),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              facture.clientNom,
                              style: const TextStyle(
                                  fontSize: 13, color: Colors.black54),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Amount + status
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Flexible(
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Flexible(
                                  child: Text(
                                    formatDZD(facture.totalTTC),
                                    style: TextStyle(
                                      fontSize: 17,
                                      fontWeight: FontWeight.w700,
                                      color: isRetard ? AppColors.error : Colors.black87,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                if (facture.restantDu > 0 &&
                                    facture.statut != FactureStatut.soldee) ...[
                                  const SizedBox(width: 6),
                                  Flexible(
                                    child: Text(
                                      'Reste ${formatDZD(facture.restantDu)}',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: _color,
                                        fontWeight: FontWeight.w500,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          // Status badge
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 9, vertical: 4),
                            decoration: BoxDecoration(
                              color: _color.withOpacity(0.10),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(_icon, size: 11, color: _color),
                                const SizedBox(width: 4),
                                Text(
                                  facture.statut.label,
                                  style: TextStyle(
                                    color: _color,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const Padding(
                padding: EdgeInsets.only(right: 8),
                child: Icon(Icons.chevron_right_rounded,
                    color: Colors.black26, size: 20),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
