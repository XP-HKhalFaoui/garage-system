class UserModel {
  const UserModel({
    required this.id,
    required this.email,
    required this.roles,
    this.employeId,
    this.prenom,
    this.nom,
  });

  final String id;
  final String email;
  final List<String> roles;
  final String? employeId;
  final String? prenom;
  final String? nom;

  String get displayName => prenom != null ? '$prenom $nom' : email;
  String get firstName => prenom ?? email;

  bool get isAdmin =>
      roles.contains('Admin') || roles.contains('Caissier');
  bool get isTechnicien => roles.contains('Technicien');

  factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(
        id: json['id'] as String,
        email: json['email'] as String,
        roles: List<String>.from(json['roles'] as List),
        employeId: json['employeId'] as String?,
        prenom: json['prenom'] as String?,
        nom: json['nom'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'roles': roles,
        'employeId': employeId,
        'prenom': prenom,
        'nom': nom,
      };
}
