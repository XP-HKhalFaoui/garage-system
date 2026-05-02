class Mouvement {
  const Mouvement({
    required this.id,
    required this.date,
    required this.type,
    required this.quantite,
    required this.stockResultant,
  });
  final String id;
  final DateTime date;
  final String type;
  final double quantite;
  final double stockResultant;

  factory Mouvement.fromJson(Map<dynamic, dynamic> json) => Mouvement(
        id: (json['id'] ?? '').toString(),
        date: json['date'] != null
            ? DateTime.parse(json['date'].toString())
            : DateTime.now(),
        type: (json['type'] ?? '').toString(),
        quantite: (json['quantité'] ?? json['quantite'] as num?)?.toDouble() ?? 0.0,
        stockResultant: (json['stockRésultant'] ?? json['stockResultant'] as num?)?.toDouble() ?? 0.0,
      );
}

class Article {
  const Article({
    required this.id,
    required this.reference,
    required this.designation,
    required this.stockActuel,
    required this.stockMinimum,
    required this.prixVente,
    this.categorie,
    this.emplacementRayonnage,
    this.prixAchat,
    this.mouvements,
  });

  final String id;
  final String reference;
  final String designation;
  final String? categorie;
  final double stockActuel;
  final double stockMinimum;
  final double prixVente;
  final double? prixAchat;
  final String? emplacementRayonnage;
  final List<Mouvement>? mouvements;

  bool get isStockBas => stockActuel <= stockMinimum;
  bool get isStockWarning =>
      !isStockBas && stockActuel < stockMinimum * 1.5;

  factory Article.fromJson(Map<String, dynamic> json) => Article(
        id: (json['id'] ?? '').toString(),
        // API sends Référence (with accent)
        reference: (json['référence'] ?? json['reference'] ?? '').toString(),
        designation: (json['désignation'] ?? json['designation'] ?? '').toString(),
        categorie: (json['catégorie'] ?? json['categorie'])?.toString(),
        stockActuel: (json['stockActuel'] as num?)?.toDouble() ?? 0.0,
        stockMinimum: (json['stockMinimum'] as num?)?.toDouble() ?? 0.0,
        prixVente: (json['prixVente'] as num?)?.toDouble() ?? 0.0,
        prixAchat: (json['prixAchat'] as num?)?.toDouble(),
        emplacementRayonnage: json['emplacementRayonnage']?.toString(),
        mouvements: (json['mouvements'] as List<dynamic>?)
            ?.map((m) => Mouvement.fromJson(m as Map))
            .toList(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'reference': reference,
        'designation': designation,
        'categorie': categorie,
        'stockActuel': stockActuel,
        'stockMinimum': stockMinimum,
        'prixVente': prixVente,
        'prixAchat': prixAchat,
        'emplacementRayonnage': emplacementRayonnage,
      };
}
