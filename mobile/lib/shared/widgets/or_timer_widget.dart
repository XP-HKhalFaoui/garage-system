import 'dart:async';
import 'package:flutter/material.dart';
import '../models/ordre_reparation.dart';

class ORTimerWidget extends StatefulWidget {
  const ORTimerWidget({
    super.key,
    required this.orId,
    required this.status,
    required this.accumulatedMinutes,
    this.startTime,
    this.fontSize = 28,
  });

  final String orId;
  final DateTime? startTime;
  final ORStatut status;
  final int accumulatedMinutes;
  final double fontSize;

  @override
  State<ORTimerWidget> createState() => _ORTimerWidgetState();
}

class _ORTimerWidgetState extends State<ORTimerWidget> {
  Timer? _timer;
  int _seconds = 0;

  @override
  void initState() {
    super.initState();
    _initTimer();
  }

  void _initTimer() {
    _seconds = widget.accumulatedMinutes * 60;
    if (widget.status == ORStatut.enCours && widget.startTime != null) {
      _seconds += DateTime.now().difference(widget.startTime!).inSeconds;
      _startTimer();
    }
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() => _seconds++);
    });
  }

  @override
  void didUpdateWidget(ORTimerWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.status != widget.status) {
      _timer?.cancel();
      _timer = null;
      _initTimer();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String get _formatted {
    final h = _seconds ~/ 3600;
    final m = (_seconds % 3600) ~/ 60;
    final s = _seconds % 60;
    return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  Color get _color {
    if (_seconds < 7200) return Colors.green;
    if (_seconds < 14400) return Colors.orange;
    return Colors.red;
  }

  @override
  Widget build(BuildContext context) {
    final isSuspended = widget.status == ORStatut.suspendu;
    return Opacity(
      opacity: isSuspended ? 0.5 : 1.0,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (isSuspended) ...[
            Icon(Icons.pause_circle, size: 16, color: _color),
            const SizedBox(width: 4),
          ],
          Text(
            _formatted,
            style: TextStyle(
              fontSize: widget.fontSize,
              fontWeight: FontWeight.bold,
              color: _color,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
    );
  }
}
