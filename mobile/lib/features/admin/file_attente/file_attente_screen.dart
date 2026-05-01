import 'dart:async';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../../shared/models/ordre_reparation.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/endpoints.dart';
import '../../../core/api/signalr_service.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../shared/widgets/async_value_widget.dart';
import '../../../shared/widgets/or_card.dart';

final fileAttenteProvider =
    FutureProvider.autoDispose<List<OrdreReparation>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final list = await api.get<List<dynamic>>(
    Endpoints.ordresReparation,
    queryParams: {'today': true},
    fromJson: (d) => d as List<dynamic>,
  );
  return list
      .map((e) => OrdreReparation.fromJson(e as Map<String, dynamic>))
      .toList();
});

class FileAttenteScreen extends ConsumerStatefulWidget {
  const FileAttenteScreen({super.key});

  @override
  ConsumerState<FileAttenteScreen> createState() => _FileAttenteScreenState();
}

class _FileAttenteScreenState extends ConsumerState<FileAttenteScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  Timer? _refreshTimer;
  int _selectedTab = 0;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 4, vsync: this);
    _tabCtrl.addListener(() => setState(() => _selectedTab = _tabCtrl.index));

    _refreshTimer = Timer.periodic(const Duration(seconds: 60), (_) {
      ref.invalidate(fileAttenteProvider);
    });

    // Listen SignalR
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final signalR = ref.read(signalRProvider);
      signalR.orStatusStream.listen((event) {
        ref.invalidate(fileAttenteProvider);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('OR ${event.orId}: ${event.nouveauStatut}'),
              behavior: SnackBarBehavior.floating,
            ),
          );
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

  List<OrdreReparation> _filterByTab(
      List<OrdreReparation> all, int tab) {
    return switch (tab) {
      0 => all,
      1 => all.where((o) => o.statut == ORStatut.enAttente).toList(),
      2 => all.where((o) => o.statut == ORStatut.enCours).toList(),
      3 => all
          .where((o) => o.statut == ORStatut.termineTechnicien)
          .toList(),
      _ => all,
    };
  }

  @override
  Widget build(BuildContext context) {
    final ors = ref.watch(fileAttenteProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Atelier — ${formatDate(DateTime.now())}'),
        bottom: TabBar(
          controller: _tabCtrl,
          isScrollable: true,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'Tous'),
            Tab(text: 'En attente'),
            Tab(text: 'En cours'),
            Tab(text: 'Terminés'),
          ],
        ),
      ),
      body: AsyncValueWidget(
        value: ors,
        data: (all) {
          final filtered = _filterByTab(all, _selectedTab);
          if (filtered.isEmpty) {
            return const EmptyStateWidget(
                title: 'Aucun ordre de réparation',
                icon: Icons.build_outlined);
          }
          return RefreshIndicator(
            onRefresh: () => ref.refresh(fileAttenteProvider.future),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: filtered.length,
              itemBuilder: (_, i) => ORCard(
                or_: filtered[i],
                showTechnicien: true,
                onTap: () => _showOrDetail(context, filtered[i]),
              ),
            ),
          );
        },
      ),
    );
  }

  void _showOrDetail(BuildContext context, OrdreReparation or_) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => _ORAdminDetailSheet(or_: or_),
    );
  }
}

class _ORAdminDetailSheet extends ConsumerWidget {
  const _ORAdminDetailSheet({required this.or_});
  final OrdreReparation or_;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      maxChildSize: 0.9,
      expand: false,
      builder: (_, ctrl) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(or_.numero,
                style: Theme.of(context).textTheme.titleLarge),
            Text('${or_.vehicule.immatriculation} — ${or_.vehicule.label}'),
            Text('Client: ${or_.client.nom}'),
            const SizedBox(height: 16),
            if (or_.statut == ORStatut.termineTechnicien)
              FilledButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.receipt_long),
                label: const Text('Créer facture'),
              ),
            if (or_.technicien == null)
              OutlinedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.person_add),
                label: const Text('Assigner technicien'),
              ),
          ],
        ),
      ),
    );
  }
}
