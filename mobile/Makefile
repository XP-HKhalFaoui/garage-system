.PHONY: run-dev run-prod build-dev build-prod test test-unit test-widget clean analyze

API_URL ?= http://192.168.1.100:5000

run-dev:
	flutter run --flavor dev -t lib/main_dev.dart \
		--dart-define=API_BASE_URL=http://10.0.2.2:5000 \
		--dart-define=IS_DEBUG=true

run-dev-device:
	flutter run --flavor dev -t lib/main_dev.dart \
		--dart-define=API_BASE_URL=$(API_URL) \
		--dart-define=IS_DEBUG=true

run-prod:
	flutter run --flavor prod -t lib/main_prod.dart \
		--dart-define=API_BASE_URL=$(API_URL) \
		--dart-define=IS_DEBUG=false

build-dev:
	flutter build apk --flavor dev -t lib/main_dev.dart \
		--dart-define=API_BASE_URL=$(API_URL) \
		--dart-define=IS_DEBUG=true

build-prod:
	flutter build apk --release --flavor prod -t lib/main_prod.dart \
		--dart-define=API_BASE_URL=$(API_URL) \
		--dart-define=IS_DEBUG=false

build-ios-prod:
	flutter build ios --release --flavor prod -t lib/main_prod.dart \
		--dart-define=API_BASE_URL=$(API_URL) \
		--dart-define=IS_DEBUG=false

test:
	flutter test

test-unit:
	flutter test test/unit/

test-widget:
	flutter test test/widget/

test-widget-update:
	flutter test test/widget/ --update-goldens

test-integration:
	flutter test test/integration/ --flavor dev

clean:
	flutter clean && flutter pub get

analyze:
	flutter analyze

gen:
	dart run build_runner build --delete-conflicting-outputs
