# DnD Notulist — technische blauwdruk

> **Status:** ontwerp- en implementatiespecificatie, 10 oktober 2026. Dit is de leidraad voor AI coding agents en ontwikkelaars. Een technische keuze die hier als *te benchmarken* staat, is **geen** bewezen prestatie of verplicht optimale configuratie. De [README](../README.md) is bewust niet-technisch.

## 1. Doel, gebruikersverhaal en succescriterium

Een speler opent DnD Notulist als webpagina op een Google Pixel 6a, laptop of tablet, selecteert een lokaal AI-model en start een Dungeons & Dragons-sessie. De applicatie luistert via de microfoon, verwerkt spraak lokaal, maakt tijdens het spel beknopte en betekenisvolle Nederlandstalige notities, en onthoudt relevante context. Spelers kunnen notities corrigeren terwijl het systeem doorgaat met luisteren.

**Productdoel:** maximaliseer correcte, bruikbare en tijdige sessienotities per eenheid compute en geheugen. Niet: een woordelijk, foutloos, permanent transcript als eindproduct.

Voorbeelden van gebeurtenissen die notities verdienen:
- NPC's en spelerspersonages; namen, rollen, motieven en beloften.
- Locaties, aanwijzingen, mysteries, quests en keuzes van de groep.
- Belangrijke dialoog, door de DM voorgelezen informatie en consequenties.
- Loot, voorwerpen, spells en opvallende wijzigingen in de situatie.
- De *uitkomst* van gevechten; niet iedere aanval of dobbelsteenworp.
- Grappige of memorabele momenten wanneer ze betekenisvol zijn.

De app verwerkt voornamelijk gesproken Vlaams/Nederlands met Engelstalige D&D-terminologie en mogelijk volledige Engelse passages. Nauwkeurigheid voor eigennamen is cruciaal. Hallucinaties en onterechte zekerheid zijn schadelijker dan een onvolledige voorlopige notitie.

### Principes (vastgelegd)

1. **Browser-first, webapp/PWA.** Geen verplichte native Android/Kotlin-app, helperproces of eigen inferentieserver. Op een ondersteund toestel volstaat de website; optionele PWA-installatie mag, maar is niet vereist.
2. **Offline en privacy-first.** Alle microfoonaudio en inferentie blijven op het toestel. Geen audio upload, telemetrie of externe AI-calls; modelbestanden worden vóór offlinegebruik eenmalig gedownload en lokaal gecachet. Geen audio-opnames persisteren op schijf.
3. **Eén multimodaal audio-naar-tekst/kennis-model tegelijk** als gewenste runtime. Geen standaard zware ASR+LLM-dubbelpipeline. Een aparte pipeline mag alleen als optionele benchmark-baseline, niet stilzwijgend als productiearchitectuur.
4. **Modelonafhankelijke businesslogica.** Modellen en inference-adapters zijn verwisselbaar. Contextbeheer, geheugen, notitie-UI, VAD, benchmarking en opslag werken onafhankelijk van modelkeuze.
5. **Transformers.js is de eerste inference-engine, geen blijvende exclusiviteit.** Andere engines (wllama v3, WebLLM) kunnen later via dezelfde grens.
6. **Menselijke correcties winnen altijd.** AI mag een gebruikersbewerking niet ongemerkt vervangen, ook niet als een langlopende inferenceaanroep later terugkeert.
7. **Realtime bruikbaarheid gaat boven maximale theoretische kwaliteit.** Nooit stilletjes audio overslaan of conclusies verzinnen wanneer de inferentiewachtrij oploopt.
8. **Meten vóór optimaliseren.** Permanente, reproduceerbare testmodus; de eerste echte doelstelling is een werkende browser-inferentie op Pixel 6a.
9. **Deterministische JavaScript/TypeScript-logica waar mogelijk.** Gebruik het model voor audioherkenning, semantische interpretatie en redactie; laat JS grenzen, IDs, contextselectie, versiebeheer, opslaan, samenvoegen en validatie uitvoeren.
10. **Functionele eenvoud.** Vermijd premature frameworks, vector databases, agentorchesters, complexe retrievallagen, fine-tuning of grote promptwoordenboeken.

### Richtwaarden, nog NIET aangetoond

- Doelapparaat: **Google Pixel 6a** als zwakste belangrijke toestel; ook laptops en tablets, mits browser/hardware ondersteund zijn.
- Streef naar circa **4 GB maximaal totaal browsergeheugen** voor model, audio, workers, WebGPU en JS samen. Dit is een **ontwerpbudget**, geen browsergarantie; Pixel 6a heeft 6 GB fysiek RAM, wat niet betekent dat een tab 6 GB krijgt.
- Streef naar zichtbare relevante notities ongeveer **30–60 seconden** na een gebeurtenis, zo mogelijk sneller. Harde haalbaarheid te benchmarken.
- Duurzaam realtime: totale gemiddelde verwerking moet sneller zijn dan aankomende spraak; meet niet alleen tokens/s maar ook encodertijd, context/prefill, modelinit en wachtrij.
- Initieel geen vastgeklikte ideale chunklengte, VAD-tool of thinkingmodus: laat tests beslissen.

## 2. Gebruikersmodi

### 2.1 Sessie (normale modus)

- Campagne kiezen/maken; sessie starten, pauzeren, stoppen.
- Model kiezen uit daadwerkelijk compatibele lokale modellen, met download-/opslagstatus.
- Duidelijke microfoontoestemming en korte privacyuitleg.
- Bovenaan: afgeronde, stabiele, **vrij bewerkbare** notities.
- Onderaan: lopende scène en **voorlopige** AI-notities/actieve context; correcties mogelijk. AI-inferentie en edits mogen parallel lopen.
- Kleine, begrijpelijke statusindicaties: luisteren / stilte / audio in wachtrij / model verwerkt / laatst bijgewerkt / geheugenwaarschuwing / offline status / fout. Geen debugdashboard in normale modus.
- Sessieoverzicht; notities lokaal bewaard; leesbare Markdown- of teksexport.
- Browser-inactiviteit, schermvergrendeling, permissieverlies en reload: transparante waarschuwing. Geen belofte van betrouwbaar opnemen op de achtergrond.

