import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/models/facture.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/endpoints.dart';
import '../../../shared/providers/auth_provider.dart';

class FacturesFilter {
  const FacturesFilter({this.statut, this.search, this.page = 1});
  final String? statut;
  final String? search;
  final int page;

  Map<String, dynamic> toQueryParams() => {
        if (statut != null) 'statut': statut,
        if (search != null && search!.isNotEmpty) 'search': search,
        'page': page,
        'pageSize': 20,
      };

  @override
  bool operator ==(Object other) =>
      other is FacturesFilter &&
      other.statut == statut &&
      other.search == search &&
      other.page == page;

  @override
  int get hashCode => Object.hash(statut, search, page);
}

final facturesProvider =
    FutureProvider.autoDispose.family<List<Facture>, FacturesFilter>(
  (ref, filter) async {
    final api = ref.watch(apiClientProvider);
    final response = await api.get<dynamic>(
      Endpoints.factures,
      queryParams: filter.toQueryParams(),
      fromJson: (d) => d,
    );

    List<dynamic> list;
    if (response is List) {
      list = response;
    } else if (response is Map) {
      // Handles paginated responses (e.g. { "items": [...], "totalCount": 10 })
      list = (response['items'] ?? response['data'] ?? response['results'] ?? [])
          as List<dynamic>;
    } else {
      list = [];
    }

    return list
        .map((e) => Facture.fromJson(e as Map<String, dynamic>))
        .toList();
  },
);

final factureDetailProvider =
    FutureProvider.autoDispose.family<Facture, String>(
  (ref, id) async {
    final api = ref.watch(apiClientProvider);
    return api.get<Facture>(
      Endpoints.factureDetail(id),
      fromJson: (d) => Facture.fromJson(d as Map<String, dynamic>),
    );
  },
);
