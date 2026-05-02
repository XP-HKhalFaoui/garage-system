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
  const TechnicienResume(
      {required this.id, required this.prenom, required this.nom});
  final String id;
  final String prenom;
  final String nom;
  String get displayName => '$prenom $nom'.trim();
  String get initiales =>
      '${prenom.isNotEmpty ? prenom[0] : ''}${nom.isNotEmpty ? nom[0] : ''}'
          .toUpperCase();

  factory TechnicienResume.fromJson(Map<dynamic, dynamic> json) =>
      TechnicienResume(
        id: (json['id'] ?? '').toString(),
        // API sends Prénom (with accent) or prenom
        prenom: (json['prénom'] ?? json['prenom'] ?? '').toString(),
        nom: (json['nom'] ?? '').toString(),
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

  factory LigneOR.fromJson(Map<dynamic, dynamic> json) => LigneOR(
        id: (json['id'] ?? '').toString(),
        designation: (json['description'] ?? json['designation'] ?? '').toString(),
        quantite: (json['quantité'] ?? json['quantite'] as num?)?.toDouble() ?? 0.0,
        prixUnitaireHT: (json['prixUnitaire'] ?? json['prixUnitaireHT'] as num?)?.toDouble() ?? 0.0,
        type: (json['type'] ?? '').toString(),
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

  factory OrdreReparation.fromJson(Map<dynamic, dynamic> json) {
    // dateOuverture may be a full ISO datetime or a time-only string
    DateTime parseDate(dynamic v) {
      if (v == null) return DateTime.now();
      final s = v.toString();
      final dt = DateTime.tryParse(s);
      if (dt != null) return dt;
      // time-only like "09:30" — attach today's date
      final parts = s.split(':');
      if (parts.length >= 2) {
        final now = DateTime.now();
        return DateTime(now.year, now.month, now.day,
            int.tryParse(parts[0]) ?? 0, int.tryParse(parts[1]) ?? 0);
      }
      return DateTime.now();
    }

    return OrdreReparation(
      id: (json['id'] ?? '').toString(),
      // API sends Numéro (with accent) or numero
      numero: (json['numéro'] ?? json['numero'] ?? '').toString(),
      statut: ORStatut.fromString((json['statut'] ?? '').toString()),
      priorite: (json['priorité'] ?? json['priorite'])?.toString().toLowerCase() == 'urgent'
          ? Priorite.urgent
          : Priorite.normal,
      // ORSummaryDto uses heureOuverture (string), ORResponseDto uses dateOuverture
      dateOuverture: parseDate(json['dateOuverture'] ?? json['heureOuverture']),
      vehicule: VehiculeResume.fromJson(
          Map<String, dynamic>.from((json['vehicule'] ?? {}) as Map)),
      client: ClientResume.fromJson(
          Map<String, dynamic>.from((json['client'] ?? {}) as Map)),
      technicien: json['technicien'] != null
          ? TechnicienResume.fromJson(json['technicien'] as Map)
          : null,
      montantTotal:
          (json['montantTotal'] ?? json['montantEstimé'] ?? json['montantEstime'] as num?)
              ?.toDouble() ?? 0,
      nbLignes: (json['nbLignes'] as int?) ?? 0,
      diagnostic: json['diagnostic']?.toString(),
      lignes: (json['lignes'] as List<dynamic>?)
          ?.map((l) => LigneOR.fromJson(l as Map))
          .toList(),
      startTime: json['startTime'] != null
          ? DateTime.tryParse(json['startTime'].toString())
          : null,
      accumulatedMinutes: (json['accumulatedMinutes'] as int?) ?? 0,
    );
  }

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
