import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';
import '../../../shared/models/facture.dart';
import '../../../core/api/endpoints.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/widgets/async_value_widget.dart';
import 'factures_provider.dart';

// ── Screen ────────────────────────────────────────────────────────────────────

class FactureDetailScreen extends HookConsumerWidget {
  const FactureDetailScreen({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final facture = ref.watch(factureDetailProvider(id));

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: facture.whenOrNull(data: (f) => Text(f.numero)) ??
            const Text('Facture'),
        leading: facture.whenOrNull(
          data: (f) => Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const BackButton(),
              _FactureStatutBadge(statut: f.statut),
            ],
          ),
        ),
        leadingWidth: facture.maybeWhen(data: (_) => 120, orElse: () => null),
        actions: [
          PopupMenuButton<String>(
            onSelected: (v) {
              if (v == 'pdf') _downloadPdf(context, ref);
              if (v == 'annuler') _confirmAnnuler(context, ref);
            },
            itemBuilder: (_) => const [
              PopupMenuItem(
                value: 'pdf',
                child: ListTile(
                  leading: Icon(Icons.picture_as_pdf_rounded),
                  title: Text('Télécharger PDF'),
                  contentPadding: EdgeInsets.zero,
                  dense: true,
                ),
              ),
              PopupMenuItem(
                value: 'annuler',
                child: ListTile(
                  leading: Icon(Icons.cancel_outlined, color: Colors.red),
                  title: Text('Annuler', style: TextStyle(color: Colors.red)),
                  contentPadding: EdgeInsets.zero,
                  dense: true,
                ),
              ),
            ],
          ),
        ],
      ),
      body: AsyncValueWidget(
        value: facture,
        data: (f) => _FactureDetailBody(facture: f),
      ),
      floatingActionButton: facture.whenOrNull(
        data: (f) => f.statut != FactureStatut.soldee
            ? FloatingActionButton.extended(
                onPressed: () => _showPaiementSheet(context, ref, f),
                icon: const Icon(Icons.payments_rounded),
                label: const Text('Encaisser'),
                backgroundColor: AppColors.primary,
              )
            : null,
      ),
    );
  }

  Future<void> _downloadPdf(BuildContext context, WidgetRef ref) async {
    try {
      await context.showLoadingDialog();
      final api = ref.read(apiClientProvider);
      final response = await api.dio.get<List<int>>(
        Endpoints.facturePdf(id),
        options: Options(responseType: ResponseType.bytes),
      );
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/facture_$id.pdf');
      await file.writeAsBytes(response.data!);
      if (context.mounted) context.hideLoadingDialog();
      await OpenFile.open(file.path);
    } catch (e) {
      if (context.mounted) {
        context.hideLoadingDialog();
        context.showErrorSnackBar('Erreur PDF : ${e.toString()}');
      }
    }
  }

  Future<void> _confirmAnnuler(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Annuler la facture'),
        content: const Text('Êtes-vous sûr de vouloir annuler cette facture ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Non'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Oui, annuler'),
          ),
        ],
      ),
    );
    if (confirmed == true && context.mounted) {
      context.showSuccessSnackBar('Facture annulée');
    }
  }

  void _showPaiementSheet(
      BuildContext context, WidgetRef ref, Facture facture) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _EnregistrerPaiementSheet(
        facture: facture,
        onSuccess: () {
          ref.invalidate(factureDetailProvider(id));
          Navigator.of(context).pop();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Paiement enregistré'),
              backgroundColor: AppColors.success,
              behavior: SnackBarBehavior.floating,
            ),
          );
        },
      ),
    );
  }
}

// ── Statut badge for facture ──────────────────────────────────────────────────

class _FactureStatutBadge extends StatelessWidget {
  const _FactureStatutBadge({required this.statut});
  final FactureStatut statut;

  Color get _color => switch (statut) {
        FactureStatut.emise => AppColors.info,
        FactureStatut.partiellementPayee => AppColors.warning,
        FactureStatut.soldee => AppColors.success,
        FactureStatut.enRetard => AppColors.error,
      };

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: _color.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        statut.label,
        style: TextStyle(
          color: _color,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

// ── Body ──────────────────────────────────────────────────────────────────────

class _FactureDetailBody extends StatelessWidget {
  const _FactureDetailBody({required this.facture});
  final Facture facture;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _ClientVehiculeCard(facture: facture),
          const SizedBox(height: 12),
          if (facture.lignes != null && facture.lignes!.isNotEmpty) ...[
            _LignesTable(lignes: facture.lignes!),
            const SizedBox(height: 12),
          ],
          _TotauxSection(facture: facture),
          const SizedBox(height: 12),
          _PaiementsSection(paiements: facture.paiements ?? []),
        ],
      ),
    );
  }
}

