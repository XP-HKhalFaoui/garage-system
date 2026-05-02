import 'dart:async';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart' as launcher;
import '../../../shared/models/client.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/endpoints.dart';
import '../../../shared/widgets/async_value_widget.dart';

final clientsProvider =
    FutureProvider.autoDispose.family<List<Client>, String>(
  (ref, search) async {
    final api = ref.watch(apiClientProvider);
    final response = await api.get<dynamic>(
      Endpoints.clients,
      queryParams: search.isNotEmpty ? {'search': search} : null,
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

    return list
        .map((e) => Client.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  },
);

class ClientsListScreen extends HookConsumerWidget {
  const ClientsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final searchQuery = useState('');
    final searchCtrl = useTextEditingController();
    Timer? debounce;

    final clients = ref.watch(clientsProvider(searchQuery.value));

    return Scaffold(
      appBar: AppBar(title: const Text('Clients')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: searchCtrl,
              decoration: const InputDecoration(
                hintText: 'Nom, téléphone, immatriculation...',
                prefixIcon: Icon(Icons.search),
                isDense: true,
              ),
              onChanged: (v) {
                debounce?.cancel();
                debounce =
                    Timer(const Duration(milliseconds: 400), () {
                  searchQuery.value = v;
                });
              },
            ),
          ),
          Expanded(
            child: AsyncValueWidget(
              value: clients,
              data: (list) {
                if (list.isEmpty) {
                  return const EmptyStateWidget(
                      title: 'Aucun client',
                      icon: Icons.people_outline);
                }
                return RefreshIndicator(
                  onRefresh: () =>
                      ref.refresh(clientsProvider(searchQuery.value).future),
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: list.length,
                    itemBuilder: (_, i) => _ClientCard(
                      client: list[i],
                      onTap: () =>
                          context.push('/admin/clients/${list[i].id}'),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showNewClientSheet(context, ref),
        child: const Icon(Icons.person_add),
      ),
    );
  }

  void _showNewClientSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => _NewClientSheet(onCreated: () {
        ref.invalidate(clientsProvider(''));
      }),
    );
  }
}

class _ClientCard extends StatelessWidget {
  const _ClientCard({required this.client, required this.onTap});
  final Client client;
  final VoidCallback onTap;

  Color _avatarColor() {
    final hash = client.displayName.codeUnits
        .fold<int>(0, (acc, c) => acc + c);
    final colors = [
      Colors.blue,
      Colors.green,
      Colors.orange,
      Colors.purple,
      Colors.teal,
      Colors.red,
    ];
    return colors[hash % colors.length];
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              CircleAvatar(
                backgroundColor: _avatarColor(),
                child: Text(client.initiales,
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(client.displayName,
                            style: const TextStyle(
                                fontWeight: FontWeight.bold)),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(client.type,
                              style: const TextStyle(fontSize: 10)),
                        ),
                      ],
                    ),
                    if (client.telephone != null)
                      InkWell(
                        onTap: () => launcher.launchUrl(
                            Uri.parse('tel:${client.telephone}')),
                        child: Text(client.telephone!,
                            style: const TextStyle(
                                color: Colors.blue, fontSize: 13)),
                      ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        _InfoChip('${client.nbVehicules} véhicule(s)'),
                        const SizedBox(width: 6),
                        _InfoChip('${client.nbOr} OR'),
                      ],
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip(this.label);
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(label, style: const TextStyle(fontSize: 11)),
    );
  }
}

class _NewClientSheet extends HookConsumerWidget {
  const _NewClientSheet({required this.onCreated});
  final VoidCallback onCreated;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final type = useState('Particulier');
    final nomCtrl = useTextEditingController();
    final prenomCtrl = useTextEditingController();
    final telCtrl = useTextEditingController();
    final emailCtrl = useTextEditingController();
    final isLoading = useState(false);
    final formKey = useMemoized(() => GlobalKey<FormState>());

    Future<void> submit() async {
      if (!formKey.currentState!.validate()) return;
      isLoading.value = true;
      try {
        final api = ref.read(apiClientProvider);
        await api.post<void>(
          Endpoints.clients,
          body: {
            'type': type.value,
            'nom': nomCtrl.text,
            if (type.value == 'Particulier' && prenomCtrl.text.isNotEmpty)
              'prenom': prenomCtrl.text,
            'telephone': telCtrl.text,
            if (emailCtrl.text.isNotEmpty) 'email': emailCtrl.text,
          },
        );
        onCreated();
        if (context.mounted) Navigator.of(context).pop();
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Client créé')));
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text(e.toString()),
              backgroundColor: Colors.red));
        }
      } finally {
        isLoading.value = false;
      }
    }

    return Padding(
      padding: EdgeInsets.fromLTRB(
          16, 16, 16, MediaQuery.of(context).viewInsets.bottom + 16),
      child: Form(
        key: formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Nouveau client',
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'Particulier', label: Text('Particulier')),
                ButtonSegment(value: 'Société', label: Text('Société')),
              ],
              selected: {type.value},
              onSelectionChanged: (s) => type.value = s.first,
            ),
            const SizedBox(height: 12),
            if (type.value == 'Particulier')
              TextFormField(
                controller: prenomCtrl,
                decoration: const InputDecoration(labelText: 'Prénom'),
              ),
            const SizedBox(height: 8),
            TextFormField(
              controller: nomCtrl,
              decoration: InputDecoration(
                  labelText: type.value == 'Société' ? 'Raison sociale' : 'Nom'),
              validator: (v) =>
                  v == null || v.isEmpty ? 'Champ requis' : null,
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: telCtrl,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Téléphone (+213)'),
              validator: (v) =>
                  v == null || v.isEmpty ? 'Téléphone requis' : null,
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: emailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                  labelText: 'Email (optionnel)'),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: isLoading.value ? null : submit,
              child: isLoading.value
                  ? const CircularProgressIndicator.adaptive()
                  : const Text('Créer le client'),
            ),
          ],
        ),
      ),
    );
  }
}
