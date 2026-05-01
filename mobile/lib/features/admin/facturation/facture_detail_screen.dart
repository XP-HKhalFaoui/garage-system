import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:url_launcher/url_launcher.dart' as launcher;
import '../../../shared/models/facture.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/endpoints.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../shared/widgets/async_value_widget.dart';
import 'factures_provider.dart';

class FactureDetailScreen extends HookConsumerWidget {
  const FactureDetailScreen({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final facture = ref.watch(factureDetailProvider(id));

    return Scaffold(
      appBar: AppBar(
        title: facture.whenOrNull(data: (f) => Text(f.numero)) ??
            const Text('Facture'),
        actions: [
          PopupMenuButton<String>(
            onSelected: (v) {
              if (v == 'pdf') _downloadPdf(context, ref);
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'pdf', child: Text('Télécharger PDF')),
              const PopupMenuItem(value: 'annuler', child: Text('Annuler')),
            ],
          ),
        ],
      ),
      body: AsyncValueWidget(
        value: facture,
        data: (f) => _FactureDetailBody(facture: f, onPaiementAdded: () {
          ref.invalidate(factureDetailProvider(id));
        }),
      ),
      floatingActionButton: facture.whenOrNull(
        data: (f) => f.statut != FactureStatut.soldee
            ? FloatingActionButton.extended(
                onPressed: () =>
                    _showPaiementSheet(context, ref, f),
                icon: const Icon(Icons.payments),
                label: const Text('Encaisser'),
              )
            : null,
      ),
    );
  }

  Future<void> _downloadPdf(BuildContext context, WidgetRef ref) async {
    // GET /api/factures/{id}/pdf → open_file
  }

  void _showPaiementSheet(
      BuildContext context, WidgetRef ref, Facture facture) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => _PaiementSheet(
        facture: facture,
        onSuccess: () {
          ref.invalidate(factureDetailProvider(id));
          Navigator.of(context).pop();
        },
      ),
    );
  }
}

class _FactureDetailBody extends StatelessWidget {
  const _FactureDetailBody(
      {required this.facture, required this.onPaiementAdded});
  final Facture facture;
  final VoidCallback onPaiementAdded;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Client
          _Section(
            title: 'Client',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(facture.client.nom,
                    style: const TextStyle(fontWeight: FontWeight.bold)),
                if (facture.client.telephone != null)
                  InkWell(
                    onTap: () => launcher.launchUrl(
                        Uri.parse('tel:${facture.client.telephone}')),
                    child: Text(facture.client.telephone!,
                        style: const TextStyle(color: Colors.blue)),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Lignes
          if (facture.lignes != null) ...[
            _Section(
              title: 'Désignation',
              child: Table(
                columnWidths: const {
                  0: FlexColumnWidth(3),
                  1: FlexColumnWidth(1),
                  2: FlexColumnWidth(2),
                  3: FlexColumnWidth(2),
                },
                children: [
                  const TableRow(
                    children: [
                      Text('Désignation',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      Text('Qté',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      Text('PU HT',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      Text('Total HT',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                  ...facture.lignes!.map((l) => TableRow(children: [
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Text(l.designation),
                        ),
                        Text(l.quantite.toStringAsFixed(0)),
                        Text(formatDZD(l.prixUnitaireHT)),
                        Text(formatDZD(l.totalHT)),
                      ])),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Totaux
          Align(
            alignment: Alignment.centerRight,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                _TotalRow('Sous-total HT', formatDZD(facture.totalHT)),
                _TotalRow('TVA 19%', formatDZD(facture.montantTVA)),
                const Divider(),
                _TotalRow(
                  'Total TTC',
                  formatDZD(facture.totalTTC),
                  bold: true,
                ),
                if (facture.montantDejaPaye > 0)
                  _TotalRow(
                      'Déjà payé', formatDZD(facture.montantDejaPaye)),
                if (facture.restantDu > 0)
                  _TotalRow(
                    'Restant dû',
                    formatDZD(facture.restantDu),
                    color: Colors.red,
                  ),
              ],
            ),
          ),
          const SizedBox(height: 80),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: Theme.of(context)
                    .textTheme
                    .labelMedium
                    ?.copyWith(color: Theme.of(context).colorScheme.outline)),
            const SizedBox(height: 8),
            child,
          ],
        ),
      ),
    );
  }
}

class _TotalRow extends StatelessWidget {
  const _TotalRow(this.label, this.value, {this.bold = false, this.color});
  final String label;
  final String value;
  final bool bold;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final style = bold
        ? Theme.of(context)
            .textTheme
            .titleMedium
            ?.copyWith(color: color, fontWeight: FontWeight.bold)
        : TextStyle(color: color);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label, style: style),
          const SizedBox(width: 16),
          Text(value, style: style),
        ],
      ),
    );
  }
}

class _PaiementSheet extends HookConsumerWidget {
  const _PaiementSheet({required this.facture, required this.onSuccess});
  final Facture facture;
  final VoidCallback onSuccess;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final montantCtrl =
        useTextEditingController(text: facture.restantDu.toStringAsFixed(0));
    final selectedMode = useState(0);
    final refCtrl = useTextEditingController();
    final isLoading = useState(false);
    final modes = ['Espèces', 'Virement', 'Chèque', 'CB'];

    Future<void> submit() async {
      isLoading.value = true;
      try {
        final api = ref.read(apiClientProvider);
        await api.post<void>(
          Endpoints.facturePaiements(facture.id),
          body: {
            'montant': double.tryParse(montantCtrl.text) ?? 0,
            'mode': modes[selectedMode.value],
            if (refCtrl.text.isNotEmpty) 'reference': refCtrl.text,
          },
        );
        onSuccess();
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(e.toString()), backgroundColor: Colors.red));
        }
      } finally {
        isLoading.value = false;
      }
    }

    return Padding(
      padding: EdgeInsets.fromLTRB(
          16, 16, 16, MediaQuery.of(context).viewInsets.bottom + 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Enregistrer un paiement',
              style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          TextField(
            controller: montantCtrl,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
                labelText: 'Montant (DA)', suffixText: 'DA'),
          ),
          const SizedBox(height: 12),
          SegmentedButton<int>(
            segments: modes
                .asMap()
                .entries
                .map((e) => ButtonSegment(value: e.key, label: Text(e.value)))
                .toList(),
            selected: {selectedMode.value},
            onSelectionChanged: (s) => selectedMode.value = s.first,
          ),
          if (selectedMode.value == 1 || selectedMode.value == 2) ...[
            const SizedBox(height: 12),
            TextField(
              controller: refCtrl,
              decoration: const InputDecoration(labelText: 'Référence'),
            ),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: isLoading.value ? null : submit,
            child: isLoading.value
                ? const CircularProgressIndicator.adaptive()
                : const Text('Valider'),
          ),
        ],
      ),
    );
  }
}
