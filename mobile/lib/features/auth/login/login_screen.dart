import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../core/errors/app_exception.dart';

class LoginScreen extends HookConsumerWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final emailCtrl        = useTextEditingController(text: 'admin@garage.local');
    final passwordCtrl     = useTextEditingController(text: 'Admin1234!');
    final formKey          = useMemoized(() => GlobalKey<FormState>());
    final isLoading        = useState(false);
    final errorMessage     = useState<String?>(null);
    final obscurePassword  = useState(true);
    final biometricAvail   = useState(false);
    final biometricEnabled = useState(false);

    // Check biometric availability once on mount
    useEffect(() {
      Future<void> check() async {
        final notifier = ref.read(authProvider.notifier);
        biometricAvail.value   = await notifier.isBiometricAvailable();
        biometricEnabled.value = await notifier.isBiometricEnabled();
      }
      check();
      return null;
    }, const []);

    void navigateAfterLogin() {
      final user = ref.read(authProvider).user;
      if (user?.isAdmin ?? false) {
        context.go('/admin/dashboard');
      } else {
        context.go('/technicien/mes-or');
      }
    }

    Future<void> handleLogin() async {
      if (!formKey.currentState!.validate()) return;
      isLoading.value    = true;
      errorMessage.value = null;
      final email    = emailCtrl.text.trim();
      final password = passwordCtrl.text;
      try {
        await ref.read(authProvider.notifier).login(email, password);
        if (!context.mounted) return;

        // Offer to enable biometric if available and not yet enabled
        if (biometricAvail.value && !biometricEnabled.value) {
          final enable = await showDialog<bool>(
            context: context,
            builder: (_) => AlertDialog(
              title: const Text('Connexion biométrique'),
              content: const Text(
                'Voulez-vous activer la connexion par empreinte digitale / Face ID pour les prochaines fois ?',
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: const Text('Non merci'),
                ),
                FilledButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: const Text('Activer'),
                ),
              ],
            ),
          );
          if (enable == true && context.mounted) {
            await ref.read(authProvider.notifier).enableBiometric(email, password);
            biometricEnabled.value = true;
          }
        }

        if (context.mounted) navigateAfterLogin();
      } on AppException catch (e) {
        if (context.mounted) errorMessage.value = e.userMessage;
      } catch (e) {
        if (context.mounted) {
          errorMessage.value = 'Erreur de connexion. Vérifiez vos identifiants.';
        }
      } finally {
        if (context.mounted) isLoading.value = false;
      }
    }

    Future<void> handleBiometricLogin() async {
      isLoading.value    = true;
      errorMessage.value = null;
      try {
        final success =
            await ref.read(authProvider.notifier).biometricLogin();
        if (!context.mounted) return;
        if (success) {
          navigateAfterLogin();
        } else {
          errorMessage.value = 'Authentification biométrique annulée ou échouée.';
        }
      } catch (e) {
        if (context.mounted) {
          errorMessage.value = 'Erreur biométrique. Essayez avec votre mot de passe.';
        }
      } finally {
        if (context.mounted) isLoading.value = false;
      }
    }

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Logo / Title
                  const Icon(Icons.car_repair, size: 80, color: Color(0xFF1A5276)),
                  const SizedBox(height: 16),
                  Text(
                    'Garage System',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF1A5276),
                        ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Connectez-vous pour continuer',
                    style: Theme.of(context).textTheme.bodyMedium,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 40),

                  // Email
                  TextFormField(
                    controller: emailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      prefixIcon: Icon(Icons.email_outlined),
                    ),
                    validator: (v) {
                      if (v == null || v.isEmpty) return 'Email requis';
                      if (!v.contains('@')) return 'Email invalide';
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  // Password
                  TextFormField(
                    controller: passwordCtrl,
                    obscureText: obscurePassword.value,
                    textInputAction: TextInputAction.done,
                    onFieldSubmitted: (_) => handleLogin(),
                    decoration: InputDecoration(
                      labelText: 'Mot de passe',
                      prefixIcon: const Icon(Icons.lock_outlined),
                      suffixIcon: IconButton(
                        icon: Icon(obscurePassword.value
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined),
                        onPressed: () =>
                            obscurePassword.value = !obscurePassword.value,
                      ),
                    ),
                    validator: (v) {
                      if (v == null || v.isEmpty) return 'Mot de passe requis';
                      return null;
                    },
                  ),
                  const SizedBox(height: 8),

                  // Error message
                  if (errorMessage.value != null)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.red.shade200),
                        ),
                        child: Text(
                          errorMessage.value!,
                          style: TextStyle(color: Colors.red.shade700),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),

                  const SizedBox(height: 24),

                  // Login button
                  FilledButton(
                    onPressed: isLoading.value ? null : handleLogin,
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: isLoading.value
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator.adaptive(
                              strokeWidth: 2,
                            ),
                          )
                        : const Text('Se connecter',
                            style: TextStyle(fontSize: 16)),
                  ),

                  // Biometric button — only shown if available + user previously enabled it
                  if (biometricAvail.value && biometricEnabled.value) ...[
                    const SizedBox(height: 16),
                    OutlinedButton.icon(
                      onPressed: isLoading.value ? null : handleBiometricLogin,
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      icon: const Icon(Icons.fingerprint, size: 24),
                      label: const Text(
                        'Se connecter avec biométrie',
                        style: TextStyle(fontSize: 15),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
