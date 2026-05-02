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

  factory UserModel.fromJson(Map<String, dynamic> json) {
    // Handle both single string role and list of roles
    final rolesData = json['roles'] ?? json['role'];
    List<String> rolesList = [];
    if (rolesData is String) {
      rolesList = [rolesData];
    } else if (rolesData is List) {
      rolesList = List<String>.from(rolesData);
    }

    return UserModel(
      id: (json['id'] ?? json['sub'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      roles: rolesList,
      employeId: json['employeId']?.toString(),
      prenom: json['prenom']?.toString(),
      nom: json['nom']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'roles': roles,
        'employeId': employeId,
        'prenom': prenom,
        'nom': nom,
      };
}
