import 'dart:async';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import '../../../shared/models/article.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/endpoints.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../shared/widgets/async_value_widget.dart';

final articlesProvider =
    FutureProvider.autoDispose.family<List<Article>, String>(
  (ref, search) async {
    final api = ref.watch(apiClientProvider);
    final list = await api.get<List<dynamic>>(
      Endpoints.articles,
      queryParams: search.isNotEmpty ? {'search': search} : null,
      fromJson: (d) => d as List<dynamic>,
    );
    return list
        .map((e) => Article.fromJson(e as Map<String, dynamic>))
        .toList();
  },
);

class StockScreen extends HookConsumerWidget {
  const StockScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final searchQuery = useState('');
    final searchCtrl = useTextEditingController();
    Timer? debounce;

    final articles = ref.watch(articlesProvider(searchQuery.value));
    final stockBasCount = articles.whenOrNull(
          data: (list) => list.where((a) => a.isStockBas).length,
        ) ??
        0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Stock'),
        actions: [
          if (stockBasCount > 0)
            Badge(
              label: Text('$stockBasCount'),
              child: const Icon(Icons.warning_amber_outlined,
                  color: Colors.white),
            ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: searchCtrl,
              decoration: const InputDecoration(
                hintText: 'Référence, désignation...',
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
              value: articles,
              data: (list) {
                if (list.isEmpty) {
                  return const EmptyStateWidget(
                      title: 'Aucun article',
                      icon: Icons.inventory_2_outlined);
                }
                return RefreshIndicator(
                  onRefresh: () =>
                      ref.refresh(articlesProvider(searchQuery.value).future),
                  child: ListView.builder(
                    itemCount: list.length,
                    itemBuilder: (_, i) => _ArticleTile(
                      article: list[i],
                      onTap: () => _showArticleSheet(context, ref, list[i]),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {}, // Open scanner
        tooltip: 'Scanner',
        child: const Icon(Icons.qr_code_scanner),
      ),
    );
  }

  void _showArticleSheet(
      BuildContext context, WidgetRef ref, Article article) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => _ArticleDetailSheet(article: article),
    );
  }
}

class _ArticleTile extends StatelessWidget {
  const _ArticleTile({required this.article, required this.onTap});
  final Article article;
  final VoidCallback onTap;

  Color get _stockColor {
    if (article.isStockBas) return Colors.red;
    if (article.isStockWarning) return Colors.orange;
    return Colors.green;
  }

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      title: Text(article.designation,
          style: const TextStyle(fontWeight: FontWeight.w500)),
      subtitle: Text(article.reference,
          style: const TextStyle(fontSize: 12, color: Colors.grey)),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            '${article.stockActuel.toStringAsFixed(0)} / ${article.stockMinimum.toStringAsFixed(0)}',
            style: TextStyle(
                color: _stockColor, fontWeight: FontWeight.bold),
          ),
          Text(formatDZD(article.prixVente),
              style: const TextStyle(fontSize: 12)),
        ],
      ),
    );
  }
}

class _ArticleDetailSheet extends StatelessWidget {
  const _ArticleDetailSheet({required this.article});
  final Article article;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(article.designation,
              style: Theme.of(context).textTheme.titleLarge),
          Text(article.reference,
              style: const TextStyle(color: Colors.grey)),
          const SizedBox(height: 16),
          Row(
            children: [
              _StatItem('Stock actuel',
                  article.stockActuel.toStringAsFixed(0)),
              _StatItem('Stock min',
                  article.stockMinimum.toStringAsFixed(0)),
              _StatItem('Prix vente', formatDZD(article.prixVente)),
              if (article.prixAchat != null)
                _StatItem('Prix achat', formatDZD(article.prixAchat!)),
            ],
          ),
          const SizedBox(height: 16),
          if (article.mouvements != null && article.mouvements!.isNotEmpty) ...[
            Text('Derniers mouvements',
                style: Theme.of(context).textTheme.titleSmall),
            ...article.mouvements!.take(5).map((m) => ListTile(
                  dense: true,
                  title: Text(m.type),
                  subtitle: Text('Stock résultant: ${m.stockResultant}'),
                  trailing: Text(
                    '${m.quantite > 0 ? '+' : ''}${m.quantite}',
                    style: TextStyle(
                        color: m.quantite > 0 ? Colors.green : Colors.red),
                  ),
                )),
          ],
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {},
                  child: const Text('Ajustement'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem(this.label, this.value);
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(value,
              style: const TextStyle(fontWeight: FontWeight.bold)),
          Text(label,
              style: const TextStyle(fontSize: 11, color: Colors.grey)),
        ],
      ),
    );
  }
}
