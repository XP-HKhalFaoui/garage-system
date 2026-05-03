import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../../core/theme/app_theme.dart';

// ── Shimmer wrapper ───────────────────────────────────────────────────────────

Widget _shimmerWrap(Widget child, {bool isDark = false}) {
  return Shimmer.fromColors(
    baseColor: isDark ? const Color(0xFF2D3748) : const Color(0xFFE2E8F0),
    highlightColor: isDark ? const Color(0xFF4A5568) : const Color(0xFFF7FAFC),
    child: child,
  );
}

Widget _box({double? width, double? height = 14, double radius = 8}) {
  return Container(
    width: width,
    height: height,
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(radius),
    ),
  );
}

// ── SkeletonFactureCard ───────────────────────────────────────────────────────

class SkeletonFactureCard extends StatelessWidget {
  const SkeletonFactureCard({super.key});

  @override
  Widget build(BuildContext context) {
    return _shimmerWrap(
      Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _box(width: 80),
                const Spacer(),
                _box(width: 60),
              ],
            ),
            const SizedBox(height: 10),
            _box(width: 140),
            const SizedBox(height: 10),
            Row(
              children: [
                _box(width: 100, height: 18),
                const Spacer(),
                _box(width: 70, height: 22, radius: 8),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── SkeletonORCard ────────────────────────────────────────────────────────────

class SkeletonORCard extends StatelessWidget {
  const SkeletonORCard({super.key});

  @override
  Widget build(BuildContext context) {
    return _shimmerWrap(
      Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: IntrinsicHeight(
          child: Row(
            children: [
              Container(
                width: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(16),
                    bottomLeft: Radius.circular(16),
                  ),
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          _box(width: 80),
                          const Spacer(),
                          _box(width: 60, height: 20, radius: 10),
                        ],
                      ),
                      const SizedBox(height: 10),
                      _box(width: 120),
                      const SizedBox(height: 8),
                      _box(width: 180),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── SkeletonListView ──────────────────────────────────────────────────────────

class SkeletonListView extends StatelessWidget {
  const SkeletonListView({
    super.key,
    required this.count,
    required this.itemBuilder,
  });

  final int count;
  final Widget Function() itemBuilder;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      itemCount: count,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, __) => itemBuilder(),
    );
  }
}
