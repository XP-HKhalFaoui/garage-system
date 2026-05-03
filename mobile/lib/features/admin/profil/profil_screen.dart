import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../../core/theme/theme_provider.dart';
import '../../../shared/providers/auth_provider.dart';

class ProfilScreen extends HookConsumerWidget {
  const ProfilScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user      = ref.watch(authProvider).user;
    final themeMode = ref.watch(themeModeProvider);

    final biometricAvail   = useState(false);
    final biometricEnabled = useState(false);
    final biometricLoading = useState(false);

    useEffect(() {
      Future<void> load() async {
        final notifier = ref.read(authProvider.notifier);
        biometricAvail.value   = await notifier.isBiometricAvailable();
        biometricEnabled.value = await notifier.isBiometricEnabled();
      }
      load();
      return null;
    }, const []);

    Future<void> toggleBiometric(bool enable) async {
      biometricLoading.value = true;
      try {
        if (enable) {
          // Need credentials — ask for password confirmation
          final password = await _askPassword(context);
          if (password == null || user == null) return;
          await ref
              .read(authProvider.notifier)
              .enableBiometric(user.email, password);
          biometricEnabled.value = true;
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Connexion biométrique activée ✓')),
            );
          }
        } else {
          await ref.read(authProvider.notifier).disableBiometric();
          biometricEnabled.value = false;
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Connexion biométrique désactivée')),
            );
          }
        }
      } catch (_) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Erreur lors de la modification')),
          );
        }
      } finally {
        biometricLoading.value = false;
      }
    }

    Future<void> handleLogout() async {
      final confirmed = await showDialog<bool>(
        context: context,
        // Use dialogCtx (the dialog's own context) for Navigator.pop,
        // NOT the outer `context` — the parent may unmount before the user taps.
        builder: (dialogCtx) => AlertDialog(
          title: const Text('Déconnexion'),
          content: const Text('Voulez-vous vous déconnecter ?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogCtx, false),
              child: const Text('Annuler'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: Colors.red),
              onPressed: () => Navigator.pop(dialogCtx, true),
              child: const Text('Se déconnecter'),
            ),
          ],
        ),
      );
      if (confirmed != true) return;

      // state = AuthState() fires immediately in logout() →
      // RouterNotifier → GoRouter redirect → /login. No manual navigate needed.
      await ref.read(authProvider.notifier).logout();
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Profil & Paramètres')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── User info card ────────────────────────────────────────────────
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor:
                        Theme.of(context).colorScheme.primaryContainer,
                    child: Text(
                      _initials(user),
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${user?.prenom ?? ''} ${user?.nom ?? ''}'.trim(),
                          style: const TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 16),
                        ),
                        Text(
                          user?.email ?? '',
                          style: const TextStyle(
                              fontSize: 13, color: Colors.black45),
                        ),
                        if (user?.roles.isNotEmpty == true)
                          Container(
                            margin: const EdgeInsets.only(top: 4),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: Theme.of(context)
                                  .colorScheme
                                  .primaryContainer,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              user!.roles.first,
                              style: TextStyle(
                                fontSize: 11,
                                color: Theme.of(context).colorScheme.primary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // ── Appearance ────────────────────────────────────────────────────
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Apparence',
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                          color: Theme.of(context).colorScheme.outline,
                        ),
                  ),
                  const SizedBox(height: 12),
                  SegmentedButton<ThemeMode>(
                    segments: const [
                      ButtonSegment(
                        value: ThemeMode.light,
                        icon: Icon(Icons.light_mode_rounded),
                        label: Text('Clair'),
                      ),
                      ButtonSegment(
                        value: ThemeMode.system,
                        icon: Icon(Icons.brightness_auto_rounded),
                        label: Text('Auto'),
                      ),
                      ButtonSegment(
                        value: ThemeMode.dark,
                        icon: Icon(Icons.dark_mode_rounded),
                        label: Text('Sombre'),
                      ),
                    ],
                    selected: {themeMode},
                    onSelectionChanged: (s) {
                      ref.read(themeModeProvider.notifier).setMode(s.first);
                    },
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // ── Biometric ─────────────────────────────────────────────────────
          if (biometricAvail.value)
            Card(
              child: Padding(
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    const Icon(Icons.fingerprint, size: 28),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Connexion biométrique',
                              style: TextStyle(
                                  fontWeight: FontWeight.w600, fontSize: 15)),
                          Text(
                            'Empreinte digitale / Face ID',
                            style:
                                TextStyle(fontSize: 12, color: Colors.black45),
                          ),
                        ],
                      ),
                    ),
                    if (biometricLoading.value)
                      const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator.adaptive(strokeWidth: 2),
                      )
                    else
                      Switch.adaptive(
                        value: biometricEnabled.value,
                        onChanged: toggleBiometric,
                      ),
                  ],
                ),
              ),
            ),

          if (biometricAvail.value) const SizedBox(height: 12),

          // ── Logout ────────────────────────────────────────────────────────
          Card(
            child: ListTile(
              leading: const Icon(Icons.logout_rounded, color: Colors.red),
              title: const Text('Se déconnecter',
                  style: TextStyle(color: Colors.red)),
              onTap: handleLogout,
            ),
          ),
        ],
      ),
    );
  }

  // Ask for current password before enabling biometric
  Future<String?> _askPassword(BuildContext context) async {
    final ctrl = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirmer le mot de passe'),
        content: TextField(
          controller: ctrl,
          obscureText: true,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'Mot de passe actuel',
            prefixIcon: Icon(Icons.lock_outline),
          ),
          onSubmitted: (_) => Navigator.pop(ctx, ctrl.text),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, ctrl.text),
            child: const Text('Confirmer'),
          ),
        ],
      ),
    );
  }

  String _initials(dynamic user) {
    if (user == null) return '?';
    final fn = (user.prenom ?? '') as String;
    final ln = (user.nom ?? '') as String;
    if (fn.isEmpty && ln.isEmpty) return '?';
    return '${fn.isNotEmpty ? fn[0] : ''}${ln.isNotEmpty ? ln[0] : ''}'
        .toUpperCase();
  }
}
