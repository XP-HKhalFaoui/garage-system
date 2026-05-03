import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_provider.dart';
import 'core/router/app_router.dart';
import 'shared/providers/auth_provider.dart';

class GarageApp extends ConsumerStatefulWidget {
  const GarageApp({super.key});

  @override
  ConsumerState<GarageApp> createState() => _GarageAppState();
}

class _GarageAppState extends ConsumerState<GarageApp> {
  @override
  void initState() {
    super.initState();
    // Call tryAutoLogin AFTER the first frame so no Riverpod state change
    // fires while the widget tree is still mounting (avoids !_dirty assertion).
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(authProvider.notifier).tryAutoLogin();
    });
  }

  @override
  Widget build(BuildContext context) {
    final themeMode = ref.watch(themeModeProvider);
    // Watch isLoading — while true, show splash. No manual _initialized flag needed.
    final isLoading = ref.watch(authProvider.select((s) => s.isLoading));

    if (isLoading) {
      return MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: appTheme,
        darkTheme: appDarkTheme,
        themeMode: themeMode,
        home: const _SplashScreen(),
      );
    }

    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Garage System',
      theme: appTheme,
      darkTheme: appDarkTheme,
      themeMode: themeMode,
      routerConfig: router,
      locale: const Locale('fr'),
      supportedLocales: const [Locale('fr'), Locale('ar')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      debugShowCheckedModeBanner: false,
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.car_repair, size: 64, color: Color(0xFF1A5276)),
            SizedBox(height: 24),
            CircularProgressIndicator.adaptive(),
          ],
        ),
      ),
    );
  }
}
