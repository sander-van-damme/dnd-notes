# Ontwikkelen en testen

## Starten

- Node.js 24, npm en een moderne Chromium-browser. Versies van alle dependencies staan exact in `package.json` en `package-lock.json`.
- `ONNXRUNTIME_NODE_INSTALL=skip npm ci`: installeert de vastgelegde dependencies. De optionele native CUDA-binaries zijn niet nodig voor browserinferentie. Package-integriteit blijft gecontroleerd door npm.
- `npm run dev`: Vite op poort 5173. Geen service worker in de ontwikkelmodus.
- `npm run build && npm run preview`: productiebuild op poort 4173, inclusief lokale ONNX/WASM-assets en de offline app-shell.
- De bestaande checkout volstaat; cloudtaken hebben al een geïsoleerde omgeving. Maak geen extra Git-worktree tenzij daar expliciet om gevraagd wordt.

De app gebruikt geen backend, databasecontainer, API-key, externe inferentie of account. Een modeldownload gebeurt uitsluitend na een gebruikersactie. Daarvoor zijn `huggingface.co` en de bijbehorende Hugging Face CDN/Xet-bestandsdomeinen nodig; tijdens verwerking staan remote modelrequests uit.

## Controles

```bash
npm run lint
npm run format:check
npm test
npm run build
npm run test:e2e
```

De browsertests gebruiken `/usr/bin/chromium`. Zet `CHROMIUM_PATH` als jouw Chromium elders staat. Alternatief:

```bash
npx playwright install chromium
CHROMIUM_PATH=$(node -e "console.log(require('playwright').chromium.executablePath())") npm run test:e2e
```

CI installeert ook de Linux-browserdependencies. De normale tests downloaden geen modellen. De modelworkerstubs in de integratietests controleren alleen de appkoppeling, automatisch laden, modelhergebruik, logexport en opslagprivacy; ze bewijzen geen modelkwaliteit. Pure tests controleren revisieconflicten, dubbele resultaten, gedachtefiltering, parsers, transactionele opslag, audiotijdstempels, wachtrijlimieten, annuleren en gewichtschecksums.

## Echt model testen

1. Gebruik HTTPS en een browser met WebGPU en `shader-f16`. CPU-inferentie is verwijderd. ONNX gebruikt intern nog WASM-runtimebestanden voor de WebGPU-engine; dit is geen CPU-fallback.
2. Open het instellingenicoon → **Lokale modellen**. De Gemma-tegel toont de volledige WebGPU-downloadgrootte, aanwezige bytes en installatiestatus. Alleen een complete set van ONNX-gewichten, externe `.onnx_data`-bestanden en processorbestanden geldt als geïnstalleerd. Een oudere gecachete revisie toont **Bijwerken** wanneer deze app een nieuwere gepinde revisie vereist. Er wordt niet automatisch een willekeurige upstream-modelversie geladen.
3. **Downloaden** bewaart de benodigde bestanden en controleert de gewichtschecksums. Een onderbroken download kan hervatten. **Start luisteren** en **Start test** doen het laden automatisch, inclusief downloaden van ontbrekende bestanden indien nodig. Na een geslaagde test of opname blijft dezelfde modelworker beschikbaar. Alleen expliciet annuleren, verwijderen, sluiten/herladen of een fatale runtimefout beëindigt hem.
4. Gebruik **Testlaboratorium** met een kort eigen fragment. Controleer de uitvoer op namen, feiten en verzinsels. Beoordeling is geen verplichte ontgrendeling voor live sessies. Deze wijziging volgt de actuele gebruikersinstructie; modelkwaliteit blijft experimenteel.
5. Sluit de pagina, open haar offline en herhaal een korte proef. Test snelheid, geheugen en temperatuur vervolgens op het doeltoestel, inclusief Pixel 6a. De cloudtestomgeving heeft geen bruikbare WebGPU-adapter; tests met workerstubs bewijzen geen GPU-inferentie.

`npm run test:model` is een optionele echte Gemma-proef. Start eerst de productiepreview en gebruik `AUDIO_FIXTURE=/pad/naar/fragment.wav npm run test:model`. Zet eventueel `HEADLESS=0` en `MODEL_PROFILE_DIR=/pad/naar/testprofiel` om een zichtbaar, blijvend browserprofiel te gebruiken. Zonder profielpad wordt het tijdelijke profiel na afloop verwijderd. De eerste proef downloadt meerdere GB. Het script weigert een machine zonder WebGPU met `shader-f16`; het bevat geen modelstub.

## Modelproblemen en logs

**Logs exporteren** staat onderaan iedere pagina en in het instellingenmenu. Het bestand bevat de volledige buildcommit, browsermogelijkheden, cachestatus, laadfasen, percentages, timers en foutmeldingen. Het bevat geen audio, notities, campagnenamen of modeluitvoer. Het log is begrensd en blijft in RAM tot herladen. Vermeld de zichtbare buildcommit bij een bugmelding.

Transformers.js 4.3.1 kan een ontbrekend extern ONNX-gewicht in een async Promise executor laten vastlopen. De worker controleert daarom eerst de volledige gepinde Gemma-bestandsset, downloadt ontbrekende delen vóór het initialiseren, en meldt onvolledige offline caches direct. Gewichten worden streaming op SHA-256 gecontroleerd. Onbehandelde worker-rejections worden zichtbaar; vier minuten zonder workerrespons beëindigt een hangende opdracht met een gelogde fout. Een inactief geladen model heeft geen timeout.

