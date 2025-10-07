# TODO

- [ ] Restore the project to the Expo SDK 54 toolchain (or update the SQLite service to match Expo 50 APIs) so the database layer can run without regressions.
- [ ] Configure `EXPO_PUBLIC_API_BASE_URL` (see `config/index.ts`) when pointing the app at a real backend.
- [ ] Add `EXPO_PUBLIC_ENV` to the build pipeline and document supported values in the README.
- [ ] Update `app.json` bundle identifiers, permissions, and plugin config across build environments.
- [ ] Wire the new `services/apiClient.ts` and database service together for live sync once backend endpoints are ready.
- [ ] Hook up authentication screens to real API responses and persist tokens via the API client helpers.
- [ ] Audit dependency warnings (`npm audit`) and address high severity findings before release.
- [ ] Ensure the backend login response returns `access_token`, `refresh_token`, and `user` in the shape expected by `AuthContext`.
- [ ] Update `LoginScreen` to capture and submit optional TOTP codes when required.
- [ ] Define UX for token refresh failures (e.g., redirect to login or show a toast) and implement it.
