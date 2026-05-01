import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart' as launcher;
import '../models/ordre_reparation.dart';
import '../../core/utils/date_formatter.dart';
import 'statut_badge.dart';
import 'or_timer_widget.dart';

class ORCard extends StatelessWidget {
  const ORCard({
    super.key,
    required this.or_,
    this.showTechnicien = false,
    this.onTap,
  });

  final OrdreReparation or_;
  final bool showTechnicien;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Hero(
                    tag: 'or-num-${or_.id}',
                    child: Text(
                      or_.numero,
                      style: theme.textTheme.labelLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  PrioriteBadge(priorite: or_.priorite),
                  const Spacer(),
                  StatutBadge(statut: or_.statut, small: true),
                ],
              ),
              const SizedBox(height: 8),

              // Immatriculation
              Text(
                or_.vehicule.immatriculation,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                '${or_.vehicule.label}',
                style: theme.textTheme.bodySmall,
              ),
              const SizedBox(height: 4),

              // Client
              Row(
                children: [
                  Icon(Icons.person_outline,
                      size: 14, color: theme.colorScheme.outline),
                  const SizedBox(width: 4),
                  Text(or_.client.nom,
                      style: theme.textTheme.bodySmall),
                  if (or_.client.telephone != null) ...[
                    const Spacer(),
                    InkWell(
                      onTap: () => launcher.launchUrl(
                          Uri.parse('tel:${or_.client.telephone}')),
                      child: Row(
                        children: [
                          Icon(Icons.phone,
                              size: 14,
                              color: theme.colorScheme.primary),
                          const SizedBox(width: 2),
                          Text(
                            or_.client.telephone!,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),

              // Technicien
              if (showTechnicien) ...[
                const SizedBox(height: 4),
                or_.technicien != null
                    ? Row(
                        children: [
                          CircleAvatar(
                            radius: 12,
                            child: Text(
                              or_.technicien!.initiales,
                              style: const TextStyle(fontSize: 10),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(or_.technicien!.displayName,
                              style: theme.textTheme.bodySmall),
                        ],
                      )
                    : Chip(
                        avatar: const Icon(Icons.warning_amber, size: 14),
                        label: const Text('Non assigné'),
                        backgroundColor:
                            Colors.orange.withOpacity(0.15),
                        labelStyle: const TextStyle(
                            color: Colors.orange, fontSize: 11),
                        padding: EdgeInsets.zero,
                        materialTapTargetSize:
                            MaterialTapTargetSize.shrinkWrap,
                      ),
              ],

              const SizedBox(height: 8),

              // Footer
              Row(
                children: [
                  if (or_.statut == ORStatut.enCours)
                    ORTimerWidget(
                      orId: or_.id,
                      status: or_.statut,
                      accumulatedMinutes: or_.accumulatedMinutes,
                      startTime: or_.startTime,
                      fontSize: 14,
                    )
                  else
                    Text(
                      formatDateTime(or_.dateOuverture),
                      style: theme.textTheme.bodySmall,
                    ),
                  const Spacer(),
                  Chip(
                    label: Text(
                      'Intervention',
                      style: theme.textTheme.labelSmall,
                    ),
                    padding: EdgeInsets.zero,
                    materialTapTargetSize:
                        MaterialTapTargetSize.shrinkWrap,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
