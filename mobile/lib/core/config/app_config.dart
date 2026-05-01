class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000',
  );
  static const String appName = String.fromEnvironment(
    'APP_NAME',
    defaultValue: 'Garage System',
  );
  static const bool isDebug = bool.fromEnvironment(
    'IS_DEBUG',
    defaultValue: true,
  );
}
