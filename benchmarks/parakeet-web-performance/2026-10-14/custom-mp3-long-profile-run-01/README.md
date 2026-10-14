# Parakeet Web — eigen MP3 van 209,43 seconden

Dit is een **aparte** test met door de gebruiker geselecteerde MP3-audio, ter vervanging van de ingebouwde JFK-clip via een tijdelijke browser-console-`fetch`-override.

- Ruwe, onveranderde export: [report.json](report.json)
- Rapport-ID: `80055d85-ed11-444a-8c7c-f9fd3bf1ec01`
- Datum in export: `2026-10-14T20:00:00.000Z`
- App: `11.4.0` (commit: `unknown`)
- Model: `Olicorne/parakeet-tdt-0.6b-v3-ultra-onnx`
- Browser/hardware: Chrome 154, Windows, 16 GB browser-gerapporteerd RAM, 16 logische processors, Intel Iris Xe (GPU)
- Ingestelde parameters: 4 WASM-threads; parallel encoding aan; 60 s chunks; beam width 1; phrase boosting **uit**
- Status: **12 van 12** rijen geslaagd. Iedere rij meldt vier chunks.

## Cruciale kanttekening: dezelfde audio in Short en Long

De audio is **209.43 seconden** (3 min 29,43 s). Het ingebouwde Long Audio Profile maakt een clip alleen langer **als hij korter is dan 90 s**. Omdat deze eigen MP3 al 209,43 s is, geldt:

- `shortSec = longSec = 209.43` in de export;
- short en long bevatten **hetzelfde PCM-fragment**, zonder extra herhaling, telkens vier chunks;
- met `warmup: true` en `repeats: 1` resulteert dit **per modelcombinatie** in twee niet-gerapporteerde warmups en twee getimede transcripties van dezelfde audio;
- het long-profile-vinkje voegt voor deze MP3 **geen nieuwe workload** toe, maar verdubbelt de benchmark-inferenties. Laat het bij zulke bestanden in volgende runs uit, en gebruik liever 3 expliciete repeats als je een mediaan wilt.

De eerste kolom "Short" in de tabel betekent hier dus geen 11-secondenopname. Tijden zijn gemeten walltime, **exclusief** het laden van het model.

## Resultaten

| Configuratie | Short (209 s) | Long (209 s) | Gemiddeld | Model laden | In cache? |
|---|---:|---:|---:|---:|---|
| webgpu-hybrid:fp16 | 10.46 s | 10.12 s | **10.29 s** | 75.69 s | nee |
| webgpu-hybrid:w4a8 | 17.60 s | 17.15 s | **17.38 s** | 24.23 s | nee |
| wasm:fp32 | 50.12 s | 52.88 s | **51.50 s** | 134.92 s | nee |
| webgpu-hybrid:fp32 | 53.95 s | 53.14 s | **53.54 s** | 58.76 s | nee |
| wasm:int8 | 57.34 s | 55.86 s | **56.60 s** | 35.95 s | nee |
| wasm:w4a8 | 57.18 s | 57.27 s | **57.23 s** | 3.13 s | ja |

**Conclusies (indicatief; geen onafhankelijke drie- of meervoudige herhalingen):**

- **WebGPU fp16** verwerkt de volledige audio gemiddeld in **10,29 s** (~20,35× sneller dan realtime); **5,50×** sneller dan WASM int8 (~56,60 s).
- **WebGPU w4a8** verwerkt hetzelfde bestand gemiddeld in **17,38 s** (~12,05× realtime), maar heeft in deze run een veel kortere model-laadtijd (**24,23 s** tegenover **75,69 s** bij fp16).
- Eerste run incl. de gemeten download-/laadtijd: **WebGPU w4a8 circa 41,60 s**, **WebGPU fp16 circa 85,98 s**. Dat onderscheid doet ertoe als modellen geregeld gewisseld of opnieuw gedownload worden; cached loads zijn niet rechtstreeks vergelijkbaar met uncached.
- **WASM w4a8** had de gewichten reeds in de cache (3,13 s laden, 0 MB downloaden), de overige configuraties niet. Behandel die load-timing apart.

## Waarom de similarity-scores ongeldig zijn

In het rapport staat `clip.source` nog steeds op **John F. Kennedy**. Dat is **onjuiste metadata voor deze test**: de `fetch`-override veranderde de audio, maar niet de hardcoded referentiezin in het benchmarkprogramma.

- Daarom zijn de lage `similarity`-waarden (0 en 0,004) **geen beoordeling van de eigen MP3**.
- De score is een genormaliseerde **LCS-gebaseerde woordovereenkomst**, niet Word Error Rate (WER).
- Deze export bevat **geen letterlijke modeltranscripties**; alleen woordenaantallen (523–527). Er kan dus achteraf geen betrouwbare WER worden uitgerekend.
- Het exacte **audiobestand zelf is niet meegeleverd in dit rapport**. Een correcte referentie is idealiter een geverifieerd transcript van wat er werkelijk werd voorgelezen; de beoogde [D&D-referentie](../../../dnd-session-nl/reference.md) is alleen bruikbaar als die overeenkomt met de opname.

## Herhalen met eigen audio én eigen expected text

De experimentele [console-helper](../../custom-audio-expected-console.js) onderschept de ingebouwde JFK-MP3, vervangt de verwachte Kennedy-zin bij de ingebouwde similarity-berekening én **berekent apart WER** op basis van het tijdens de scoring onderschepte ruwe transcript. Er is een aparte JSON-download met WER en uitvoer per model. De code is opgesteld voor Parakeet Web 11.4.0; zie de [instructies en beperkingen](../../README.md#eigen-mp3-met-correcte-wer-tijdelijke-devtools-helper).

Start de benchmark met **Long Audio Profile uit** als de opname >90 s is. De helper corrigeert **niet** automatisch het exportveld `clip.source`; vermeld daar achteraf steeds dat het om eigen MP3 gaat. De ingebouwde `similarity` blijft LCS-overeenkomst. De **aparte WER-export** kan pas uit een **volgende** testrun worden gemaakt, omdat dit historische rapport geen transcripties bevat.