// ── 1. Client & véhicule card ─────────────────────────────────────────────────

class _ClientVehiculeCard extends StatelessWidget {
  const _ClientVehiculeCard({required this.facture});
  final Facture facture;

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
                const Icon(Icons.person_rounded, size: 16, color: AppColors.primary),
                const SizedBox(width: 8),
                Text(
                  facture.clientNom,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Text(
                  'Facture N° ${facture.numero}',
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
                const Spacer(),
                Text(
                  formatDate(facture.dateFacture),
                  style: const TextStyle(fontSize: 12, color: Colors.black38),
                ),
              ],
            ),
            if (facture.dateEcheance != null) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(
                    Icons.event_rounded,
                    size: 13,
                    color: facture.statut == FactureStatut.enRetard
                        ? AppColors.error
                        : Colors.black38,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Échéance : ${formatDate(facture.dateEcheance!)}',
                    style: TextStyle(
                      fontSize: 12,
                      color: facture.statut == FactureStatut.enRetard
                          ? AppColors.error
                          : Colors.black45,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ── 2. Lignes table ───────────────────────────────────────────────────────────

class _LignesTable extends StatelessWidget {
  const _LignesTable({required this.lignes});
  final List<LigneFacture> lignes;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Désignations',
              style: Theme.of(context)
                  .textTheme
                  .labelMedium
                  ?.copyWith(color: Theme.of(context).colorScheme.outline),
            ),
            const SizedBox(height: 10),
            // Header row
            const Row(
              children: [
                Expanded(
                  flex: 4,
                  child: Text(
                    'Description',
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Colors.black45),
                  ),
                ),
                SizedBox(
                  width: 36,
                  child: Text(
                    'Qté',
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Colors.black45),
                    textAlign: TextAlign.center,
                  ),
                ),
                SizedBox(
                  width: 80,
                  child: Text(
                    'PU HT',
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Colors.black45),
                    textAlign: TextAlign.right,
                  ),
                ),
                SizedBox(
                  width: 80,
                  child: Text(
                    'Total HT',
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Colors.black45),
                    textAlign: TextAlign.right,
                  ),
                ),
              ],
            ),
            const Divider(height: 12),
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: lignes.length,
              separatorBuilder: (_, __) => const Divider(height: 8),
              itemBuilder: (_, i) {
                final l = lignes[i];
                return Row(
                  children: [
                    Expanded(
                      flex: 4,
                      child: Text(
                        l.designation,
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
                    SizedBox(
                      width: 36,
                      child: Text(
                        l.quantite.toStringAsFixed(0),
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
                    SizedBox(
                      width: 80,
                      child: Text(
                        formatDZD(l.prixUnitaireHT),
                        textAlign: TextAlign.right,
                        style:
                            const TextStyle(fontSize: 12, color: Colors.black54),
                      ),
                    ),
                    SizedBox(
                      width: 80,
                      child: Text(
                        formatDZD(l.totalHT),
                        textAlign: TextAlign.right,
                        style: const TextStyle(
                            fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

// ── 3. Totaux section ─────────────────────────────────────────────────────────

class _TotauxSection extends StatelessWidget {
  const _TotauxSection({required this.facture});
  final Facture facture;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Récapitulatif',
              style: Theme.of(context)
                  .textTheme
                  .labelMedium
                  ?.copyWith(color: Theme.of(context).colorScheme.outline),
            ),
            const SizedBox(height: 12),
            _TotalLine('Sous-total HT', formatDZD(facture.totalHT)),
            _TotalLine('TVA 19%', formatDZD(facture.montantTVA)),
            const Divider(height: 16),
            _TotalLine(
              'Total TTC',
              formatDZD(facture.totalTTC),
              bold: true,
              fontSize: 16,
            ),
            if (facture.montantDejaPaye > 0) ...[
              const SizedBox(height: 8),
              _TotalLine(
                'Déjà payé',
                '− ${formatDZD(facture.montantDejaPaye)}',
                color: AppColors.success,
              ),
            ],
            if (facture.restantDu > 0) ...[
              const SizedBox(height: 4),
              _TotalLine(
                'Restant dû',
                formatDZD(facture.restantDu),
                color: AppColors.error,
                bold: true,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _TotalLine extends StatelessWidget {
  const _TotalLine(
    this.label,
    this.value, {
    this.bold = false,
    this.color,
    this.fontSize = 14,
  });
  final String label;
  final String value;
  final bool bold;
  final Color? color;
  final double fontSize;

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(
      fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
      color: color,
      fontSize: fontSize,
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Expanded(child: Text(label, style: style)),
          Text(value, style: style),
        ],
      ),
    );
  }
}

// ── 4. Paiements section ──────────────────────────────────────────────────────

class _PaiementsSection extends StatelessWidget {
  const _PaiementsSection({required this.paiements});
  final List<Paiement> paiements;

  IconData _modeIcon(String mode) {
    final m = mode.toLowerCase();
    if (m.contains('virement')) return Icons.swap_horiz_rounded;
    if (m.contains('chèque') || m.contains('cheque')) return Icons.receipt_rounded;
    if (m.contains('cb') || m.contains('carte')) return Icons.credit_card_rounded;
    return Icons.payments_rounded; // espèces
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Paiements',
              style: Theme.of(context)
                  .textTheme
                  .labelMedium
                  ?.copyWith(color: Theme.of(context).colorScheme.outline),
            ),
            const SizedBox(height: 12),
            if (paiements.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    'Aucun paiement',
                    style: TextStyle(color: Colors.black38, fontSize: 13),
                  ),
                ),
              )
            else
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: paiements.map((p) {
                  return Chip(
                    avatar: Icon(_modeIcon(p.mode),
                        size: 16, color: AppColors.primary),
                    label: Text(
                      '${formatDZD(p.montant)} · ${formatDate(p.date)}',
                      style: const TextStyle(fontSize: 12),
                    ),
                    backgroundColor: AppColors.primary.withValues(alpha: 0.06),
                    side: BorderSide(
                        color: AppColors.primary.withValues(alpha: 0.2)),
                  );
                }).toList(),
              ),
          ],
        ),
      ),
    );
  }
}

// ── Paiement bottom sheet ─────────────────────────────────────────────────────

class _EnregistrerPaiementSheet extends HookConsumerWidget {
  const _EnregistrerPaiementSheet({
    required this.facture,
    required this.onSuccess,
  });
  final Facture facture;
  final VoidCallback onSuccess;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final montantCtrl = useTextEditingController(
      text: facture.restantDu > 0
          ? facture.restantDu.toStringAsFixed(0)
          : facture.totalTTC.toStringAsFixed(0),
    );
    final selectedMode = useState(0);
    final refCtrl = useTextEditingController();
    final isLoading = useState(false);
    const modes = ['Espèces', 'Virement', 'Chèque', 'CB'];

    final needsRef = selectedMode.value == 1 || selectedMode.value == 2;

    Future<void> submit() async {
      final montant = double.tryParse(montantCtrl.text);
      if (montant == null || montant <= 0) {
        context.showErrorSnackBar('Montant invalide');
        return;
      }
      isLoading.value = true;
      try {
        final api = ref.read(apiClientProvider);
        await api.post<void>(
          Endpoints.facturePaiements(facture.id),
          body: {
            'montant': montant,
            'mode': modes[selectedMode.value],
            if (needsRef && refCtrl.text.isNotEmpty) 'reference': refCtrl.text,
          },
        );
        onSuccess();
      } catch (e) {
        if (context.mounted) {
          context.showErrorSnackBar(e.toString());
        }
      } finally {
        isLoading.value = false;
      }
    }

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(
          20, 12, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.black12,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Enregistrer un paiement',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: montantCtrl,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(
              labelText: 'Montant',
              suffixText: 'DA',
              prefixIcon: Icon(Icons.payments_rounded),
            ),
          ),
          const SizedBox(height: 12),
          SegmentedButton<int>(
            segments: modes
                .asMap()
                .entries
                .map((e) => ButtonSegment(
                      value: e.key,
                      label: Text(e.value,
                          style: const TextStyle(fontSize: 12)),
                    ))
                .toList(),
            selected: {selectedMode.value},
            onSelectionChanged: (s) => selectedMode.value = s.first,
          ),
          if (needsRef) ...[
            const SizedBox(height: 12),
            TextField(
              controller: refCtrl,
              decoration: const InputDecoration(
                labelText: 'Référence',
                prefixIcon: Icon(Icons.tag_rounded),
              ),
            ),
          ],
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: isLoading.value ? null : submit,
            icon: isLoading.value
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator.adaptive(strokeWidth: 2),
                  )
                : const Icon(Icons.check_rounded),
            label: const Text('Valider le paiement'),
          ),
        ],
      ),
    );
  }
}
