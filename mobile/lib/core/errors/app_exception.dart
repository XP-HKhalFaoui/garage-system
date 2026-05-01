sealed class AppException implements Exception {
  const AppException();

  String get userMessage;
}

class NetworkException extends AppException {
  const NetworkException(this.message);
  final String message;

  @override
  String get userMessage => message;
}

class UnauthorizedException extends AppException {
  const UnauthorizedException();

  @override
  String get userMessage => 'Session expirée. Veuillez vous reconnecter.';
}

class NotFoundException extends AppException {
  const NotFoundException(this.resource);
  final String resource;

  @override
  String get userMessage => '$resource introuvable.';
}

class ValidationException extends AppException {
  const ValidationException(this.errors);
  final Map<String, List<String>> errors;

  @override
  String get userMessage => errors.values.expand((e) => e).join('\n');
}

class ConflictException extends AppException {
  const ConflictException(this.message);
  final String message;

  @override
  String get userMessage => message;
}

class ServerException extends AppException {
  const ServerException([this.message = 'Erreur serveur. Réessayez.']);
  final String message;

  @override
  String get userMessage => message;
}
