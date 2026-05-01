class ClientResume {
  const ClientResume({
    required this.id,
    required this.nom,
    this.telephone,
  });
  final String id;
  final String nom;
  final String? telephone;

  factory ClientResume.fromJson(Map<String, dynamic> json) => ClientResume(
        id: json['id'] as String,
        nom: json['nom'] as String,
        telephone: json['telephone'] as String?,
      );
}

class Client {
  const Client({
    required this.id,
    required this.nom,
    required this.type,
    this.prenom,
    this.telephone,
    this.email,
    this.wilaya,
    this.nbVehicules = 0,
    this.nbOr = 0,
    this.caTotal = 0,
  });

  final String id;
  final String nom;
  final String type;
  final String? prenom;
  final String? telephone;
  final String? email;
  final String? wilaya;
  final int nbVehicules;
  final int nbOr;
  final double caTotal;

  String get displayName =>
      type == 'Particulier' && prenom != null ? '$prenom $nom' : nom;

  String get initiales {
    final parts = displayName.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return displayName.substring(0, displayName.length.clamp(0, 2)).toUpperCase();
  }

  factory Client.fromJson(Map<String, dynamic> json) => Client(
        id: json['id'] as String,
        nom: json['nom'] as String,
        type: json['type'] as String? ?? 'Particulier',
        prenom: json['prenom'] as String?,
        telephone: json['telephone'] as String?,
        email: json['email'] as String?,
        wilaya: json['wilaya'] as String?,
        nbVehicules: (json['nbVehicules'] as int?) ?? 0,
        nbOr: (json['nbOr'] as int?) ?? 0,
        caTotal: (json['caTotal'] as num?)?.toDouble() ?? 0,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'nom': nom,
        'type': type,
        'prenom': prenom,
        'telephone': telephone,
        'email': email,
        'wilaya': wilaya,
      };
}
