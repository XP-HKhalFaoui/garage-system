import 'client.dart';

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

  factory Paiement.fromJson(Map<String, dynamic> json) => Paiement(
        id: json['id'] as String,
        montant: (json['montant'] as num).toDouble(),
        mode: json['mode'] as String,
        date: DateTime.parse(json['date'] as String),
        reference: json['reference'] as String?,
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

  factory LigneFacture.fromJson(Map<String, dynamic> json) => LigneFacture(
        designation: json['designation'] as String,
        quantite: (json['quantite'] as num).toDouble(),
        prixUnitaireHT: (json['prixUnitaireHT'] as num).toDouble(),
      );
}

class Facture {
  const Facture({
    required this.id,
    required this.numero,
    required this.dateFacture,
    required this.statut,
    required this.client,
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
  final ClientResume client;
  final double totalHT;
  final double montantTVA;
  final double totalTTC;
  final double montantDejaPaye;
  final double restantDu;
  final List<LigneFacture>? lignes;
  final List<Paiement>? paiements;

  factory Facture.fromJson(Map<String, dynamic> json) => Facture(
        id: json['id'] as String,
        numero: json['numero'] as String,
        dateFacture: DateTime.parse(json['dateFacture'] as String),
        dateEcheance: json['dateEcheance'] != null
            ? DateTime.parse(json['dateEcheance'] as String)
            : null,
        statut: FactureStatut.fromString(json['statut'] as String),
        client:
            ClientResume.fromJson(json['client'] as Map<String, dynamic>),
        totalHT: (json['totalHT'] as num).toDouble(),
        montantTVA: (json['montantTVA'] as num).toDouble(),
        totalTTC: (json['totalTTC'] as num).toDouble(),
        montantDejaPaye: (json['montantDejaPaye'] as num).toDouble(),
        restantDu: (json['restantDu'] as num).toDouble(),
        lignes: (json['lignes'] as List<dynamic>?)
            ?.map((l) => LigneFacture.fromJson(l as Map<String, dynamic>))
            .toList(),
        paiements: (json['paiements'] as List<dynamic>?)
            ?.map((p) => Paiement.fromJson(p as Map<String, dynamic>))
            .toList(),
      );
}
