import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../../shared/models/article.dart';
import '../../../core/api/endpoints.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/widgets/async_value_widget.dart';

class ConsommerPiecesScreen extends HookConsumerWidget {
  const ConsommerPiecesScreen({
    super.key,
    required this.orId,
    required this.orNumero,
  });

  final String orId;
  final String orNumero;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final modeIndex = useState(0); // 0 = Recherche, 1 = Scanner
    final searchCtrl = useTextEditingController();
    final searchResults = useState<List<Article>>([]);
    final isSearching = useState(false);
    Timer? debounce;

    Future<void> search(String query) async {
      if (query.isEmpty) {
        searchResults.value = [];
        return;
      }
      isSearching.value = true;
      try {
        final api = ref.read(apiClientProvider);
        final list = await api.get<List<dynamic>>(
          Endpoints.articlesSearch,
          queryParams: {'q': query},
          fromJson: (d) => d as List<dynamic>,
        );
        searchResults.value = list
            .map((e) => Article.fromJson(e as Map<String, dynamic>))
            .toList();
      } catch (_) {
        searchResults.value = [];
      } finally {
        isSearching.value = false;
      }
    }

    void showArticleSheet(Article article) {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        builder: (_) => _ArticleQuantiteSheet(
          article: article,
          orId: orId,
          onAdded: () {
            Navigator.of(context).pop();
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text('Pièce ajoutée : ${article.designation}'),
              backgroundColor: Colors.green,
              behavior: SnackBarBehavior.floating,
            ));
          },
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text('Ajouter pièces — OR $orNumero')),
      body: Column(
        children: [
          // Mode toggle
          Padding(
            padding: const EdgeInsets.all(16),
            child: SegmentedButton<int>(
              segments: const [
                ButtonSegment(value: 0, label: Text('Rechercher'), icon: Icon(Icons.search)),
                ButtonSegment(value: 1, label: Text('Scanner'), icon: Icon(Icons.qr_code_scanner)),
              ],
              selected: {modeIndex.value},
              onSelectionChanged: (s) => modeIndex.value = s.first,
            ),
          ),

          if (modeIndex.value == 0) ...[
            // Search mode
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: TextField(
                controller: searchCtrl,
                autofocus: true,
                decoration: const InputDecoration(
                  hintText: 'Référence, désignation...',
                  prefixIcon: Icon(Icons.search),
                ),
                onChanged: (v) {
                  debounce?.cancel();
                  debounce = Timer(
                      const Duration(milliseconds: 300), () => search(v));
                },
              ),
            ),
            Expanded(
              child: isSearching.value
                  ? const LoadingWidget()
                  : searchResults.value.isEmpty
                      ? const EmptyStateWidget(
                          title: 'Recherchez un article',
                          icon: Icons.inventory_2_outlined,
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: searchResults.value.length,
                          itemBuilder: (_, i) {
                            final article = searchResults.value[i];
                            return ListTile(
                              title: Text(article.designation),
                              subtitle: Text(article.reference),
                              trailing: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text('Stock: ${article.stockActuel.toStringAsFixed(0)}',
                                      style: TextStyle(
                                          color: article.isStockBas
                                              ? Colors.red
                                              : Colors.green,
                                          fontSize: 12)),
                                  Text(formatDZD(article.prixVente),
                                      style: const TextStyle(fontSize: 12)),
                                ],
                              ),
                              onTap: () => showArticleSheet(article),
                            );
                          },
                        ),
            ),
          ] else ...[
            // Scanner mode placeholder
            Expanded(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.qr_code_scanner,
                        size: 80, color: Colors.grey),
                    const SizedBox(height: 16),
                    const Text('Scanner disponible sur appareil physique'),
                    const SizedBox(height: 8),
                    OutlinedButton(
                      onPressed: () => modeIndex.value = 0,
                      child: const Text('Utiliser la recherche'),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ArticleQuantiteSheet extends HookConsumerWidget {
  const _ArticleQuantiteSheet({
    required this.article,
    required this.orId,
    required this.onAdded,
  });

  final Article article;
  final String orId;
  final VoidCallback onAdded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final quantite = useState(1);
    final prixCtrl = useTextEditingController(
        text: article.prixVente.toStringAsFixed(0));
    final isLoading = useState(false);

    Future<void> addToOR() async {
      isLoading.value = true;
      try {
        final api = ref.read(apiClientProvider);
        await api.post<void>(
          Endpoints.orLignes(orId),
          body: {
            'articleId': article.id,
            'quantite': quantite.value,
            'prixUnitaireHT': double.tryParse(prixCtrl.text) ?? article.prixVente,
            'type': 'Pièce',
          },
        );
        onAdded();
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
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(article.designation,
              style: Theme.of(context).textTheme.titleLarge),
          Text(article.reference,
              style: const TextStyle(color: Colors.grey)),
          Text('Stock disponible: ${article.stockActuel.toStringAsFixed(0)}',
              style: TextStyle(
                  color: article.isStockBas ? Colors.red : Colors.green)),
          const SizedBox(height: 16),

          // Quantite stepper
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                onPressed: quantite.value > 1
                    ? () => quantite.value--
                    : null,
                icon: const Icon(Icons.remove_circle_outline),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text('${quantite.value}',
                    style: Theme.of(context).textTheme.headlineMedium),
              ),
              IconButton(
                onPressed:
                    quantite.value < article.stockActuel.toInt()
                        ? () => quantite.value++
                        : null,
                icon: const Icon(Icons.add_circle_outline),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: prixCtrl,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
                labelText: 'Prix unitaire HT (DA)', suffixText: 'DA'),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: isLoading.value ? null : addToOR,
            child: isLoading.value
                ? const CircularProgressIndicator.adaptive()
                : const Text('Ajouter à l\'OR'),
          ),
        ],
      ),
    );
  }
}
