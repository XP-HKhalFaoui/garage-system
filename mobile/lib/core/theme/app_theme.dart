import 'package:flutter/material.dart';

abstract final class AppColors {
  static const seedColor = Color(0xFF1A5276);

  static const statusEnAttente = Color(0xFFE67E22);
  static const statusEnCours = Color(0xFF2980B9);
  static const statusTermine = Color(0xFF27AE60);
  static const statusLivre = Color(0xFF8E44AD);
  static const urgentColor = Color(0xFFE74C3C);

  // Badge backgrounds
  static const badgeEnAttenteBackground = Color(0xFFFEF3C7);
  static const badgeEnAttenteText = Color(0xFF92400E);
  static const badgeEnCoursBackground = Color(0xFFDBEAFE);
  static const badgeEnCoursText = Color(0xFF1E40AF);
  static const badgeSuspenduBackground = Color(0xFFFEE2E2);
  static const badgeSuspenduText = Color(0xFF991B1B);
  static const badgeTermineBackground = Color(0xFFD1FAE5);
  static const badgeTermineText = Color(0xFF065F46);
  static const badgeLivreBackground = Color(0xFFEDE9FE);
  static const badgeLivreText = Color(0xFF5B21B6);
  static const badgeAnnuleBackground = Color(0xFFF3F4F6);
  static const badgeAnnuleText = Color(0xFF6B7280);
}

ThemeData get appTheme => _buildTheme(Brightness.light);
ThemeData get appDarkTheme => _buildTheme(Brightness.dark);

ThemeData _buildTheme(Brightness brightness) {
  final colorScheme = ColorScheme.fromSeed(
    seedColor: AppColors.seedColor,
    brightness: brightness,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.seedColor,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: false,
    ),
    cardTheme: CardThemeData(
      elevation: 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      clipBehavior: Clip.antiAlias,
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
      ),
      filled: true,
    ),
    textTheme: const TextTheme(
      displayLarge: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
      titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
      bodyMedium: TextStyle(fontSize: 14),
      labelSmall: TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
    ),
  );
}