De library geeft de revisie niet overal door bij tokenizer-metadata. De worker legt daarom ook het URL-template vast op de modelrevisie. Bij inferentie staan remote requests uit. Ultravox is verwijderd wegens onbruikbare weigeringen en verzonnen uitvoer; de gebruikte lokale adapter biedt geen ondersteunde schakelaar om dit gedrag uit te zetten.

## Hosting en offline gebruik

### Cloudflare Pages

Gebruik de Git-integratie van **Cloudflare Pages** met deze instellingen:

- Build command: `npm run build:cloudflare`
- Build output directory: `dist`
- Root directory: de repositoryroot
- Environment variables: `NODE_VERSION=24` en `ONNXRUNTIME_NODE_INSTALL=skip` (ook tijdens dependency-installatie).

Dit script bouwt de app en offline shell en verdeelt de WASM-runtime in lokale bestanden kleiner dan de Pages-limiet van 25 MiB. De modelworker voegt die bij het laden in RAM samen voor ONNX Runtime. De runtime blijft op dezelfde website staan en werkt ook uit de offline app-cache. `_headers` wordt automatisch naar `dist` gekopieerd. Er zijn geen Pages Functions, API-sleutels of apart gehoste runtimebestanden nodig. Gebruik Pages, niet het standaard Workers-deploycommando `wrangler deploy`.

### Algemene statische hosting

Publiceer de inhoud van `dist/` via HTTPS. `public/_headers` bevat voorbeeldheaders voor hosts die dit formaat ondersteunen. Configureer ze anders zelf:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: credentialless`
- de CSP en `Referrer-Policy` uit `_headers`.

Vite dev/preview geeft de isolatieheaders mee. Mobiele toegang via een LAN-IP zonder HTTPS biedt geen microfoon/secure context. Een cloud- of desktopbrowser is geen vervanging voor een echte Pixel-test.

De service worker cachet alleen de versievastgelegde app-shell en lokale runtime-assets. Modellen staan in een aparte cache. Hij onderschept geen externe requests en bewaart geen audio. Een update wacht tot bestaande tabs gesloten zijn; geen geforceerde reload tijdens een sessie. Controleer offline na een volledig afgeronde service-workerinstallatie. Browseropslag kan worden geweigerd, geleegd of verwijderd door het besturingssysteem; exporteer belangrijke notities.

## Architectuur en privacy

- `src/core/state.ts`: één reducer voor modelvoorstellen en menselijke acties. Afgeronde scènes zijn voor AI onveranderlijk. Late resultaten worden apart ter beoordeling gezet; geaccepteerde voorstellen komen in de huidige scène.
- `src/core/storage.ts` en `store.ts`: IndexedDB-snapshot en begrensd metadatajournal in één transactie, met versiecontrole tussen tabbladen. Opslagfouten worden zichtbaar; verdere writes stoppen en in-memory notities blijven exporteerbaar.
- `src/audio`: AudioWorklet, streaming resampling, energie-VAD en segmentworker. Pauzes blijven zichtbaar in brontijden, overlap blijft expliciet. Microfoon en bestandsproeven gebruiken dezelfde segmenter en begrensde wachtrij (90 s wachtende audio plus één actief fragment).
- `src/model`: disposable inferenceworker, modelafhankelijke preprocessing, echte lokale Transformers.js-aanroepen en streaming gewichtsverificatie. Stoppen/annuleren beëindigt de worker; er draait maximaal één model. Annuleren vereist opnieuw laden.
- `src/core/engine.ts`: sessiecontroller, tijdelijke transcriptcontext, sequentiële verwerking, monotone audio-intervallen en testmetingen.
- `src/core/output.ts`: veilige JSON/markerparser. Onleesbare output wordt gemeld, niet verzonnen. Volledige én afgebroken reasoningblokken worden verwijderd.

Audio wordt alleen in RAM gedecodeerd/verwerkt, via buffers overgedragen en na gebruik gewist/vrijgegeven. Er zijn geen MediaRecorder-bestanden, uploadfuncties, analytics of audio-opslaginterfaces. Bestandsproeven zijn begrensd tot 80 MB gecomprimeerd en 30 minuten audio; browserdecodering kan vóór de duurcontrole al veel RAM vragen. Kies op mobiele toestellen korte fragmenten.

Het notitie-exportbestand bevat expliciet gekozen tekst. Diagnostiek bevat alleen technische metadata. Testexport laat het optionele referentieverslag weg. Modelantwoord/transcript blijven tijdelijk; testresultaten slaan configuratie, meetwaarden, bronhash en een optionele menselijke beoordeling op. Verwijderen van een sessie wist de bijbehorende notities en conflicten. Het metadatajournal bevat geen notitietekst.

## Eerlijke meetgrenzen

RTF is modelverwerktijd gedeeld door unieke invoerduur, inclusief stiltes in die input. De realtime simulatie rapporteert notitievertraging; throughput doet daar geen realtimeclaim over. Niet uitgevoerde, mislukte en geannuleerde runs blijven herkenbaar. Een run zonder spraakfragmenten is geen geslaagde modeltest.

De UI rapporteert browseropslag, geen verzonnen GPU-/RAM-gebruik. Tokens en totale inferentietijd komen uit de echte aanroep; losse audio-encoder-, prefill- en decodefasen worden nog niet afzonderlijk gemeten. Menselijke kwaliteitsscores zijn geen automatische ground truth.
