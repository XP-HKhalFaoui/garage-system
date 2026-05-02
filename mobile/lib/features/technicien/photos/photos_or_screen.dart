import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:image_picker/image_picker.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'dart:io';
import '../../../core/api/api_client.dart';
import '../../../core/api/endpoints.dart';
import '../../../core/config/app_config.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/widgets/async_value_widget.dart';

class _Photo {
  const _Photo({required this.id, required this.url, required this.type});
  final String id;
  final String url;
  final String type; // 'avant' | 'apres'
}

final photosProvider =
    FutureProvider.autoDispose.family<List<_Photo>, String>((ref, orId) async {
  final api = ref.watch(apiClientProvider);
  final list = await api.get<List<dynamic>>(
    Endpoints.orPhotos(orId),
    fromJson: (d) => d as List<dynamic>,
  );
  return list
      .map((e) {
        final m = e as Map<String, dynamic>;
        return _Photo(
          id: m['id'] as String,
          url: m['url'] as String,
          type: (m['type'] as String? ?? 'avant').toLowerCase(),
        );
      })
      .toList();
});

class PhotosOrScreen extends HookConsumerWidget {
  const PhotosOrScreen({
    super.key,
    required this.orId,
    required this.immatriculation,
  });

  final String orId;
  final String immatriculation;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final photos = ref.watch(photosProvider(orId));
    final uploadingType = useState<String?>(null);

    Future<void> pickAndUpload(String type) async {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1280,
        imageQuality: 75,
      );
      if (picked == null) return;

      uploadingType.value = type;
      try {
        final api = ref.read(apiClientProvider);
        // Multipart upload
        final file = File(picked.path);
        final bytes = await file.readAsBytes();
        // POST as multipart form data via raw dio
        await api.post<void>(
          Endpoints.orPhotos(orId),
          body: {
            'type': type,
            'file': picked.path,
          },
        );
        ref.invalidate(photosProvider(orId));
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(e.toString()), backgroundColor: Colors.red));
        }
      } finally {
        uploadingType.value = null;
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Photos — $immatriculation'),
      ),
      body: photos.when(
        loading: () => const LoadingWidget(),
        error: (e, _) => ErrorStateWidget(exception: e, onRetry: null),
        data: (list) {
          final avant = list.where((p) => p.type == 'avant').toList();
          final apres = list.where((p) => p.type == 'apres').toList();
          return Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _PhotoSection(
                        title: 'Avant intervention',
                        photos: avant,
                        badgeColor: Colors.blue,
                        orId: orId,
                        onDeleted: () => ref.invalidate(photosProvider(orId)),
                        uploading: uploadingType.value == 'avant',
                      ),
                      const SizedBox(height: 24),
                      _PhotoSection(
                        title: 'Après intervention',
                        photos: apres,
                        badgeColor: Colors.green,
                        orId: orId,
                        onDeleted: () => ref.invalidate(photosProvider(orId)),
                        uploading: uploadingType.value == 'apres',
                      ),
                    ],
                  ),
                ),
              ),
              // Bottom buttons
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: uploadingType.value != null
                              ? null
                              : () => pickAndUpload('avant'),
                          icon: const Icon(Icons.camera_alt),
                          label: const Text('Photo avant'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: uploadingType.value != null
                              ? null
                              : () => pickAndUpload('apres'),
                          icon: const Icon(Icons.camera_alt),
                          label: const Text('Photo après'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      OutlinedButton.icon(
                        onPressed: uploadingType.value != null
                            ? null
                            : () async {
                                final picker = ImagePicker();
                                await picker.pickImage(
                                    source: ImageSource.gallery);
                              },
                        icon: const Icon(Icons.photo_library),
                        label: const Text('Galerie'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _PhotoSection extends ConsumerWidget {
  const _PhotoSection({
    required this.title,
    required this.photos,
    required this.badgeColor,
    required this.orId,
    required this.onDeleted,
    required this.uploading,
  });

  final String title;
  final List<_Photo> photos;
  final Color badgeColor;
  final String orId;
  final VoidCallback onDeleted;
  final bool uploading;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(title,
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: badgeColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text('${photos.length}',
                  style:
                      TextStyle(color: badgeColor, fontSize: 12)),
            ),
            if (uploading) ...[
              const SizedBox(width: 8),
              const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2)),
            ],
          ],
        ),
        const SizedBox(height: 12),
        if (photos.isEmpty)
          Container(
            height: 120,
            decoration: BoxDecoration(
              border: Border.all(
                  color: Colors.grey.shade300, style: BorderStyle.solid),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Center(
              child: Text('Aucune photo',
                  style: TextStyle(color: Colors.grey.shade400)),
            ),
          )
        else
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
            ),
            itemCount: photos.length,
            itemBuilder: (_, i) => _PhotoCard(
              photo: photos[i],
              orId: orId,
              onDeleted: onDeleted,
            ),
          ),
      ],
    );
  }
}

class _PhotoCard extends ConsumerWidget {
  const _PhotoCard({
    required this.photo,
    required this.orId,
    required this.onDeleted,
  });

  final _Photo photo;
  final String orId;
  final VoidCallback onDeleted;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () => _showFullScreen(context),
      onLongPress: () => _confirmDelete(context, ref),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: CachedNetworkImage(
          imageUrl: '${AppConfig.apiBaseUrl}${photo.url}',
          fit: BoxFit.cover,
          placeholder: (_, __) => Container(
            color: Colors.grey.shade200,
            child: const Center(child: CircularProgressIndicator()),
          ),
          errorWidget: (_, __, ___) => Container(
            color: Colors.grey.shade200,
            child: const Icon(Icons.broken_image),
          ),
        ),
      ),
    );
  }

  void _showFullScreen(BuildContext context) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(backgroundColor: Colors.black),
        body: InteractiveViewer(
          child: Center(
            child: CachedNetworkImage(
              imageUrl: '${AppConfig.apiBaseUrl}${photo.url}',
              fit: BoxFit.contain,
            ),
          ),
        ),
      ),
    ));
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Supprimer cette photo ?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Annuler')),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    if (confirmed == true && context.mounted) {
      try {
        final api = ref.read(apiClientProvider);
        await api.delete(Endpoints.orPhoto(orId, photo.id));
        onDeleted();
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(e.toString())));
        }
      }
    }
  }
}
