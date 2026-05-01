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
        id: json['id'] as String,
        immatriculation: json['immatriculation'] as String,
        marque: json['marque'] as String,
        modele: json['modele'] as String,
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
        id: json['id'] as String,
        immatriculation: json['immatriculation'] as String,
        marque: json['marque'] as String,
        modele: json['modele'] as String,
        clientId: json['clientId'] as String,
        annee: json['annee'] as int?,
        kilometrage: json['kilometrage'] as int?,
        carburant: json['carburant'] as String?,
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
