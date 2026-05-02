class VehiculeResume {
  const VehiculeResume({
    required this.id,
    required this.immatriculation,
    required this.marque,
    required this.modele,
  });
  final String id;
  final String immatriculation;
  final String marque;
  final String modele;
  String get label => '$marque $modele';

  factory VehiculeResume.fromJson(Map<String, dynamic> json) => VehiculeResume(
        id: (json['id'] ?? '').toString(),
        immatriculation: (json['immatriculation'] ?? '').toString(),
        marque: (json['marque'] ?? '').toString(),
        modele: (json['modele'] ?? json['modèle'] ?? '').toString(),
      );
}

class Vehicule {
  const Vehicule({
    required this.id,
    required this.immatriculation,
    required this.marque,
    required this.modele,
    required this.clientId,
    this.annee,
    this.kilometrage,
    this.carburant,
  });
  final String id;
  final String immatriculation;
  final String marque;
  final String modele;
  final String clientId;
  final int? annee;
  final int? kilometrage;
  final String? carburant;

  factory Vehicule.fromJson(Map<String, dynamic> json) => Vehicule(
        id: (json['id'] ?? '').toString(),
        immatriculation: (json['immatriculation'] ?? '').toString(),
        marque: (json['marque'] ?? '').toString(),
        modele: (json['modele'] ?? json['modèle'] ?? '').toString(),
        clientId: (json['clientId'] ?? '').toString(),
        annee: json['annee'] as int?,
        kilometrage: (json['kilométrage'] ?? json['kilometrage']) as int?,
        carburant: json['carburant']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        'immatriculation': immatriculation,
        'marque': marque,
        'modele': modele,
        'clientId': clientId,
        'annee': annee,
        'kilometrage': kilometrage,
        'carburant': carburant,
      };
}
