import 'client.dart';
import 'vehicule.dart';

enum ORStatut {
  enAttente,
  enCours,
  suspendu,
  termineTechnicien,
  livre,
  annule;

  bool get isActive =>
      this == enAttente || this == enCours || this == suspendu;

  String get label => switch (this) {
        enAttente => 'En attente',
        enCours => 'En cours',
        suspendu => 'Suspendu',
        termineTechnicien => 'Terminé',
        livre => 'Livré',
        annule => 'Annulé',
      };

  static ORStatut fromString(String value) => switch (value.toLowerCase()) {
        'enattente' => enAttente,
        'encours' => enCours,
        'suspendu' => suspendu,
        'terminetechnicien' => termineTechnicien,
        'livre' => livre,
        'annule' => annule,
        _ => enAttente,
      };
}

enum Priorite { normal, urgent }

class TechnicienResume {
  const TechnicienResume({required this.id, required this.prenom, required this.nom});
  final String id;
  final String prenom;
  final String nom;
  String get displayName => '$prenom $nom';
  String get initiales =>
      '${prenom.isNotEmpty ? prenom[0] : ''}${nom.isNotEmpty ? nom[0] : ''}'.toUpperCase();

  factory TechnicienResume.fromJson(Map<String, dynamic> json) =>
      TechnicienResume(
        id: json['id'] as String,
        prenom: json['prenom'] as String,
        nom: json['nom'] as String,
      );
}

class LigneOR {
  const LigneOR({
    required this.id,
    required this.designation,
    required this.quantite,
    required this.prixUnitaireHT,
    required this.type,
  });
  final String id;
  final String designation;
  final double quantite;
  final double prixUnitaireHT;
  final String type;
  double get totalHT => quantite * prixUnitaireHT;

  factory LigneOR.fromJson(Map<String, dynamic> json) => LigneOR(
        id: json['id'] as String,
        designation: json['designation'] as String,
        quantite: (json['quantite'] as num).toDouble(),
        prixUnitaireHT: (json['prixUnitaireHT'] as num).toDouble(),
        type: json['type'] as String,
      );
}

class OrdreReparation {
  const OrdreReparation({
    required this.id,
    required this.numero,
    required this.statut,
    required this.priorite,
    required this.dateOuverture,
    required this.vehicule,
    required this.client,
    required this.montantTotal,
    required this.nbLignes,
    this.technicien,
    this.diagnostic,
    this.lignes,
    this.startTime,
    this.accumulatedMinutes = 0,
  });

  final String id;
  final String numero;
  final ORStatut statut;
  final Priorite priorite;
  final DateTime dateOuverture;
  final VehiculeResume vehicule;
  final ClientResume client;
  final TechnicienResume? technicien;
  final double montantTotal;
  final int nbLignes;
  final String? diagnostic;
  final List<LigneOR>? lignes;
  final DateTime? startTime;
  final int accumulatedMinutes;

  factory OrdreReparation.fromJson(Map<String, dynamic> json) =>
      OrdreReparation(
        id: json['id'] as String,
        numero: json['numero'] as String,
        statut: ORStatut.fromString(json['statut'] as String),
        priorite: json['priorite']?.toString().toLowerCase() == 'urgent'
            ? Priorite.urgent
            : Priorite.normal,
        dateOuverture: DateTime.parse(json['dateOuverture'] as String),
        vehicule: VehiculeResume.fromJson(
            json['vehicule'] as Map<String, dynamic>),
        client: ClientResume.fromJson(json['client'] as Map<String, dynamic>),
        technicien: json['technicien'] != null
            ? TechnicienResume.fromJson(
                json['technicien'] as Map<String, dynamic>)
            : null,
        montantTotal: (json['montantTotal'] as num?)?.toDouble() ?? 0,
        nbLignes: (json['nbLignes'] as int?) ?? 0,
        diagnostic: json['diagnostic'] as String?,
        lignes: (json['lignes'] as List<dynamic>?)
            ?.map((l) => LigneOR.fromJson(l as Map<String, dynamic>))
            .toList(),
        startTime: json['startTime'] != null
            ? DateTime.tryParse(json['startTime'] as String)
            : null,
        accumulatedMinutes: (json['accumulatedMinutes'] as int?) ?? 0,
      );

  OrdreReparation copyWith({
    ORStatut? statut,
    String? diagnostic,
    List<LigneOR>? lignes,
    TechnicienResume? technicien,
    DateTime? startTime,
    int? accumulatedMinutes,
  }) =>
      OrdreReparation(
        id: id,
        numero: numero,
        statut: statut ?? this.statut,
        priorite: priorite,
        dateOuverture: dateOuverture,
        vehicule: vehicule,
        client: client,
        technicien: technicien ?? this.technicien,
        montantTotal: montantTotal,
        nbLignes: nbLignes,
        diagnostic: diagnostic ?? this.diagnostic,
        lignes: lignes ?? this.lignes,
        startTime: startTime ?? this.startTime,
        accumulatedMinutes: accumulatedMinutes ?? this.accumulatedMinutes,
      );
}
