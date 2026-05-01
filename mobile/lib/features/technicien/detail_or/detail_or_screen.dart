import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import '../../../shared/models/ordre_reparation.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/endpoints.dart';
import '../../../shared/widgets/async_value_widget.dart';
import '../../../shared/widgets/statut_badge.dart';
import '../../../shared/widgets/or_timer_widget.dart';
import 'or_statut_actions.dart';

final orDetailProvider =
    FutureProvider.autoDispose.family<OrdreReparation, String>((ref, id) async {
  final api = ref.watch(apiClientProvider);
  return api.get<OrdreReparation>(
    Endpoints.orDetail(id),
    fromJson: (d) => OrdreReparation.fromJson(d as Map<String, dynamic>),
  );
});

class DetailOrScreen extends HookConsumerWidget {
  const DetailOrScreen({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final or = ref.watch(orDetailProvider(id));

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            or.whenOrNull(data: (o) => Text(o.numero)) ??
                const Text('Ordre de réparation'),
            const SizedBox(width: 8),
            or.whenOrNull(data: (o) => StatutBadge(statut: o.statut)) ??
                const SizedBox.shrink(),
          ],
        ),
        actions: [
          PopupMenuButton<String>(
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'historique', child: Text('Voir historique')),
              PopupMenuItem(
                  value: 'probleme', child: Text('Signaler problème')),
            ],
          ),
        ],
      ),
      body: AsyncValueWidget(
        value: or,
        data: (o) => _ORDetailBody(
          or_: o,
          onRefresh: () => ref.invalidate(orDetailProvider(id)),
        ),
      ),
      bottomNavigationBar: or.whenOrNull(
        data: (o) => ORStatutActions(
          or_: o,
          onStatutChanged: () => ref.invalidate(orDetailProvider(id)),
        ),
      ),
    );
  }
}

class _ORDetailBody extends HookConsumerWidget {
  const _ORDetailBody({required this.or_, required this.onRefresh});
  final OrdreReparation or_;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final editingDiagnostic = useState(false);
    final diagCtrl =
        useTextEditingController(text: or_.diagnostic ?? '');

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Véhicule card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    or_.vehicule.immatriculation,
                    style: Theme.of(context).textTheme.displayLarge,
                  ),
                  Text(or_.vehicule.label),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.person_outline, size: 16),
                      const SizedBox(width: 4),
                      Text(or_.client.nom),
                      const Spacer(),
                      if (or_.client.telephone != null)
                        IconButton(
                          icon: const Icon(Icons.phone, size: 20),
                          onPressed: () {},
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Timer
          if (or_.statut == ORStatut.enCours ||
              or_.statut == ORStatut.suspendu)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    const Text('Temps passé'),
                    const SizedBox(height: 8),
                    ORTimerWidget(
                      orId: or_.id,
                      status: or_.statut,
                      accumulatedMinutes: or_.accumulatedMinutes,
                      startTime: or_.startTime,
                    ),
                  ],
                ),
              ),
            ),

          const SizedBox(height: 12),

          // Diagnostic
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text('Diagnostic',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      const Spacer(),
                      if (or_.statut == ORStatut.enCours)
                        TextButton(
                          onPressed: editingDiagnostic.value
                              ? () async {
                                  final api = ref.read(apiClientProvider);
                                  await api.patch<void>(
                                    Endpoints.orDetail(or_.id),
                                    body: {'diagnostic': diagCtrl.text},
                                  );
                                  editingDiagnostic.value = false;
                                  onRefresh();
                                }
                              : () => editingDiagnostic.value = true,
                          child: Text(editingDiagnostic.value
                              ? 'Sauvegarder'
                              : 'Modifier'),
                        ),
                    ],
                  ),
                  if (editingDiagnostic.value)
                    TextField(
                      controller: diagCtrl,
                      maxLines: 4,
                      decoration: const InputDecoration(
                          hintText: 'Décrivez le diagnostic...'),
                    )
                  else
                    Text(or_.diagnostic ?? 'Aucun diagnostic renseigné',
                        style: or_.diagnostic == null
                            ? const TextStyle(color: Colors.grey)
                            : null),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Pièces
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text('Pièces & Main-d\'œuvre',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      const Spacer(),
                      Text('${or_.nbLignes} ligne(s)',
                          style: const TextStyle(color: Colors.grey)),
                    ],
                  ),
                  if (or_.lignes != null)
                    ...or_.lignes!.map((l) => ListTile(
                          dense: true,
                          leading: Chip(
                            label: Text(l.type,
                                style: const TextStyle(fontSize: 10)),
                            padding: EdgeInsets.zero,
                          ),
                          title: Text(l.designation),
                          trailing: Text(
                              '${l.quantite.toStringAsFixed(0)} × ${l.prixUnitaireHT.toStringAsFixed(0)} DA'),
                        )),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => context.push(
                            '/technicien/or/${or_.id}/pieces?numero=${or_.numero}',
                          ),
                          icon: const Icon(Icons.add),
                          label: const Text('Ajouter pièce'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Photos
          OutlinedButton.icon(
            onPressed: () => context.push(
              '/technicien/or/${or_.id}/photos?immat=${or_.vehicule.immatriculation}',
            ),
            icon: const Icon(Icons.photo_camera),
            label: const Text('Voir les photos'),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(44),
            ),
          ),
        ],
      ),
    );
  }
}
