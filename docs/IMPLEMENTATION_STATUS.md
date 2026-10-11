# Implementatiestatus — 11 oktober 2026

De technische blauwdruk blijft de productrichting. Deze implementatie is een testbaar prototype; niet alle onderzoeksgates zijn bewezen.

## Geïmplementeerd

- React/TypeScript/Vite-app, Nederlands en responsief, met eigen lokale assets.
- Campagnes, sessies, zelf toevoegen en bewerken, afronden van scènes, versievaste menselijke correcties, conflicten, verwijderen en Markdown-export.
- Transactionele IndexedDB-opslag, zichtbaar opslaan en bescherming tegen verouderde writes uit andere tabbladen.
- AudioWorklet-microfoon, 16 kHz mono, energie-VAD als expliciete baseline, pre-/post-roll, overlap, brontijden, begrensde wachtrij en pauzeren bij druk of achtergrondgebruik.
- Echte Gemma 4 E2B- en Ultravox 1B-adapters in een worker, gepinde revisies en SHA-256-gewichtscontroles. Eén geladen model, direct of twee sequentiële taken op datzelfde model. Geen cloudfallback.
- Modelkeuze, downloadvoortgang, lokale cache, wissen, providercontrole, eigen audiotest en expliciete kwaliteitsbevestiging voordat live luisteren mogelijk is.
- Testmodus met realtime/throughput, instelbare chunking, contextbudget, quantisatie per providerprofiel, thinking waar ondersteund, markers/JSON, bronhashes, totale tijden, RTF, realtime p95-vertraging, menselijke score en metadatadiagnostiek.
- Begrensde tijdelijke transcriptcontext, huidige scène, eerdere scènes en relevante bevestigde campagnetermen. Menselijke correcties krijgen voorrang.
- Woordenboekkandidaten uit oude tekst met frequentie en voorbeeld, uitsluitend na menselijke bevestiging toegevoegd.
- Offline app-shell, lokale WASM-assets en modelspecifieke cache. Geen audio in IndexedDB, Cache Storage of exports.
- Unit-/integratietests, browsercontroles en CI.

## Nog niet bewezen of bewust experimenteel

- Een echte Ultravox/WASM-proef in Chromium 154 op deze cloudmachine bewees downloaden met gewichtscontrole, offline herladen en audio-inferentie zonder externe netwerkrequests. De directe route gaf op het Engelse testfragment echter een algemene weigering en nul notitievoorstellen. De kwaliteitsgate bleef dicht. Deze configuratie is daarmee niet inhoudelijk goedgekeurd.
- Die directe proef verwerkte 13 seconden audio in circa 197,49 seconden (RTF 15,19), op één CPU-thread zonder WebGPU-adapter. Dit is geen realtime configuratie en geen Pixel-meting.
- De tweestapsroute op hetzelfde fragment kostte circa 587,01 seconden (RTF 45,15), eveneens zonder externe requests. De uitvoer verzon D&D-gebeurtenissen en volgde het markerprotocol niet; er werden nul notitievoorstellen geaccepteerd. Ook deze route haalt de inhoudelijke gate niet. Een technisch voltooide run is dus nadrukkelijk geen goedgekeurd modelrecept.
- Gemma-inferentie en WebGPU-compatibiliteit zijn niet automatisch bewezen door installatie of een modelkaart. De app vereist een proef op het concrete toestel.
- Nederlandse/Vlaamse feitelijke kwaliteit, realtime 30–60 s notitievertraging, maximaal circa 4 GB totaal browsergeheugen en 30–60 minuten thermische stabiliteit op Pixel 6a vereisen fysieke toesteltests met legaal gebruikersmateriaal.
- De energie-VAD en eenvoudige streaming box-filterresampling zijn baselines; Silero/WebRTC-VAD en betere resampling moeten op dezelfde audio worden vergeleken.
- Er is geen claim dat handmatige kwaliteitsbevestiging alle hallucinatierisico's afdekt. De bevestiging geldt alleen voor de geladen configuratie en modelworker.

## Verdere productwerkzaamheden uit de blauwdruk

- Voxtral, andere runtimes, vrij te kiezen kwantisatieprofielen en modelmanifestimport.
- Silero-VAD, semantische scènevoorstellen met graceperiode, uitgebreidere memory-samenvattingen, tokenizergebaseerde budgettering en fuzzy woordenboeksuggesties.
- Aparte encodering/prefill/decode-profielen, automatische experimentmatrices, WER/CER/entity-recall met referenties en rijkere vergelijkingsgrafieken.
- Geavanceerde hersteltests voor GPU-device-loss/OOM, storage eviction, migraties naar nieuwe databaseschema's, meer mobiele toegankelijkheidscontroles en import van volledige back-ups.

Deze onderdelen zijn niet stilzwijgend als voltooid gemarkeerd. De app bevat geen demo-notities of fictieve modelresultaten om de ontbrekende hardwaremetingen te verbergen.

## Uitgevoerde controles

- Productiebuild, ESLint, Prettier en 23 unit-/integratietests geslaagd.
- Vier Chromium-browsertests geslaagd: offline notities, woordenboekbevestiging, mobiele weergave en test-/microfoonbediening. De laatste gebruikt een expliciete modelstub en bewijst geen inferentiekwaliteit.
- Twee echte Ultravox-runs met gepinde gewichten in een normaal Chromium 154-profiel, WASM op één thread, q4-audio/decoder en q8-embeddings, 128 uitvoertokens per aanroep, markers en throughput. Offline herladen en beide inferentieaanroepen slaagden; de inhoudelijke beoordelingen faalden zoals hierboven beschreven.
- Het 13-secondenfragment kwam uit het publieke Transformers.js-voorbeeldbestand `Xenova/transformers.js-docs/resolve/main/mlk.wav`; het is Engelstalig en geen Nederlandse D&D-benchmark. SHA-256 van de gedecodeerde PCM: `95a621f5f15d1322c44b9b55725d837477288601477fbae2c670b8aff4c3ff66`. Audio en modelgewichten staan niet in de repository.
- Gemma-preprocessing met gepinde tokenizer/processorbestanden gecontroleerd op één seconde synthetische stilte; dit bewijst geen Gemma-inferentie.
