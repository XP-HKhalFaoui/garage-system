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

  factory Mouvement.fromJson(Map<String, dynamic> json) => Mouvement(
        id: json['id'] as String,
        date: DateTime.parse(json['date'] as String),
        type: json['type'] as String,
        quantite: (json['quantite'] as num).toDouble(),
        stockResultant: (json['stockResultant'] as num).toDouble(),
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
        id: json['id'] as String,
        reference: json['reference'] as String,
        designation: json['designation'] as String,
        categorie: json['categorie'] as String?,
        stockActuel: (json['stockActuel'] as num).toDouble(),
        stockMinimum: (json['stockMinimum'] as num).toDouble(),
        prixVente: (json['prixVente'] as num).toDouble(),
        prixAchat: (json['prixAchat'] as num?)?.toDouble(),
        emplacementRayonnage: json['emplacementRayonnage'] as String?,
        mouvements: (json['mouvements'] as List<dynamic>?)
            ?.map((m) => Mouvement.fromJson(m as Map<String, dynamic>))
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
