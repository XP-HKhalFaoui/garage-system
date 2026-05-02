import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../../shared/models/ordre_reparation.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/endpoints.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/widgets/async_value_widget.dart';

class ORStatutActions extends HookConsumerWidget {
  const ORStatutActions({
    super.key,
    required this.or_,
    required this.onStatutChanged,
  });

  final OrdreReparation or_;
  final VoidCallback onStatutChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isLoading = useState(false);

    Future<void> changeStatut(
      String nouveauStatut, {
      String? commentaire,
    }) async {
      isLoading.value = true;
      try {
        final api = ref.read(apiClientProvider);
        await api.patch<void>(
          Endpoints.orStatut(or_.id),
          body: {
            'nouveauStatut': nouveauStatut,
            if (commentaire != null) 'commentaire': commentaire,
          },
        );
        onStatutChanged();
      } catch (e) {
        if (context.mounted) context.showErrorSnackBar(e.toString());
      } finally {
        isLoading.value = false;
      }
    }

    Future<void> confirmAndChange(
      String label,
      String statut, {
      bool requireComment = false,
      String? confirmMessage,
    }) async {
      if (requireComment) {
        final commentaire = await _askComment(context, label);
        if (commentaire == null) return;
        await changeStatut(statut, commentaire: commentaire);
      } else {
        final confirmed = await showDialog<bool>(
          context: context,
          builder: (_) => AlertDialog(
            title: Text(label),
            content: Text(confirmMessage ?? 'Confirmer cette action ?'),
            actions: [
              TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: const Text('Annuler')),
              FilledButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: const Text('Confirmer')),
            ],
          ),
        );
        if (confirmed == true) await changeStatut(statut);
      }
    }

    return Padding(
      padding: const EdgeInsets.all(16),
      child: switch (or_.statut) {
        ORStatut.enAttente => FilledButton.icon(
            onPressed: isLoading.value
                ? null
                : () => confirmAndChange(
                      'Prendre en charge',
                      'EnCours',
                      confirmMessage:
                          'Démarrer l\'intervention sur ${or_.vehicule.immatriculation} ?',
                    ),
            icon: isLoading.value
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator.adaptive(strokeWidth: 2))
                : const Icon(Icons.play_arrow),
            label: const Text('Prendre en charge'),
          ),
        ORStatut.enCours => Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: isLoading.value
                      ? null
                      : () => confirmAndChange(
                            'Suspendre',
                            'Suspendu',
                            requireComment: true,
                          ),
                  icon: const Icon(Icons.pause),
                  label: const Text('Suspendre'),
                  style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.orange),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton.icon(
                  onPressed: isLoading.value
                      ? null
                      : () {
                          if (or_.nbLignes == 0) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text(
                                    'Ajoutez au moins une ligne avant de terminer'),
                                backgroundColor: Colors.orange,
                              ),
                            );
                            return;
                          }
                          confirmAndChange(
                            'Terminer',
                            'TermineTechnicien',
                            confirmMessage:
                                'Marquer l\'OR comme terminé ? Le client sera notifié.',
                          );
                        },
                  icon: const Icon(Icons.check),
                  label: const Text('Terminer'),
                  style:
                      FilledButton.styleFrom(backgroundColor: Colors.green),
                ),
              ),
            ],
          ),
        ORStatut.suspendu => FilledButton.icon(
            onPressed: isLoading.value
                ? null
                : () => changeStatut('EnCours'),
            icon: const Icon(Icons.play_arrow),
            label: const Text('Reprendre'),
          ),
        ORStatut.termineTechnicien => Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.green.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.green.shade200),
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.check_circle, color: Colors.green),
                SizedBox(width: 8),
                Text('En attente de facturation par le caissier'),
              ],
            ),
          ),
        _ => const SizedBox.shrink(),
      },
    );
  }

  Future<String?> _askComment(BuildContext context, String title) {
    final ctrl = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: ctrl,
          decoration: const InputDecoration(
              hintText: 'Raison de la suspension...'),
          maxLines: 3,
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Annuler')),
          FilledButton(
            onPressed: () {
              if (ctrl.text.isEmpty) return;
              Navigator.pop(context, ctrl.text);
            },
            child: const Text('Confirmer'),
          ),
        ],
      ),
    );
  }
}
