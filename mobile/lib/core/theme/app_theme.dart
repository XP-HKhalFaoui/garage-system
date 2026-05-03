import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

// ── Palette ───────────────────────────────────────────────────────────────────

abstract final class AppColors {
  // Brand
  static const primary = Color(0xFF1565C0);       // Blue 800
  static const primaryDark = Color(0xFF0D47A1);   // Blue 900
  static const primaryLight = Color(0xFF1E88E5);  // Blue 600
  static const accent = Color(0xFFF59E0B);        // Amber 500

  // Surfaces
  static const surface = Color(0xFFF8FAFC);
  static const surfaceCard = Color(0xFFFFFFFF);
  static const border = Color(0xFFE2E8F0);

  // Status
  static const statusEnAttente = Color(0xFFF59E0B);
  static const statusEnCours   = Color(0xFF3B82F6);
  static const statusTermine   = Color(0xFF10B981);
  static const statusLivre     = Color(0xFF8B5CF6);
  static const statusSuspendu  = Color(0xFFEF4444);
  static const statusAnnule    = Color(0xFF9CA3AF);
  static const urgent          = Color(0xFFEF4444);

  // Status badges
  static const badgeEnAttenteBackground   = Color(0xFFFEF3C7);
  static const badgeEnAttenteText         = Color(0xFF92400E);
  static const badgeEnCoursBackground     = Color(0xFFDBEAFE);
  static const badgeEnCoursText           = Color(0xFF1E40AF);
  static const badgeSuspenduBackground    = Color(0xFFFEE2E2);
  static const badgeSuspenduText          = Color(0xFF991B1B);
  static const badgeTermineBackground     = Color(0xFFD1FAE5);
  static const badgeTermineText           = Color(0xFF065F46);
  static const badgeLivreBackground      = Color(0xFFEDE9FE);
  static const badgeLivreText            = Color(0xFF5B21B6);
  static const badgeAnnuleBackground     = Color(0xFFF3F4F6);
  static const badgeAnnuleText           = Color(0xFF6B7280);

  // Semantic
  static const success = Color(0xFF10B981);
  static const warning = Color(0xFFF59E0B);
  static const error   = Color(0xFFEF4444);
  static const info    = Color(0xFF3B82F6);
}

// ── Shadows ───────────────────────────────────────────────────────────────────

abstract final class AppShadows {
  static List<BoxShadow> get card => [
        BoxShadow(
          color: const Color(0xFF0F172A).withValues(alpha: 0.06),
          blurRadius: 10,
          offset: const Offset(0, 2),
        ),
        BoxShadow(
          color: const Color(0xFF0F172A).withValues(alpha: 0.04),
          blurRadius: 4,
          offset: const Offset(0, 1),
        ),
      ];

  static List<BoxShadow> get fab => [
        BoxShadow(
          color: AppColors.primary.withValues(alpha: 0.35),
          blurRadius: 16,
          offset: const Offset(0, 6),
        ),
      ];
}

// ── Gradients ─────────────────────────────────────────────────────────────────

abstract final class AppGradients {
  static const header = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.primaryDark, AppColors.primaryLight],
  );

  static const headerSubtle = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF0D47A1), Color(0xFF1565C0)],
  );

  static LinearGradient status(Color color) => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [color, color.withValues(alpha: 0.7)],
      );
}

// ── Theme builder ─────────────────────────────────────────────────────────────

ThemeData get appTheme => _buildTheme(Brightness.light);
ThemeData get appDarkTheme => _buildTheme(Brightness.dark);

ThemeData _buildTheme(Brightness brightness) {
  final isDark = brightness == Brightness.dark;

  final colorScheme = ColorScheme.fromSeed(
    seedColor: AppColors.primary,
    brightness: brightness,
  ).copyWith(
    primary: AppColors.primary,
    secondary: AppColors.accent,
    surface: isDark ? const Color(0xFF1E293B) : AppColors.surface,
    surfaceContainerHighest:
        isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9),
    outline: isDark ? const Color(0xFF475569) : AppColors.border,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,

    // AppBar — gradient via flexibleSpace, no elevation
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.primary,
      foregroundColor: Colors.white,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      systemOverlayStyle: SystemUiOverlayStyle.light,
      titleTextStyle: const TextStyle(
        color: Colors.white,
        fontSize: 18,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.3,
      ),
      iconTheme: const IconThemeData(color: Colors.white),
    ),

    // Cards — flat with subtle shadow
    cardTheme: CardThemeData(
      elevation: 0,
      color: isDark ? const Color(0xFF1E293B) : AppColors.surfaceCard,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isDark ? const Color(0xFF334155) : AppColors.border,
          width: 1,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      margin: EdgeInsets.zero,
    ),

    // Bottom nav
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
      indicatorColor: AppColors.primary.withValues(alpha:0.12),
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return TextStyle(
          fontSize: 11,
          fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
          color: selected ? AppColors.primary : (isDark ? Colors.white54 : Colors.black45),
        );
      }),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return IconThemeData(
          size: 22,
          color: selected ? AppColors.primary : (isDark ? Colors.white38 : Colors.black38),
        );
      }),
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      shadowColor: const Color(0xFF0F172A).withValues(alpha:0.08),
    ),

    // Inputs
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
      ),
      filled: true,
      fillColor: isDark ? const Color(0xFF1E293B) : AppColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      hintStyle: TextStyle(
        color: isDark ? Colors.white38 : Colors.black38,
        fontSize: 14,
      ),
    ),

    // FilledButton
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        textStyle: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.2,
        ),
      ),
    ),

    // OutlinedButton
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.primary,
        side: const BorderSide(color: AppColors.primary),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      ),
    ),

    // Chip
    chipTheme: ChipThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      side: BorderSide.none,
    ),

    // Divider
    dividerTheme: DividerThemeData(
      color: isDark ? const Color(0xFF334155) : AppColors.border,
      thickness: 1,
      space: 1,
    ),

    // Typography
    textTheme: const TextTheme(
      displayLarge:  TextStyle(fontSize: 28, fontWeight: FontWeight.w700, letterSpacing: -0.5),
      displayMedium: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, letterSpacing: -0.5),
      headlineLarge: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, letterSpacing: -0.3),
      headlineMedium:TextStyle(fontSize: 20, fontWeight: FontWeight.w600, letterSpacing: -0.3),
      headlineSmall: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, letterSpacing: -0.2),
      titleLarge:    TextStyle(fontSize: 16, fontWeight: FontWeight.w600, letterSpacing: -0.1),
      titleMedium:   TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
      titleSmall:    TextStyle(fontSize: 13, fontWeight: FontWeight.w600, letterSpacing: 0.1),
      bodyLarge:     TextStyle(fontSize: 15, fontWeight: FontWeight.w400),
      bodyMedium:    TextStyle(fontSize: 14, fontWeight: FontWeight.w400),
      bodySmall:     TextStyle(fontSize: 12, fontWeight: FontWeight.w400),
      labelLarge:    TextStyle(fontSize: 13, fontWeight: FontWeight.w600, letterSpacing: 0.2),
      labelMedium:   TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
      labelSmall:    TextStyle(fontSize: 11, fontWeight: FontWeight.w500, letterSpacing: 0.3),
    ),

    scaffoldBackgroundColor: isDark ? const Color(0xFF0F172A) : AppColors.surface,
    splashFactory: InkSparkle.splashFactory,
  );
}