### 2.2 Permanente testmodus

Een volwaardige, in het product blijvende ontwikkel-/vergelijkfunctie. Hier kan een lokale, legaal gebruikte D&D-opname worden geselecteerd. Audio wordt gedecodeerd en **alleen in RAM** verwerkt; geen kopie opslaan in IndexedDB, Cache Storage of logexport. Herselecteren na reload is acceptabel.

Testinstellingen:
- Model en exacte versie/revisie; runtime/provider (bijv. Transformers.js WebGPU, WebAssembly-fallback), quantization en relevante decodeconfiguratie.
- Thinking **uit / aan / beperkte reasoning**, **alleen indien daadwerkelijk ondersteund** door het gekozen model/runtime. 'Beperkt' kan een promptstrategie zijn, niet noodzakelijk een echte modelmodus. Geen universele thinking-toggle beloven. Het schone eindantwoord en eventuele interne reasoning gescheiden houden; interne reasoning nooit automatisch in geheugen/notities invoegen.
- Chunking: lengte, pauzestrategie, overlap, context-/lookbackbudget en VAD-configuratie.
- Taakstrategie: één multimodale aanroep voor transcript+updates, versus meerdere opeenvolgende calls op **hetzelfde geladen model** (bijv. transcript, events, samenvatting). Vergelijk kwaliteit én totale latency/compute; voorkom dubbel laden.
- Outputprotocol: vrije tekst, korte sectiemarkers/DSL, compacte JSON, of model-native constrained decoding indien engine dat betrouwbaar ondersteunt; eveneens een testvariabele.
- Context: venstergrootte, aanwezige lagen, eventueel woordenboek en tokenbudget.
- Realtime simulatie: voer audio aan volgens originele tijdlijn inclusief echte stiltes; registreer backlog en end-to-end note-lag.
- Throughputmodus: verwerk chunks zo snel mogelijk zonder te wachten op oorspronkelijke afspeeltijd; afzonderlijk labelen zodat resultaten niet verward worden.
- Tests **na elkaar** op hetzelfde toestel, met gelijke koude/warme starts en vergelijkbare thermische/batterijomstandigheden; niet tegelijkertijd meerdere zware modellen laden.
- Een optioneel menselijk referentieverslag met concrete, beoordeelbare feiten/gebeurtenissen; scores mogen handmatig beoordeeld worden.

Testmodus gebruikt dezelfde productie-VAD, scheduler, state machine, contextbuilder en notitieverwerker. Verander uitsluitend de inputbron/klok en de geconfigureerde experimentparameters. Output: vergelijkingsscherm plus lokaal te exporteren diagnostische JSON (eventueel ZIP met rapport), zonder audio.

## 3. Voorgestelde technische stack

