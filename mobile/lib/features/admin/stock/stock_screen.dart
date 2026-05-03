import 'dart:async';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import '../../../shared/models/article.dart';
import '../../../core/api/endpoints.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/widgets/async_value_widget.dart';

// ── Provider ──────────────────────────────────────────────────────────────────

final articlesProvider =
    FutureProvider.autoDispose.family<List<Article>, String>(
  (ref, search) async {
    final api = ref.watch(apiClientProvider);
    final response = await api.get<dynamic>(
      Endpoints.articles,
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
        .map((e) => Article.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  },
);

// ── Screen ────────────────────────────────────────────────────────────────────

class StockScreen extends HookConsumerWidget {
  const StockScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final searchQuery = useState('');
    final searchCtrl = useTextEditingController();
    Timer? debounce;

    final articles = ref.watch(articlesProvider(searchQuery.value));
    final critiques = articles.whenOrNull(
          data: (list) => list.where((a) => a.isStockBas).toList(),
        ) ??
        [];
    final warnings = articles.whenOrNull(
          data: (list) => list.where((a) => a.isStockWarning).length,
        ) ??
        0;

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(
        children: [
          // ── AppBar with gradient ─────────────────────────────────────────
          _StockAppBar(
            critiquesCount: critiques.length,
            warningsCount: warnings,
          ),

          // ── Alertes épinglées ────────────────────────────────────────────
          if (critiques.isNotEmpty)
            _AlertesBanner(articles: critiques),

          // ── Search ───────────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: searchCtrl,
              decoration: InputDecoration(
                hintText: 'Référence, désignation...',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: searchQuery.value.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          searchCtrl.clear();
                          searchQuery.value = '';
                        },
                      )
                    : null,
              ),
              onChanged: (v) {
                debounce?.cancel();
                debounce = Timer(const Duration(milliseconds: 400), () {
                  searchQuery.value = v;
                });
              },
            ),
          ),

          // ── List ─────────────────────────────────────────────────────────
          Expanded(
            child: AsyncValueWidget(
              value: articles,
              data: (list) {
                if (list.isEmpty) {
                  return const EmptyStateWidget(
                      title: 'Aucun article', icon: Icons.inventory_2_outlined);
                }
                return RefreshIndicator(
                  onRefresh: () =>
                      ref.refresh(articlesProvider(searchQuery.value).future),
                  color: AppColors.primary,
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                    itemCount: list.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) => _ArticleCard(
                      article: list[i],
                      onTap: () => _showArticleSheet(context, list[i]),
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

  void _showArticleSheet(BuildContext context, Article article) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ArticleDetailSheet(article: article),
    );
  }
}

// ── AppBar ────────────────────────────────────────────────────────────────────

class _StockAppBar extends StatelessWidget {
  const _StockAppBar({required this.critiquesCount, required this.warningsCount});
  final int critiquesCount;
  final int warningsCount;

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    return Container(
      decoration: const BoxDecoration(
        gradient: AppGradients.headerSubtle,
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(24),
          bottomRight: Radius.circular(24),
        ),
      ),
      padding: EdgeInsets.fromLTRB(20, top + 12, 20, 20),
      child: Row(
        children: [
          const Expanded(
            child: Text(
              'Stock',
              style: TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          if (critiquesCount > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: AppColors.error.withOpacity(0.2),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.error.withOpacity(0.5)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.warning_amber_rounded,
                      color: Colors.white, size: 14),
                  const SizedBox(width: 4),
                  Text(
                    '$critiquesCount critique${critiquesCount > 1 ? 's' : ''}',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

// ── Alertes banner ────────────────────────────────────────────────────────────

class _AlertesBanner extends StatelessWidget {
  const _AlertesBanner({required this.articles});
  final List<Article> articles;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.error.withOpacity(0.05),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.error.withOpacity(0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.inventory_2_rounded,
                  color: AppColors.error, size: 16),
              const SizedBox(width: 6),
              Text(
                'Stock critique — ${articles.length} article(s)',
                style: const TextStyle(
                  color: AppColors.error,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...articles.take(3).map((a) => Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        a.designation,
                        style: const TextStyle(fontSize: 12),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      '${a.stockActuel.toStringAsFixed(0)} / ${a.stockMinimum.toStringAsFixed(0)}',
                      style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.error),
                    ),
                  ],
                ),
              )),
          if (articles.length > 3)
            Text(
              '+ ${articles.length - 3} autre(s)',
              style: const TextStyle(
                  fontSize: 11, color: AppColors.error),
            ),
        ],
      ),
    );
  }
}

// ── Article card ──────────────────────────────────────────────────────────────

class _ArticleCard extends StatelessWidget {
  const _ArticleCard({required this.article, required this.onTap});
  final Article article;
  final VoidCallback onTap;

  Color get _levelColor {
    if (article.isStockBas) return AppColors.error;
    if (article.isStockWarning) return AppColors.warning;
    return AppColors.success;
  }

  double get _levelRatio {
    if (article.stockMinimum <= 0) return 1.0;
    return (article.stockActuel / (article.stockMinimum * 2)).clamp(0.0, 1.0);
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: article.isStockBas
                ? AppColors.error.withOpacity(0.3)
                : AppColors.border,
          ),
          boxShadow: AppShadows.card,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Icon
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: _levelColor.withOpacity(0.10),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.inventory_2_rounded,
                      color: _levelColor, size: 18),
                ),
                const SizedBox(width: 12),
                // Title
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        article.designation,
                        style: const TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 14),
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        article.reference,
                        style: const TextStyle(
                            fontSize: 11, color: Colors.black38),
                      ),
                    ],
                  ),
                ),
                // Price
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      formatDZD(article.prixVente),
                      style: const TextStyle(
                          fontWeight: FontWeight.w700, fontSize: 13),
                    ),
                    Text(
                      '${article.stockActuel.toStringAsFixed(0)} unités',
                      style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: _levelColor),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 10),
            // Stock level bar
            Row(
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: _levelRatio,
                      minHeight: 6,
                      backgroundColor: _levelColor.withOpacity(0.12),
                      valueColor: AlwaysStoppedAnimation(_levelColor),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  'min ${article.stockMinimum.toStringAsFixed(0)}',
                  style: const TextStyle(fontSize: 10, color: Colors.black38),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Article detail sheet ──────────────────────────────────────────────────────

class _ArticleDetailSheet extends StatelessWidget {
  const _ArticleDetailSheet({required this.article});
  final Article article;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(
          20, 12, 20, MediaQuery.paddingOf(context).bottom + 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.black12,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(article.designation,
              style: Theme.of(context).textTheme.titleLarge),
          Text(article.reference,
              style: const TextStyle(color: Colors.black38, fontSize: 13)),
          const SizedBox(height: 20),

          // Stats row
          Row(
            children: [
              _SheetStat('Stock actuel', '${article.stockActuel.toStringAsFixed(0)}',
                  article.isStockBas ? AppColors.error : AppColors.success),
              _SheetStat('Stock min', article.stockMinimum.toStringAsFixed(0), Colors.black54),
              _SheetStat('Prix vente', formatDZD(article.prixVente), AppColors.primary),
              if (article.prixAchat != null)
                _SheetStat('Prix achat', formatDZD(article.prixAchat!), Colors.black54),
            ],
          ),
          const SizedBox(height: 16),

          // Level bar
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: article.stockMinimum > 0
                  ? (article.stockActuel / (article.stockMinimum * 2)).clamp(0.0, 1.0)
                  : 1.0,
              minHeight: 10,
              backgroundColor: Colors.black.withOpacity(0.06),
              valueColor: AlwaysStoppedAnimation(
                  article.isStockBas ? AppColors.error : AppColors.success),
            ),
          ),
          const SizedBox(height: 20),

          // Mouvements
          if (article.mouvements != null && article.mouvements!.isNotEmpty) ...[
            Text('Derniers mouvements',
                style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            ...article.mouvements!.take(5).map((m) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: m.quantite > 0 ? AppColors.success : AppColors.error,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                          child: Text(m.type,
                              style: const TextStyle(fontSize: 13))),
                      Text(
                        '${m.quantite > 0 ? '+' : ''}${m.quantite.toStringAsFixed(0)}',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: m.quantite > 0 ? AppColors.success : AppColors.error,
                        ),
                      ),
                    ],
                  ),
                )),
            const SizedBox(height: 12),
          ],

          // Action
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.tune_rounded, size: 18),
              label: const Text('Ajuster le stock'),
            ),
          ),
        ],
      ),
    );
  }
}

class _SheetStat extends StatelessWidget {
  const _SheetStat(this.label, this.value, this.color);
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(value,
              style: TextStyle(
                  fontWeight: FontWeight.w700, fontSize: 15, color: color)),
          Text(label,
              style: const TextStyle(fontSize: 10, color: Colors.black38),
              textAlign: TextAlign.center),
        ],
      ),
    );
  }
}
