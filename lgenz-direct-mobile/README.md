# L GenZ DIRECT Mobile

Separate Expo/React Native phone app for Android and iPhone.

## Product goal

Users speak or type in their own language. The app routes them to the correct workflow for government paperwork, jobs, affidavit/legal help, land/property, school/college, loans and after-death paperwork. Each service has separate pricing and workflow rules.

## Current MVP scaffold

- Mobile-first home screen
- Voice-first product wording and text input
- Master service categories
- Separate service registry
- Pricing helper supporting fixed prices or up-to-30%-below verified benchmark pricing
- Clear online-vs-office next-step concept

## Important rules

- Never show internal profit calculations to customers.
- Never invent competitor benchmarks.
- Government/mandatory third-party fees must remain transparent when required.
- Never bypass OTP, CAPTCHA, biometrics, e-signature or mandatory physical verification.
- Never fabricate job offers, legal facts, affidavits, certificates or signatures.
- Professional legal/medical/financial actions must be handed off when legally required.

## Run locally

```bash
cd lgenz-direct-mobile
npm install
npm start
```

Use Expo Go or an emulator for development. Production Android/iOS builds should be configured only after the app flows, backend, authentication, payments and privacy controls are reviewed.

## Next build steps

1. Add router-driven conversation screen.
2. Add login/profile and consent.
3. Add service database/backend API.
4. Add multilingual STT/TTS adapters.
5. Add job watch/notification engine.
6. Add document upload/OCR with privacy controls.
7. Add payment provider adapter.
8. Connect verified government/private service integrations one by one.
9. Add admin dashboard for pricing and service registry.
10. Package Android/iOS builds after QA.
