import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../shared/models/ordre_reparation.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/endpoints.dart';
import '../../../core/api/signalr_service.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/widgets/async_value_widget.dart';
import '../../../shared/widgets/or_card.dart';

final mesOrProvider =
    FutureProvider.autoDispose<List<OrdreReparation>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final user = ref.watch(authProvider).user;
  final list = await api.get<List<dynamic>>(
    Endpoints.orToday,
    queryParams: {
      if (user?.employeId != null) 'technicienId': user!.employeId,
    },
    fromJson: (d) => d as List<dynamic>,
  );
  return list
      .map((e) => OrdreReparation.fromJson(e as Map<String, dynamic>))
      .toList();
});

class MesOrScreen extends ConsumerWidget {
  const MesOrScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final ors = ref.watch(mesOrProvider);

    // Listen SignalR for new assignments
    ref.listen(signalRProvider, (_, signalR) {
      signalR.orStatusStream.listen((event) {
        if (event.technicienId == user?.employeId) {
          ref.invalidate(mesOrProvider);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Nouvel OR assigné : ${event.orId}'),
              backgroundColor: Colors.green,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      });
    });

    return Scaffold(
      appBar: AppBar(
        title: Text('Mes interventions — ${user?.firstName ?? ''}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined, color: Colors.white),
            onPressed: () {},
          ),
        ],
      ),
      body: AsyncValueWidget(
        value: ors,
        data: (list) {
          final enCours =
              list.where((o) => o.statut == ORStatut.enCours).length;
          final termines = list
              .where((o) => o.statut == ORStatut.termineTechnicien)
              .length;

          return RefreshIndicator(
            onRefresh: () => ref.refresh(mesOrProvider.future),
            child: CustomScrollView(
              slivers: [
                // Stats
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        _StatCard('Assignés', '${list.length}',
                            Colors.blue),
                        const SizedBox(width: 12),
                        _StatCard('En cours', '$enCours', Colors.orange),
                        const SizedBox(width: 12),
                        _StatCard('Terminés', '$termines', Colors.green),
                      ],
                    ),
                  ),
                ),

                // OR List
                if (list.isEmpty)
                  const SliverFillRemaining(
                    child: EmptyStateWidget(
                      title: 'Aucune intervention aujourd\'hui',
                      subtitle: 'Vous n\'avez pas d\'OR assigné',
                      icon: Icons.build_outlined,
                    ),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    sliver: SliverList.builder(
                      itemCount: list.length,
                      itemBuilder: (_, i) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: ORCard(
                          or_: list[i],
                          onTap: () =>
                              context.push('/technicien/or/${list[i].id}'),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard(this.label, this.value, this.color);
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              Text(value,
                  style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: color)),
              Text(label,
                  style: const TextStyle(fontSize: 12, color: Colors.grey)),
            ],
          ),
        ),
      ),
    );
  }
}
