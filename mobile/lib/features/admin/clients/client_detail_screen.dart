import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../../shared/models/client.dart';
import '../../../shared/models/vehicule.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/endpoints.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../shared/widgets/async_value_widget.dart';

final clientDetailProvider =
    FutureProvider.autoDispose.family<Client, String>((ref, id) async {
  final api = ref.watch(apiClientProvider);
  return api.get<Client>(
    Endpoints.clientDetail(id),
    fromJson: (d) => Client.fromJson(d as Map<String, dynamic>),
  );
});

final clientVehiculesProvider =
    FutureProvider.autoDispose.family<List<Vehicule>, String>((ref, clientId) async {
  final api = ref.watch(apiClientProvider);
  final list = await api.get<List<dynamic>>(
    Endpoints.vehicules,
    queryParams: {'clientId': clientId},
    fromJson: (d) => d as List<dynamic>,
  );
  return list
      .map((e) => Vehicule.fromJson(e as Map<String, dynamic>))
      .toList();
});

class ClientDetailScreen extends ConsumerWidget {
  const ClientDetailScreen({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final client = ref.watch(clientDetailProvider(id));

    return Scaffold(
      appBar: AppBar(
        title:
            client.whenOrNull(data: (c) => Text(c.displayName)) ??
                const Text('Client'),
        actions: [
          IconButton(
              icon: const Icon(Icons.edit_outlined, color: Colors.white),
              onPressed: () {}),
        ],
      ),
      body: AsyncValueWidget(
        value: client,
        data: (c) => _ClientDetailBody(client: c),
      ),
    );
  }
}

class _ClientDetailBody extends ConsumerWidget {
  const _ClientDetailBody({required this.client});
  final Client client;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final vehicules = ref.watch(clientVehiculesProvider(client.id));

    return Column(
      children: [
        // Header card
        Card(
          margin: const EdgeInsets.all(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                CircleAvatar(
                  radius: 30,
                  child: Text(client.initiales,
                      style: const TextStyle(fontSize: 20)),
                ),
                const SizedBox(height: 8),
                Text(client.displayName,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 18)),
                if (client.telephone != null)
                  Text(client.telephone!,
                      style: const TextStyle(color: Colors.blue)),
                if (client.wilaya != null)
                  Text(client.wilaya!,
                      style: const TextStyle(color: Colors.grey)),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _StatChip('${client.nbVehicules} véhicule(s)'),
                    const SizedBox(width: 8),
                    _StatChip('${client.nbOr} OR'),
                    const SizedBox(width: 8),
                    _StatChip(formatDZD(client.caTotal)),
                  ],
                ),
              ],
            ),
          ),
        ),

        // Tabs
        Expanded(
          child: DefaultTabController(
            length: 2,
            child: Column(
              children: [
                const TabBar(
                  tabs: [Tab(text: 'Véhicules'), Tab(text: 'Historique')],
                ),
                Expanded(
                  child: TabBarView(
                    children: [
                      // Véhicules tab
                      AsyncValueWidget(
                        value: vehicules,
                        data: (list) {
                          if (list.isEmpty) {
                            return const EmptyStateWidget(
                                title: 'Aucun véhicule',
                                icon: Icons.directions_car_outlined);
                          }
                          return ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: list.length,
                            itemBuilder: (_, i) =>
                                _VehiculeCard(vehicule: list[i]),
                          );
                        },
                      ),

                      // Historique tab
                      const Center(child: Text('Historique des OR')),
                    ],
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

class _StatChip extends StatelessWidget {
  const _StatChip(this.label);
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(label, style: const TextStyle(fontSize: 12)),
    );
  }
}

class _VehiculeCard extends StatelessWidget {
  const _VehiculeCard({required this.vehicule});
  final Vehicule vehicule;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(vehicule.immatriculation,
                style: const TextStyle(
                    fontWeight: FontWeight.bold, fontSize: 16)),
            Text('${vehicule.marque} ${vehicule.modele}',
                style: const TextStyle(fontSize: 14)),
            if (vehicule.annee != null || vehicule.carburant != null)
              Text(
                [
                  if (vehicule.annee != null) '${vehicule.annee}',
                  if (vehicule.carburant != null) vehicule.carburant!,
                  if (vehicule.kilometrage != null)
                    '${vehicule.kilometrage} km',
                ].join(' • '),
                style: const TextStyle(color: Colors.grey, fontSize: 12),
              ),
          ],
        ),
      ),
    );
  }
}
