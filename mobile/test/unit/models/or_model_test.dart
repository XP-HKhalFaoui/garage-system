import 'package:flutter_test/flutter_test.dart';
import 'package:garage_app/shared/models/ordre_reparation.dart';
import 'package:garage_app/shared/models/client.dart';
import 'package:garage_app/shared/models/vehicule.dart';

void main() {
  final orJson = {
    'id': '1',
    'numero': 'OR-2024-001',
    'statut': 'encours',
    'priorite': 'normal',
    'dateOuverture': '2024-01-15T08:00:00Z',
    'vehicule': {
      'id': 'v1',
      'immatriculation': '123-ALG-456',
      'marque': 'Toyota',
      'modele': 'Corolla',
    },
    'client': {
      'id': 'c1',
      'nom': 'Benali',
      'telephone': '+213555123456',
    },
    'montantTotal': 15000.0,
    'nbLignes': 3,
  };

  test('OrdreReparation.fromJson round-trip', () {
    final or_ = OrdreReparation.fromJson(orJson);
    expect(or_.id, '1');
    expect(or_.numero, 'OR-2024-001');
    expect(or_.statut, ORStatut.enCours);
    expect(or_.vehicule.immatriculation, '123-ALG-456');
    expect(or_.client.nom, 'Benali');
    expect(or_.montantTotal, 15000.0);
  });

  test('ORStatut.isActive', () {
    expect(ORStatut.enCours.isActive, isTrue);
    expect(ORStatut.suspendu.isActive, isTrue);
    expect(ORStatut.enAttente.isActive, isTrue);
    expect(ORStatut.livre.isActive, isFalse);
    expect(ORStatut.annule.isActive, isFalse);
  });

  test('OrdreReparation.copyWith', () {
    final or_ = OrdreReparation.fromJson(orJson);
    final updated = or_.copyWith(statut: ORStatut.termineTechnicien);
    expect(updated.statut, ORStatut.termineTechnicien);
    expect(updated.id, or_.id);
  });
}
