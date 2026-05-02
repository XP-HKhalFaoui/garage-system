import 'dart:async';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import '../../../shared/models/facture.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../shared/widgets/async_value_widget.dart';
import 'factures_provider.dart';

const _statuts = ['Toutes', 'Émises', 'Part. payées', 'Soldées', 'En retard'];
const _statutKeys = [null, 'Emise', 'PartiellementPayee', 'Soldee', 'EnRetard'];

class FacturesListScreen extends HookConsumerWidget {
  const FacturesListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedStatut = useState(0);
    final searchQuery = useState('');
    final searchCtrl = useTextEditingController();
    Timer? debounce;

    final filter = FacturesFilter(
      statut: _statutKeys[selectedStatut.value],
      search: searchQuery.value.isEmpty ? null : searchQuery.value,
    );
    final factures = ref.watch(facturesProvider(filter));

    return Scaffold(
      appBar: AppBar(title: const Text('Facturation')),
      body: Column(
        children: [
          // Search
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: TextField(
              controller: searchCtrl,
              decoration: const InputDecoration(
                hintText: 'Rechercher par numéro ou client...',
                prefixIcon: Icon(Icons.search),
                isDense: true,
              ),
              onChanged: (v) {
                debounce?.cancel();
                debounce = Timer(const Duration(milliseconds: 400), () {
                  searchQuery.value = v;
                });
              },
            ),
          ),

          // Filters
          SizedBox(
            height: 48,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              itemCount: _statuts.length,
              itemBuilder: (_, i) => Padding(
                padding: const EdgeInsets.only(right: 8),
                child: FilterChip(
                  label: Text(_statuts[i]),
                  selected: selectedStatut.value == i,
                  onSelected: (_) => selectedStatut.value = i,
                ),
              ),
            ),
          ),

          // List
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
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: list.length,
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
}

class _FactureCard extends StatelessWidget {
  const _FactureCard({required this.facture, required this.onTap});
  final Facture facture;
  final VoidCallback onTap;

  Color _statutColor() => switch (facture.statut) {
        FactureStatut.emise => Colors.blue,
        FactureStatut.partiellementPayee => Colors.orange,
        FactureStatut.soldee => Colors.green,
        FactureStatut.enRetard => Colors.red,
      };

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(facture.numero,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 15)),
                  const Spacer(),
                  Text(formatDate(facture.dateFacture),
                      style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
              const SizedBox(height: 4),
              Text(facture.clientNom),
              const SizedBox(height: 8),
              Row(
                children: [
                  Text(
                    formatDZD(facture.totalTTC),
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: _statutColor(),
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: _statutColor().withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      facture.statut.label,
                      style: TextStyle(
                          color: _statutColor(),
                          fontSize: 12,
                          fontWeight: FontWeight.w500),
                    ),
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
