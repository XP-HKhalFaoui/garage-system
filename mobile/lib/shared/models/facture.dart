enum FactureStatut {
  emise,
  partiellementPayee,
  soldee,
  enRetard;

  String get label => switch (this) {
        emise => 'Émise',
        partiellementPayee => 'Part. payée',
        soldee => 'Soldée',
        enRetard => 'En retard',
      };

  static FactureStatut fromString(String value) =>
      switch (value.toLowerCase()) {
        'emise' => emise,
        'partiellementpayee' => partiellementPayee,
        'soldee' => soldee,
        'enretard' => enRetard,
        _ => emise,
      };
}

class Paiement {
  const Paiement({
    required this.id,
    required this.montant,
    required this.mode,
    required this.date,
    this.reference,
  });
  final String id;
  final double montant;
  final String mode;
  final DateTime date;
  final String? reference;

  factory Paiement.fromJson(Map<dynamic, dynamic> json) => Paiement(
        id: (json['id'] ?? '').toString(),
        montant: (json['montant'] as num?)?.toDouble() ?? 0.0,
        mode: (json['mode'] ?? 'Espèces').toString(),
        date: json['date'] != null
            ? DateTime.parse(json['date'] as String)
            : DateTime.now(),
        reference: json['reference']?.toString(),
      );
}

class LigneFacture {
  const LigneFacture({
    required this.designation,
    required this.quantite,
    required this.prixUnitaireHT,
  });
  final String designation;
  final double quantite;
  final double prixUnitaireHT;
  double get totalHT => quantite * prixUnitaireHT;

  factory LigneFacture.fromJson(Map<dynamic, dynamic> json) => LigneFacture(
        designation: (json['description'] ?? json['designation'] ?? '').toString(),
        quantite: (json['quantité'] ?? json['quantite'] as num?)?.toDouble() ?? 0.0,
        prixUnitaireHT: (json['prixUnitaireHT'] as num?)?.toDouble() ?? 0.0,
      );
}

class Facture {
  const Facture({
    required this.id,
    required this.numero,
    required this.dateFacture,
    required this.statut,
    required this.clientNom,
    required this.totalHT,
    required this.montantTVA,
    required this.totalTTC,
    required this.montantDejaPaye,
    required this.restantDu,
    this.dateEcheance,
    this.lignes,
    this.paiements,
  });

  final String id;
  final String numero;
  final DateTime dateFacture;
  final DateTime? dateEcheance;
  final FactureStatut statut;
  final String clientNom;
  final double totalHT;
  final double montantTVA;
  final double totalTTC;
  final double montantDejaPaye;
  final double restantDu;
  final List<LigneFacture>? lignes;
  final List<Paiement>? paiements;

  factory Facture.fromJson(Map<dynamic, dynamic> json) => Facture(
        id: (json['id'] ?? '').toString(),
        numero: (json['numéro'] ?? json['numero'] ?? '').toString(),
        dateFacture: json['dateFacture'] != null
            ? DateTime.parse(json['dateFacture'] as String)
            : DateTime.now(),
        dateEcheance: json['dateEchéance'] != null
            ? DateTime.parse(json['dateEchéance'] as String)
            : json['dateEcheance'] != null
                ? DateTime.parse(json['dateEcheance'] as String)
                : null,
        statut: FactureStatut.fromString((json['statut'] ?? '').toString()),
        clientNom: (json['clientNom'] ?? 'Client Inconnu').toString(),
        totalHT: (json['sousTotalHT'] ?? json['totalHT'] as num?)?.toDouble() ?? 0.0,
        montantTVA: (json['montantTVA'] as num?)?.toDouble() ?? 0.0,
        totalTTC: (json['totalTTC'] as num?)?.toDouble() ?? 0.0,
        montantDejaPaye: (json['montantDéjàPayé'] ?? json['montantDejaPaye'] as num?)?.toDouble() ?? 0.0,
        restantDu: (json['restantDû'] ?? json['restantDu'] as num?)?.toDouble() ?? 0.0,
        lignes: (json['lignes'] as List<dynamic>?)
            ?.map((l) => LigneFacture.fromJson(l as Map))
            .toList(),
        paiements: (json['paiements'] as List<dynamic>?)
            ?.map((p) => Paiement.fromJson(p as Map))
            .toList(),
      );
}