- **TypeScript** voor alle niet-modelspecifieke logica; framework bij voorkeur React met Vite voor snelle webontwikkeling, maar klein en onderhoudbaar houden.
- **Transformers.js** voor modelaanroepen; ONNX Runtime Web via beschikbare execution providers (WebGPU waar mogelijk). **Controleer altijd werkelijk ondersteunde modaliteit/modelarchitectuur/per-browser combinatie.** Niet iedere ONNX-conversie werkt op iedere WebGPU-adapter.
- **Web Audio API + AudioWorklet** voor continue audiocaptatie met lage overhead; resample naar het formaat dat de concrete modeladapter vereist. Vermijd de UI-thread voor audio/inferentie.
- **Web Workers** voor VAD/scheduler, audio preprocessing en/of inferentie. Let op overdracht van buffers en kopieën; voorkom duplicatie van grote tensor-/audiobuffers.
- **IndexedDB** voor sessies, notities, correcties, campagnewoordenboek, testconfiguraties, modelmetadata en samenvattingen; gebruik versiebeheer/migraties. **Geen audioblobben of opnamebestanden in opslag.**
- **Service worker/PWA + browserstorage** voor shell en modelassets; versieer modelgewichten en preflight beschikbare opslag. Cache expliciet en controleer offline zonder CDN of runtime downloads.
- Library-opties voor VAD: [@ricky0123/vad-web](https://github.com/ricky0123/vad) (Silero/ONNX), WebRTC VAD WASM, of een lichte energiedetector als baseline. Kiezen op gemeten kwaliteit/performance.
- De app is bruikbaar zonder accounts, server, authenticatie of synchronisatie. Gegevens op Pixel en laptop zijn daardoor aanvankelijk onafhankelijk; export/import kan later privacyvriendelijke overdracht mogelijk maken.

### Technische grenzen die niet weggeabstraheerd mogen worden

- WebGPU vereist passende browser/GPU/drivers, secure context en browserlimieten. Capaciteit en GPU-resources per toestel detecteren; niet vertrouwen op theoretisch fysiek RAM.
- WebAssembly (ook Kotlin/Wasm) kan browserbeveiligings- en hardware-API-beperkingen niet omzeilen; geen native Android-bibliotheken als vereiste.
- Microfooncaptatie vereist HTTPS (of localhost) en expliciete toestemming.
- Android/Chrome kan verwerking pauzeren of tabbladen beëindigen bij achtergrondgebruik of scherm uit; houd foreground-wake-lock waar mogelijk, toon beperkingen en test gedrag.
- Persistent storage is best-effort: controleer quota, storage estimate, persist-verzoek waar beschikbaar en modelbestand-integriteit; test eviction en offline herstart.
- Geen tracking-/crashservice of automatisch extern logupload. Een browserconsole of ontwikkeltools op mobiel kan ontbreken; daarom lokale diagnostische export.

## 4. Strikte scheiding van modules

Voorgestelde grenzen, geen rigide mappenstructuur vóór een eerste werkende spike:

```text
UI (session, notes, campaigns, models, diagnostics)
 |        |
 |        +--> Experiment runner / reporting
 |
Session orchestrator (single writer, cancel/restart, lifecycle)
 |-- Audio capture / file test source / clock
 |-- VAD + speech segmentation + overlap
 |-- Chunk scheduler / bounded RAM buffer / backpressure
 |-- Context builder (3 memory tiers, glossary)
 |-- Model adapter (capability discovery)
 |     +-- Transformers.js / ONNX / WebGPU
 |     +-- future: wllama or WebLLM
 |-- Output parser + validators + deduplication
 |-- State reducer + event journal + note materializer
 |-- Local persistence (text/metadata only)
 +-- Local metrics and diagnostic exporter
```

**Geen app- of modelcode mag rechtstreeks de notitiedatabase wijzigen buiten een enkele state-reducer/commitlaag.** Modules communiceren met getypeerde berichten; user actions en AI proposals zijn verschillende eventtypen. Alle gebeurtenissen krijgen monotone sequence IDs en bron-audio tijdstempels.

### Modeladaptercontract (richtinggevend; implementeer typeveilig, zonder vendor leakage)

```ts
type ThinkingSetting = 'off' | 'on' | 'low'; // alleen ondersteunde waarden beschikbaar
type InputAudio = {
  pcm: Float32Array;         // alleen RAM
  sampleRate: number;
  startMs: number;           // tijd op sessietijdlijn
  endMs: number;
};
type ModelCapabilities = {
  audioInput: boolean;
  textOutput: boolean;
  maxAudioSeconds?: number;
  requiredSampleRate?: number;
  supportedThinking: ThinkingSetting[];
  quantizations: string[];
  maxContextTokens?: number;
};
type ProcessingRequest = {
  audio: InputAudio;
  context: string;
  task: 'transcribe_and_update' | 'transcribe' | 'extract' | 'summarize';
  thinking: ThinkingSetting;
  maxOutputTokens: number;
  baseRevision: number;
};
type ProcessingResult = {
  rawText: string;
  timing: { totalMs: number; audioMs?: number; prefillMs?: number; decodeMs?: number };
  usage?: { inputTokens?: number; outputTokens?: number; thinkingTokens?: number };
};
interface AudioModelAdapter {
  capabilities(): ModelCapabilities;
  load(onProgress: (loaded: number, total?: number) => void): Promise<void>;
  process(req: ProcessingRequest, signal?: AbortSignal): Promise<ProcessingResult>;
  unload(): Promise<void>;
}
```

**In een echte implementatie:** maak runtime-/model-specific preprocessing adapters (tokenizers, processors, special prompt markers, chat templates). Sample rates, audio windowing, audio features, max tokens, reasoning tags en promptregels zijn modelafhankelijk. De uniforme interface is een appcontract, geen aanname dat alle Transformers.js pipelines dezelfde methode of mogelijkheden hebben.

Bewaar model manifests met exacte HF repo/revision, gevraagde bestanden, hashes waar mogelijk, licentie, runtimeversie, provider, RAM-/downloadschatting, featuretests en model-adapter-ID. Activeer alleen configs die een smoke-test doorstaan; toon waarom een combinatie is uitgeschakeld. Modellen sequentieel laden en unloaden, met resource cleanup en cachebeleid.

## 5. Modelonderzoek, kandidaten en keuzeproces

De volgende opties zijn **kandidaten, geen winnaars**:

| Kandidaat | Onderzoeksvraag |
| --- | --- |
| [Gemma 4 E2B IT ONNX](https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX) | Ondersteunt compact audio→bruikbare Nederlandse notities; thinking uit/aan; laadt het op Pixel? |
| [Voxtral Mini 3B 2507 ONNX](https://huggingface.co/onnx-community/Voxtral-Mini-3B-2507-ONNX) | Hoe goed zijn NL/code-switching, audio-Q&A en langere clips; is footprint/latency haalbaar? |
| [Ultravox v0.5 Llama 3.2 1B ONNX](https://huggingface.co/onnx-community/ultravox-v0_5-llama-3_2-1b-ONNX) | Is de compacte footprint genoeg voor realtime mét voldoende semantische notitiekwaliteit? |
| Gemma 3n E2B/E4B | Vergelijk oudere/alternatieve audioroute als baseline indien moderne browserroute beschikbaar; geen voorkeur boven Gemma 4 zonder meting. |
| Nieuwe toekomstige audio-LLM's | Via nieuw manifest en adapter testen zonder corelogica te herschrijven. |

**Let op:** sommige modelrepo's vergen specifieke bestandsvarianten, een modellicentie/voorwaardenacceptatie of bijzondere processorinstellingen. Neem aantoonbaar werkende WebGPU-configuratie en licentie op in modelmanifest. Een ONNX-repo of modelkaart bewijst **niet** dat een Pixel 6a voldoende RAM of snelheid heeft.

Andere onderzochte runtimes:
- [Transformers.js](https://github.com/huggingface/transformers.js): gekozen eerste integratie; compatibele ONNX-varianten en audiodemo's.
- [wllama v3](https://github.com/ngxson/wllama): GGUF, WebAssembly en WebGPU, met multimodale image/audio input en aparte projector; toekomstige adapteroptie. GGUF alleen bewijst audio-compatibiliteit niet.
- [WebLLM](https://github.com/mlc-ai/web-llm): WebGPU/MLC-route met modelcompilatie; optie voor gerichte prestatievergelijking.
- [Amni-LLM](https://github.com/Amnibro/amni-llm): extra abstractie/eigen backend; niet nodig in initiële architectuur zonder aangetoonde voordelen.
- [MediaPipe Web / Google AI Edge](https://ai.google.dev/edge/mediapipe/solutions/genai/llm_inference/web_js): alternatief indien relevante audio-implementatie concreet werkt; Android-native is geen uitgangspunt.

Maak geen perfclaims door bestandsgrootte van quantisatie rechtstreeks gelijk te stellen aan werkgeheugen. Tel modelgewichten, encoder/projector, KV-cache, GPU-buffers, WASM-runtime, audio, JS, browseroverhead en tijdelijke buffers mee; meet end-to-end op echte toestellen.

### Thinking/reasoning

- Thinking is een **modelcapaciteit**; UI toont alleen ondersteunde toggles.
- Test dezelfde clip, context en outputdoel met thinking aan versus uit; een variant 'low' is alleen beschikbaar wanneer implementatie dat aantoonbaar ondersteunt (native parameter of expliciete promptvariant).
- Meet ook interne/zichtbare outputtokens, totale wall-clock latency, note-lag, energie/temperatuur en kwaliteit.
- Reasoning-output niet in sessiegeheugen/notities overnemen; hoogstens technische metriek; geen onbedoelde blootstelling via normale UI of exports.
- Indien het loont: toekomstige adaptieve thinking (standaard uit, alleen extra verwerking bij moeilijke scènes), met hard tijd-/tokenbudget; nog niet als bewezen optimalisatie implementeren.

## 6. Audiopipeline, VAD en segmentatie

### Gewenste verwerkingsstappen

1. Neem PCM via AudioWorklet uit de microfoon (of uit lokaal geïmporteerd testmateriaal).
2. Maak monotone sessietijdstempels; spreekbron detecteren (VAD).
3. Voeg *pre-roll* en *post-roll* toe zodat begin-/eindlettergrepen behouden blijven.
4. Bouw fragmenten rond natuurlijke pauzes, begrensd door maximale audio-invoer van gekozen model.
5. Voeg beperkte overlap toe wanneer een grens dwars door spraak valt; houd broninterval en overlap-ID bij.
6. Plaats fragmenten in een **begrensde** wachtrij. Eén groot model is tegelijk geladen; geen ongecontroleerde parallelle inference.
7. Verstuur relevante context en verwerk output als **voorstellen**; valideer, dedupliceer en commit onder concurrencycontrole.
8. Wis onnodige PCM-chunks uit RAM nadat ze veilig verwerkt zijn. Een optionele rollende RAM-terugkijkbuffer voor heranalyse heeft een **expliciete** bovengrens en wordt gewist bij sessie-einde/stop.

**VAD mag geen gaten dichtplakken als waren ze aaneengesloten spraak.** Behoud echte tijdstempels, stiltes tussen segmenten en bronafstanden. Sla geen mislukte verwerking stilzwijgend over; signaleer een gat en bied gebruikerscontrole.

VAD-keuze: benchmark Silero (vad-web/ONNX), WebRTC VAD/WASM en simpele energie-baseline met dezelfde dataset. Beoordeel CPU, initiële WASM/modeldownload, ram, latency, detectie van zachte stemmen, door elkaar praten, geroezemoes, namen, pauzes en muziek. Standaardstartpunt: Silero als hoogwaardige browserkandidaat; niet definitief totdat echt getest.

Aanvankelijke parameter-*proeven* (geen bewezen defaults): audiofragments van circa 15–30 s, grens op spraakpauze, pre-roll rond 200–500 ms en post-roll 300–800 ms, overlap circa 0,5–2 s waar nodig. Bij modellen met grotere audio-limiet mag de benchmark 45–90 s clips testen. **De ondersteunde maximale clipduur komt altijd van de modeladapter, niet van een appbrede hardcoded 30 s.**

### Verwerkingsachterstand en prioriteiten

Leg een expliciete queue policy vast. Monitor `backlogAudioMs` (wachtrijduur) en `noteLagMs` (tijd tussen gebeurtenis en zichtbare notitie). Wanneer compute < input:
- Verlaag eerst outputtokens, summary-detail en optionele thinking; verwerk audio niet automatisch twee keer.
- Bespaar modelcalls met natuurlijke spraakfragmentatie en VAD waar dat inhoudelijk veilig is.
- Markeer achterstand en mogelijk gemiste intervallen zichtbaar; geen stille skips.
- Laat de gebruiker kiezen tussen doorgaan, pauzeren of lagere kwaliteit als het toestel structureel te traag is.
- **Nooit ongemerkt uren aan audio op schijf bufferen** om alsnog een realtime indruk te geven. Bied desnoods expliciet aan de sessie te pauzeren.
- Audio die nog in RAM zit en niet verwerkt is gaat verloren bij crash/reload. Wees daar eerlijk over.

Een continue sessie vereist ook microfoonstatus, permission lifecycle, wake-lock waar beschikbaar, tab visibility en page lifecycle handlers; test grondig op Android.

## 7. Geheugen en context: drie niveaus

### L1 — rijk kortetermijngeheugen

Recente transcriptfragmenten met audio tijdsrange, onzekerheidsmarkeringen, sprekertoewijzing als mogelijk (geen gegarandeerde diarization) en openstaande onafgemaakte zinnen. Behoud ongeveer een dynamisch rolling window met **tokenbudget**, niet simpelweg 'alles van de laatste 10 minuten'. Kan worden ingekort wanneer L2 goed bijgewerkt is.

### L2 — actuele scène / werkgeheugen

Compact, gestructureerd en mutable: scene-ID, type (dialoog, verkenning, gevecht, pauze), plaats, betrokken NPC's, actieve doelen, feiten, open vragen, bedreigingen, staat en laatste update. Bevat onderscheid tussen **gehoord/ondersteund**, **AI-interpretatie** en **door gebruiker bevestigd**. Behoud bron-tijdspan/provenance waar mogelijk. Dit is de belangrijkste context voor volgende chunks.

### L3 — compacte, definitieve campagnehistoriek

Leesbare, menselijk bewerkbare, afgesloten scène-/sessienotities. Kan lange termijnen compact representeren, eventueel aparte gestructureerde named entities/quests naast tekst. AI overschrijft de definitieve tekst niet automatisch. Beperk het gedeelte dat in een nieuwe modelprompt gaat tot relevante feiten, recente samenvatting en geselecteerde campagne-entiteiten.

**De contextbuilder is deterministisch**: prioriteitsregels + tokenbudget + maximale tekstlengte per bron. Gebruik desgewenst een tekstschatter en later echte modeltokenizer waar beschikbaar. Context hoeft niet per se uit alle historische notities te bestaan.

### Scènelevenscyclus

`active → ready_to_finalize → finalized`. Het model kan een einde *voorstellen* (nieuwe locatie, uitkomst strijd, einde gesprek); JS beslist op basis van timing, toestand, expliciete gebruikeractie en eventueel korte graceperiode. Nieuwe informatie kan vóór finalisatie nog aan de werkversie toegevoegd worden. Bij een afsluiting produceert dezelfde geladen multimodale/text-capable modeladapter, eventueel in een aparte korte tekstcall, een coherente samenvatting **als dat de kwaliteit rechtvaardigt**. Niet ieder combat-actie-detail persisteren.

### Gegevensmodel (richtinggevend)

```ts
type Provenance = 'audio_observed' | 'ai_inferred' | 'user_confirmed' | 'user_corrected';
type Fact = { id: string; sceneId: string; kind: string; text: string;
  provenance: Provenance; sourceStartMs?: number; sourceEndMs?: number;
  confidence?: 'uncertain' | 'likely' | 'confirmed'; supersedes?: string };
type Scene = { id: string; status: 'active' | 'ready_to_finalize' | 'finalized';
  revision: number; location?: string; participantIds: string[];
  facts: Fact[]; scratchpad: string; finalNoteId?: string };
type Note = { id: string; sceneId?: string; markdown: string; revision: number;
  userEdited: boolean; lockedFromAI: boolean; updatedAt: string };
type Proposal = { requestId: string; baseSceneRevision: number;
  sourceChunkId: string; transcript?: string; factAdds?: Fact[];
  factCorrections?: { targetId: string; text: string }[];
  draftAppend?: string; proposeFinalize?: boolean };
```

Alle wijzigingen gaan via een reducer/eventlog in plaats van directe modelmutaties. Finalized notes zijn AI-read-only, inclusief bij later gevonden context; maak een apart suggestie-/revisieverzoek dat een mens accepteert.

### Race conditions en menselijke correcties

- Iedere inference registreert `baseRevision`, `requestId` en `sourceChunkId`.
- Gebruikersedit verhoogt onmiddellijk de revision en wordt lokaal **eerst** gecommit.
- Als een AI-resultaat op oudere revision terugkeert: per veld/feit toetsen, veilig rebasen of conflict/suggestie parkeren; **nooit** de menselijke edit overschrijven.
- Een correctie heeft een stabiel ID en wordt bij de eerstvolgende geschikte contextselectie meegenomen; schrijf geen dubbel resultaat van overlap- of retry-chunks.
- Gebruik idempotente verwerking per inputchunk/result-ID en transactionele IndexedDB-updates.
- Bij herladen: herleid tekststatus uit opgeslagen events/notities; audiobuffer is per definitie weg.

Geen extern memory-agent-framework vereist. Een eenvoudige eventjournal + typed state reducer + rolling summaries is een betere, begrijpelijke eerste implementatie dan een ongeteste memory database.

## 8. Modelprompts en uitvoerstrategie

Het model krijgt alleen wat nodig is om (a) audio goed te begrijpen, (b) nieuwe belangrijke feiten uit te halen en (c) de actieve scène bij te werken. **Laat het niet telkens de volledige notities herschrijven.**

### Minimumcontext per call

- Een korte, vaste systeembeschrijving van de taak: Nederlandse/Vlaamse D&D-sessie, English/code-switching, nooit hallucineren, onzekerheid toelaten, geen onbelangrijke gevechtsdetails.
- Actieve scène in compacte vorm.
- Alleen relevante recente transcriptregels (indien nodig voor verwijzingen zoals 'hij', 'de sleutel').
- Alleen lokaal relevante namen en spellingvoorbeelden binnen een configureerbaar tokenbudget.
- Het nieuwe audiofragment met juist modelspecifieke audio-template.

### Outputprotocol: **eerst benchmarken, dan vastzetten**

Volledig JSON uit één audio-inferentie kan mislukken bij kleine modellen; outputformaat mag nooit tot dataverlies of gefingeerde feiten leiden. Benchmark minimaal:
1. **Kort menselijk leesbaar formaat met sectiemarkers**, b.v. `TRANSCRIPT:`, `FACT:`, `UNCERTAIN:`, `END_SCENE:` (parser tolerant voor lege/misvormde velden).
2. **Compact JSON/JSONL** met alleen optionele delta's als modeloutput aantoonbaar stabiel is.
3. **Meerdere modelcalls** op hetzelfde geladen model: eerst kort transcript, daarna feiten/context, pas bij scènegrens definitieve redactie.
4. **Eén modelcall** die transcript en delta's samen levert.

Minder outputtokens is meestal gunstig voor decodekosten, maar meerdere calls kunnen extra prefill en audio-encoding veroorzaken. **Niet op voorhand beslissen**: log audio/prefill/generate tijd afzonderlijk. Denk aan cache-/prefixhergebruik waar runtime dat betrouwbaar aanbiedt, zonder KV-cache voor complete transcriptgeschiedenis onbeperkt te laten groeien.

Een parser mag valideerbare delen accepteren en problematische velden als `unparsed` of `uncertain` loggen; geen agressieve fuzzy parsing die inhoud verandert. Bescherm eindnotities. Bewaar het ruwe modelantwoord lokaal **alleen voor instelbare diagnostiek** en met expliciete bescherming bij export; modelantwoord kan privé-inhoud bevatten. Foutieve of lege output is een resultaat dat gemeten wordt, geen reden om stil te improviseren.

## 9. D&D-kennis en campagnewoordenboek

**Fase één:** probeer wat modellen zonder extra glossary al herkennen. Gebruik minimale taakcontext ('Dungeons & Dragons 5e', Nederlands/Vlaams met Engelse termen) en een paar actieve naamspellingen. Voeg geen grote officiële termenlijst in elke prompt toe.

**Campagnewoordenboek (latere fase, zonder externe AI vereist):**
- Gebruiker plakt oude sessieverslagen, die lokaal geanalyseerd worden.
- Tokenisatie voor Nederlands/Engels, casefolding, normalisatie, stopwoorden en gewone woordenlijsten; kandidaatnamen uit hoofdletterpatronen, multiword namen en frequentie/context.
- Houd rekening met Vlaams, leenwoorden, apostrofs en D&D-termen. Afwezigheid in een woordenboek is alleen een *signaal*, geen bewijs van een fantasienaam.
- Gebruik levenshtein/fuzzy matching om waarschijnlijke typefouten/dubbels **voor te stellen**, nooit automatisch te vervangen; bijvoorbeeld Eldrin versus Eldrinn.
- Toon frequentie, originele schrijfwijze, voorbeelden en een handmatig te bevestigen selectie. Namen kunnen zeer zeldzaam maar toch belangrijk zijn: frequentie is niet de enige rankingfactor.
- Bewaar als lokale campagnedata; geef alleen relevante subset mee aan modellen via configureerbaar tokenbudget (bv. top N in huidige scène, niet botweg top 50).
- Ontbrekende/onjuiste spelling in modeloutput kan via woordenboekcontext als **voorstel** gecorrigeerd worden, zonder de brontekst of door gebruiker vastgelegde naam automatisch te herschrijven.

Voor algemene speltermen kunnen officiële [D&D SRD 5.2.1](https://www.dndbeyond.com/srd), [Open5e](https://open5e.com/) en [D&D 5e API](https://www.dnd5eapi.co/) dienen als optionele referenties, met expliciete controle van de betreffende data- en distributielicenties. Geen netwerkcalls tijdens sessies en geen verplicht referentiezoeken/RAG in MVP.

## 10. Privacy, gegevenslevenscyclus en beveiliging

**Fundamentele regel:** audio uitsluitend in vluchtig werkgeheugen verwerken; **geen audiobestanden of segmenten wegschrijven** naar IndexedDB, filesystem, Cache Storage, Service Worker Cache, crashlogs, analytics, browserlogs, exports of een server.

- VAD- en modelworkers wissen verwijzingen/buffers zodra data niet meer nodig is; expliciet resetten op sessiestop. Een crash/reload kan RAM-audio verliezen, wat eerlijk gecommuniceerd wordt.
- Lokale transcript-/notitietekst kan wel worden bewaard; transcriptbewaring configureerbaar: permanente notities standaard, tijdelijk transcript zo weinig als nodig. Verwijderen/retentie helder in UI.
- Geen externe telemetrie, remote logging of hosted AI-inferentie. Geen onbedoelde fetches naar CDN tijdens offline sessies; self-host bijhorende WASM-, tokenizer- en workergegevens.
- Modellen mogen initieel van Hugging Face worden gedownload mits gebruikersactie en netwerk; downloads/assetintegriteit en cachebeheer zijn duidelijk zichtbaar. Geen audio-/notitiecontent met downloadrequests verzenden.
- Bescherm tegen onbedoelde data in diagnose-export (configureerbare redactieniveaus: **metadata only** als standaard; optioneel modeloutput/transcript met expliciete keuze).
- Geef duidelijke waarschuwing omtrent toestemming van tafelgenoten voordat de microfoon aan gaat.
- Security: normale veilige webontwikkeling (escaping, CSP waar mogelijk, versiepinning dependencies, geen API keys in client, sandbox onbetrouwbare tekst, back-up/exportbeleid).
- Offline is na eerste succesvolle modeldownload en verificatie; een nog nooit bezocht toestel zonder modelcache kan niet offline opstarten.

## 11. Instrumentatie, foutafhandeling en export

De testmodus krijgt volledige observability, normale modus beperkte status.

### Verplichte lokale meetpunten

- `app_start`, `offline_ready`, `model_download`, `model_load`, `model_unload`, `vad_start`, `speech_segment`, `chunk_queued`, `inference_start`, `inference_done`, `parse_result`, `state_commit`, `scene_finalized`, `user_edit`, `error`, `warning`, `session_stop`.
- ISO-tijd + monotone tijd, session/test/run ID, model-ID/revision/quantization, engine/libraryversies, user agent, zichtbaar device/browser feature set, WebGPU adapterinformatie voor zover veilig beschikbaar.
- Begin/einde audiofragment, stilte/spraakduur, overlapduur, chunksize, queue duration/depth, backlog seconds, chunk-to-note latency (p50/p95/p99), real-time factor, input/outputtokens indien beschikbaar.
- Download-/warmup-/audio-feature-/prefill-/decode-/parser-/commit-tijden, tokens per seconde; KV-cache/per-request cache info als runtime deze betrouwbaar rapporteert.
- Memorie: JS heap waar ondersteund, storage quota, browser memory estimates waar beschikbaar; wees expliciet dat WebGPU-piek-RAM en Chrome tab memory doorgaans **niet exact** via web-API meetbaar zijn. Externe Chrome/Android-profiler of OS-tools als aanvullende waarheid.
- Crashes, WebGPU device loss, OOM vermoeden, worker exception, permission changes, model incompatibiliteit, sleep/background interruptions, cache miss, opslagfouten en parserproblemen; zonder automatisch terugvallen naar externe service.

### Logbestand-/exportontwerp

- Ringbuffer voor debug-events zodat langdurige sessies beperkte opslag gebruiken; behoud aggregaties in duurzame lokale DB en optioneel uitgebreide test-run logs.
- Export JSON of ZIP met `manifest.json` (config/software/hardware), `events.jsonl`, `metrics.json`, `notes.md` of referentie/resultaat indien expliciet geselecteerd, `errors.jsonl`, `README-privacy.txt`. **Nooit audio.**
- Gebruik stabiele schema-versies en event IDs. Exporteer bij voorkeur metadata-only, met gebruikerstoestemming voor inhoudelijke logs.
- Bouw een klein diagnostics UI met status, model-load-/verwerkingsfase, backlog, laatste update, mogelijke geheugenproblemen en knop `Export diagnostiek`. Geen fictieve exacte RAM cijfers.

## 12. Testprotocol en beoordelingsmethode

Tests altijd reproduceerbaar, met referentie naar exacte modeleffecten en audio. Gebruik geen automatische live-YouTube-extractie als vereiste: gebruiker kan zelf legaal gebruikt lokaal audio-/videobestand importeren; audio mag niet door de app worden opgeslagen.

### Dataset

- Korte Vlaamse fragmenten met Engelse D&D-termen; woordgrenzen, zacht spreken, sprekers over elkaar, NPC- en plaatsnamen.
- 5–15 minuten dialoog/verkenning/quest, 5–15 minuten combat, 5–15 minuten DM-expositie.
- Langere volledige sessie (minstens 30–60 min) om thermische throttling, context- en backloggroei te testen.
- Testbestanden met toestemming/rechten; geen private campagnedata bij git commit.
- Met menselijke annotatie voor belangrijke gebeurtenissen, entiteiten, relaties en uitspraken van de DM; twijfelgevallen als onzeker.
- Test herhaalbaarheid via lokaal bestand en deterministisch gesimuleerde tijdaanvoer; geen audio bewaren in app.

### Testmatrix

Per relevante model+runtime+quantization combinatie:
1. Controleren of downloaden/cache/offline boot en model loading slagen.
2. Eén kort audiofragment met taakprompt om feitelijke multimodale ondersteuning aan te tonen.
3. NL/Vlaams + English termherkenning en note extraction.
4. Realtime sim versus maximale throughput (duidelijk gescheiden).
5. Denken uit/aan/lage budgetvariant **waar ondersteund**.
6. Output één call versus 2–3 dezelfde-modelcalls; formaten DSL/JSON/tekst.
7. Chunkduur, VAD, overlap, audio-lookback/contextlagen en glossary aan/uit.
8. Human edit mid-inference, editor conflicts, dubbele chunk/retry, crash/reload, offline, screen off/background en storage eviction.
9. Langetermijnrun, koudewarmte, geheugenpiek, apparaatthermiek.

Bewaar seeds, decodeconfig, input hash *berekend in memory* (hash mag in rapport, niet audiobytes), software-/modelversies, exacte apparaatinfo en runorder. Voorkom geïnduceerde bias: meerdere tests, gelijke batterij-/temperatuurcondities, cold versus warm labeling.

### Metrieken

- `RTF = processing_wall_time / unique_audio_duration` (exclusief opzettelijk wachtmoment bij realtime playback); **RTF < 1** voor duurzame verwerking zonder groeiende achterstand, met ruime veiligheidsmarge gewenst. Ook end-to-end note latency en wachtrijgroei per 10 min meten.
- Audioherkenning: WER/CER **indien** transcripties aanwezig en handmatig gerefereerd; voor Vlaanderen/code-switching aparte entity/spell-term recall, niet alleen WER.
- Note correctness: event precision/recall, ongefundeerde feiten/hallucinaties, foutieve karaktertoewijzingen, belangrijke DM clues gemist, duplicaten en irrelevante routinecombat.
- Gebruikersedit: nooit overschreven; herkende correctie is terug in context; conflict veilig opgelost.
- Kosten: modeldownload/cache, loadtijd, RTF, p50/p95 vertraging, tokengebruik, battery/thermals waar meetbaar, OOM/crash.
- Export: reproduceerbaar en zonder audiobestand.
- Per kwaliteitsscore duidelijk aangeven of handmatig beoordeeld, heuristisch of AI-beoordeeld (AI-beoordeling niet als ground truth presenteren).

### Gatecriteria (eerste voorstel; herzien op basis van echte metingen)

1. **Technische smoke-test:** model kan audio ontvangen en zinvolle Nederlandse tekst genereren, lokaal, browser-to-browser zonder hosted inference.
2. **Privacyslot:** bewezen via network inspection/storage inspection dat microfoonaudio geen netwerk of persistente opslag raakt.
3. **Offline:** na modelprecache draait een volledige korte testcase in vliegtuigmodus.
4. **Correctness:** essentiële aangeleverde feiten komen terug; evaluatie met menselijke referentie, zonder ongegronde feiten als zekerheid.
5. **Realtime:** op Pixel 6a geen duurzaam oplopende wachtrij; gewenste note-lag testen. Als dit niet haalbaar is, openlijk beperkingen tonen en model/strategie verbeteren.
6. **Edit integrity:** property-/concurrency-tests tonen dat gebruikersedits nooit verloren gaan.
7. **Observability:** crashes en performanceproblemen leiden tot uitlegbare diagnostiek, zonder audiopersistentie.
8. **Geen memory-catastrofes:** langere test inclusief WebGPU device-loss/OOM recovery en cache-evictionscenario.

Wanneer geen enkel groot multimodaal model deze gates haalt, behoud de browser-first architectuur en rapporteer de technische grens. Bied geen 'magische' modelclaims aan.

## 13. Implementatiefasen voor coding agents

**Fase 0 — repository/init**
- TypeScript-webapp met tests, formatter/linter, minimale CI, eenvoudige modules en [README](../README.md)/dit document als bron van waarheid.
- Definieer modellen, events, state/reducer en adaptergrens eerst, maar bouw geen onnodige abstraction frameworks.
- Voeg basis privacy guardrails toe: geen audio-opslaginterfaces, geen analytics/remote inference.
- Codeer geen modelinstructies of hardcoded campagnedata in de core.

**Fase 1 — inference feasibility spike (hoogste prioriteit)**
- Minimalistische pagina: kies ondersteund model, download/cache, WebGPU/compatibility check, lokaal audiofragment importeren, uitvoeren, tekstoutput en timings tonen.
- Eerste kandidaat Gemma 4 E2B via Transformers.js; ook Voxtral Mini 3B en Ultravox wanneer haalbaar. Controleer feitelijk sample rate, multimodale pipeline, quantization en WebGPU-memory.
- Draai op echte Pixel 6a én laptop. Leg werkende recepten, onmogelijkheden en broncodeversies vast; vermijd zware UI vooraf.
- Early abort/foutmeldingen voor unsupported WebGPU, OOM en downloadfouten.
- Geen uitgebreide geheugenlaag zolang audio-input nog niet betrouwbaar werkt.

**Fase 2 — echte audio-invoer, VAD, fragmenten en scheduler**
- AudioWorklet (geen MediaRecorder-bestanden), VAD, segmentatie, overlap, begrensde RAM-queue, verwerking en vrijgave.
- Realtime sim vanaf lokaal bestand en microfoon delen dezelfde pipeline.
- Toon backlog en notitie-lag; test scherm-uit/achtergrond en pressure.

**Fase 3 — context, state en live notities**
- L1/L2/L3, typed reducer, eventjournal, idempotency en snapshots, voorzichtig scèneafsluiten en transcript/notes.
- Outputprotocol experimenteel: vergelijk één vs meerdere calls, compacte tolerant parsebare output en tokenbudgetten.
- Human edits, revision-aware conflictbehandeling en beschermde definitieve notities.
- Lokale notities + Markdown export.

**Fase 4 — permanente benchmark en diagnostiek**
- Modelconfig-/thinkingselector, experimentmatrix, referentiescores, grafieken en exporteerbare lokale JSON/ZIP-logs.
- Cold/warm labels, modelcompatibility manifest, versiepinning.
- Testscore bepaalt defaultconfig in plaats van intuïtieve modelvoorkeur.

**Fase 5 — campagnewoordenboek en verfijning**
- Importeer oude handgeschreven sessieverslagen als *tekst*, extraheer en laat campagnetermen bevestigen.
- Slim relevantie-/tokenbudget voor glossary, verbeter prompts waar misherkenning meetbaar optreedt.
- Optimaliseer VAD, langere/kleinere audio, thinking/adaptive reasoning, context compressie op basis van benchmarkbewijs.

**Fase 6 — robuustheid en UX**
- Betrouwbare offline UX, cache-recovery, storage-quota, mobiele performance, compatibiliteit, lange sessies, data export/import, toegankelijkheid.
- Alleen uitbreiden na kernprestaties en data-integriteit.

### Definitie van 'klaar' per implementatiestap

- Werkende browserdemo (geen screenshots of pseudocode als vervanging).
- Unit-/integrationtests en reproduceerbaar handmatig testrecept.
- Audio blijft alleen in RAM; online requests gecontroleerd.
- Foutpaden en user-visible status aanwezig.
- Metrieken aantoonbaar afkomstig van metingen (niet verzonnen).
- Bestaande contracttests voor state/revision en permanente testmodus blijven slagen.
- Geen afhankelijkheid van één modelstructuur in corelogica.

## 14. Open vragen (expliciet aan tests overlaten)

- Welk audio-LLM biedt de beste kwaliteit/latency/memory op Pixel 6a? Gemma, Voxtral, Ultravox of nieuwere modellen.
- Welke kwantisatie en WebGPU execution provider zijn daadwerkelijk compatibel en performant?
- Hoe lang mag een audiofragment zijn en wanneer is langere audiocontext beter dan recente tekstcontext?
- Welke VAD werkt het best in een rumoerige D&D-groep? Kleine fouten in grensdetectie zijn mogelijk schadelijker dan beperkte extra audio.
- Is thinking de output-/computeprijs waard bij identificeren van belangrijke events? Welke verzoektypes profiteren?
- Eén call met gestructureerde output of meerdere calls op hetzelfde geladen model?
- Kan de app doorlopend realtime blijven op zwakste toestel, bij oplopende warmte en meer context?
- Waar ligt een bruikbaar minimum voor transcript-retentie en diagnosecontent zonder privacyrisico?
- Hoeveel campagnetermen moeten in prompt versus alleen lokaal woordenboek?

Documenteer uitkomsten als kleine, gedateerde besluitnotities met bron, meetrun en context. **Wijzig gevestigde principes niet stilzwijgend op basis van één benchmark.**

## 15. Technische bronverwijzingen / startpunten

Deze bronnen zijn implementatiestartpunten, geen garantie van functioneren op specifiek toestel:

- [Transformers.js](https://github.com/huggingface/transformers.js) en [documentatie](https://huggingface.co/docs/transformers.js/index)
- [Gemma 4 E2B ONNX](https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX), [Voxtral Mini ONNX](https://huggingface.co/onnx-community/Voxtral-Mini-3B-2507-ONNX), [Ultravox 1B ONNX](https://huggingface.co/onnx-community/ultravox-v0_5-llama-3_2-1b-ONNX)
- [Gemma 4 WebGPU-demo](https://huggingface.co/spaces/webml-community/Gemma-4-WebGPU), [Voxtral WebGPU-demo](https://huggingface.co/spaces/webml-community/Voxtral-WebGPU)
- [Silero VAD voor browser](https://github.com/ricky0123/vad)
- [wllama v3](https://github.com/ngxson/wllama), [WebLLM](https://github.com/mlc-ai/web-llm)
- [MDN: AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet), [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [WebGPU](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API), [StorageManager](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager)
- [Google Gemma documentation](https://ai.google.dev/gemma/docs)
- [Open5e](https://open5e.com/), [5e API](https://www.dnd5eapi.co/)

---

**Implementatie-instructie voor AI coding agents:** maak eerst een klein, aantoonbaar werkend end-to-end audio→model→notitiedelta pad in Chrome/Android. Meet zorgvuldig. Houd alle context-, memory-, glossary-, logging- en UI-logica modelonafhankelijk. Bewaak privacy, menselijke edits en realtime-achterstand als harde systeemgrenzen. Als een aanname uit deze blauwdruk technisch niet klopt, documenteer bewijs en kies de kleinste correctie die de productprincipes behoudt.
