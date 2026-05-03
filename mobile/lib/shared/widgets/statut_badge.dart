import 'package:flutter/material.dart';
import '../models/ordre_reparation.dart';
import '../../core/theme/app_theme.dart';

class StatutBadge extends StatelessWidget {
  const StatutBadge({super.key, required this.statut, this.small = false});

  final ORStatut statut;
  final bool small;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (statut) {
      ORStatut.enAttente => (
          AppColors.badgeEnAttenteBackground,
          AppColors.badgeEnAttenteText
        ),
      ORStatut.enCours => (
          AppColors.badgeEnCoursBackground,
          AppColors.badgeEnCoursText
        ),
      ORStatut.suspendu => (
          AppColors.badgeSuspenduBackground,
          AppColors.badgeSuspenduText
        ),
      ORStatut.termineTechnicien => (
          AppColors.badgeTermineBackground,
          AppColors.badgeTermineText
        ),
      ORStatut.livre => (
          AppColors.badgeLivreBackground,
          AppColors.badgeLivreText
        ),
      ORStatut.annule => (
          AppColors.badgeAnnuleBackground,
          AppColors.badgeAnnuleText
        ),
    };

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: small ? 8 : 12,
        vertical: small ? 2 : 4,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        statut.label,
        style: TextStyle(
          fontSize: small ? 10 : 12,
          fontWeight: FontWeight.w500,
          color: fg,
        ),
      ),
    );
  }
}

class PrioriteBadge extends StatelessWidget {
  const PrioriteBadge({super.key, required this.priorite});
  final Priorite priorite;

  @override
  Widget build(BuildContext context) {
    if (priorite == Priorite.normal) return const SizedBox.shrink();
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.local_fire_department,
            size: 12, color: AppColors.urgent),
        const SizedBox(width: 2),
        Text(
          'Urgent',
          style: TextStyle(
            fontSize: 11,
            color: AppColors.urgent,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
