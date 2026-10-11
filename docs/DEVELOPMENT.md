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

CI installeert ook de Linux-browserdependencies. De normale tests downloaden geen modellen. De modelworkerstub in één integratietest controleert alleen de appkoppeling, kwaliteitsgate en opslagprivacy; hij bewijst geen modelkwaliteit. Pure tests controleren revisieconflicten, dubbele resultaten, gedachtefiltering, parsers, transactionele opslag, audiotijdstempels, wachtrijlimieten, annuleren en gewichtschecksums.

## Echt model testen

1. Open de productiebuild via HTTPS of lokaal op dezelfde machine.
2. Kies **Lokale modellen**. Selecteer Gemma 4 of Ultravox en de provider. Gemma/WebGPU vereist `shader-f16`. WebAssembly is een experimentele, meestal veel tragere CPU-optie; een providerkeuze is geen compatibiliteitsgarantie.
3. Download en laad het model. In `src/model/catalog.ts` zijn repository, revisie, licentie, audiolimiet en kwantisatie vastgelegd. `assets.json` bevat de bestandsnamen, lengtes en SHA-256 uit de Hugging Face-tree op de vastgelegde revisies. Gewichten worden streaming geverifieerd, ook als ze al in de cache staan. Een fout vraagt om opnieuw downloaden; controle wordt nooit uitgeschakeld.
4. Kies **Testlaboratorium**, selecteer een eigen legaal audiofragment van 10–30 seconden en voer een proef uit. Controleer taal, namen, feiten en onzekerheid. Bevestig de configuratie alleen als de notities werkelijk kloppen. Alleen deze geladen configuratie wordt voor live sessies vrijgegeven. Ontladen of herladen vereist een nieuwe test.
5. Vergelijk dezelfde input met beide strategieën (direct versus transcript + notities op hetzelfde model), uitvoerprotocollen en ondersteunde thinkinginstellingen. Tests verlopen na elkaar. Vergelijk koude/warme runs apart; een eerste run na laden bewijst niet dat alle hardwarecaches koud zijn.
6. Ontlaad het model, zet netwerk uit, herlaad de pagina en laad uit de lokale cache. Herhaal de audiotest. Een bestandsaantal in de cache alleen bewijst geen offline gereedheid.
7. Test pas daarna een live sessie. Vraag toestemming aan tafelgenoten. Gebruik een echte Pixel 6a voor prestaties, microfoonkwaliteit, permissies, achtergrondgedrag, temperatuur en geheugen.

Een optionele automatisering met echte gewichten staat in `scripts/smoke-model.mjs`. Hij gebruikt de echte Ultravox-adapter in Chromium/WASM, test modelherstart uit cache zonder netwerk en voert audio-inferentie uit. Hij verwacht extern voorbereide fixtures; gewichten en audio horen niet in Git:

```bash
# Start eerst npm run preview.
MODEL_FIXTURE_DIR=/pad/naar/gecontroleerde-ultravox-bestanden \
AUDIO_FIXTURE=/pad/naar/toegestaan-fragment.wav \
npm run test:model
```

De test gebruikt een eigen tijdelijk, normaal browserprofiel. Grote Cache Storage-writes faalden in Chromiums privémodus; gewone Playwright-contexten zijn daarom voor deze specifieke modeltest niet representatief. Het profiel wordt na afloop verwijderd.

Standaard gebruikt deze controle de tweestapsstrategie; zet `MODEL_STRATEGY=direct` voor de directe route. Een technische PASS betekent uitsluitend dat laden, offline herladen en de echte inferentieaanroep slagen zonder externe requests. Het script rapporteert daarnaast de daadwerkelijke uitvoer en het aantal notitievoorstellen. Een weigering of onbruikbare tekst is geen inhoudelijke PASS; de app vereist een afzonderlijke menselijke kwaliteitscontrole.

Transformers.js 4.3.1 geeft de revisie niet overal door bij tokenizer-metadata. De worker legt daarom ook het URL-template vast op de modelrevisie en controleert de uiteindelijke requestpaden. Modelgewichten worden vóór ONNX-bufferallocatie streaming geverifieerd en opgeslagen; mislukte cache-writes zijn zichtbaar als laadfout.

De fixturemap bevat de ongewijzigde bestanden uit Ultravox-revisie `1ccaedd19b01bc50b5257800ea8b90f53a5cbffa`: `config.json`, `preprocessor_config.json`, `processor_config.json`, `tokenizer.json`, `tokenizer_config.json`, `onnx/audio_encoder_q4.onnx`, `onnx/embed_tokens_quantized.onnx`, `onnx/decoder_model_merged_q4.onnx`. De test routeert uitsluitend die exacte repository/revisie naar een tijdelijke lokale fileserver; de adapter en SHA-256-controles blijven actief. Het laden via deze fixture omzeilt geen integriteitscheck, maar valideert niet de externe CDN-route van een eindgebruiker.

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
