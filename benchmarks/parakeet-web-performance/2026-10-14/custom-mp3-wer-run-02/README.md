# Parakeet Web Ultra — eigen D&D MP3, WER en supportlog

**Originele exports**, overgezet vanuit `sander-van-damme/project-shape-display` naar deze benchmarkmap:

- [`parakeet-web-custom-mp3-wer.json`](parakeet-web-custom-mp3-wer.json) — de WER-sidecar met **zes ruwe modeltranscripties**, exacte foutentelling, referentietekst en uitvoeringsvolgorde.
- [`parakeetweb-log.json`](parakeetweb-log.json) — de **support/diagnostic report**, geen benchmarkresultaten; bevat browser-, netwerk-, hardware- en instellingsinformatie. De JSON is ongewijzigd.
- Eerdere afzonderlijke [snelheidstest met MP3 van 209,43 seconden](../custom-mp3-long-profile-run-01/README.md) en de [eerder handmatig geplakte consoletabel](../custom-mp3-wer-console-results.md).

## Herkomst en betrouwbaarheid

- App: **Parakeet Web 11.4.0**, model `Olicorne/parakeet-tdt-0.6b-v3-ultra-onnx`.
- WER-export gemaakt op `2026-10-14T21:28:27.020Z` (benchmark start `2026-10-14T21:13:06.072Z`).
- Audio volgens sidecar: `dnd-demo.mp3`, **3,409,388 bytes**. Het **MP3 zelf ontbreekt**, dus de uitgesproken woorden zijn niet onafhankelijk gecontroleerd.
- Modelkoppeling: `modelMappingVerified: true`, en alle **6** `plannedConfigurations` staan in exact dezelfde volgorde als `results`.
- Referentie: de meegeleverde `reference.text` is na normalisatie **gelijk** aan [`reference.md`](../../../dnd-session-nl/reference.md). Exacte tekstbytes verschillen alleen door witruimte/alinea-indeling; bronblob is `da04174998108e39bcb044a7c20936a16b362d76`.
- `verifiedAgainstActualRecording: false`: **WER blijft voorlopig** zolang geen gecorrigeerd letterlijk transcript van de daadwerkelijke opname beschikbaar is.
- De WER JSON bevat **geen timings**. Een eerdere performance-export heeft per model **dezelfde herkende woordenaantallen**, maar bij gebrek aan een audiohash/run-ID kan niet bewezen worden dat het om identieke opnamebytes en dezelfde run gaat.

## Gecontroleerde woordfoutpercentages

Alle waarden zijn onafhankelijk nagerekend volgens **`(substituties + deleties + inserties) / 529`**. De referentie bevat na Parakeet's normalisatie **529 woorden**. De sidecar bevat telkens de ruwe hypothese, niet alleen geaggregeerde tellingen.

| Backend / quantisatie | Originele WER | Fouten (S / D / I) | Getalgenormaliseerde WER¹ |
|---|---:|---:|---:|
| `webgpu-hybrid:fp16` | 13.80% | 73 (59 / 10 / 4) | 10.21% |
| `wasm:int8` | 14.37% | 76 (63 / 8 / 5) | 10.78% |
| `wasm:fp32` | 14.56% | 77 (65 / 7 / 5) | 10.96% |
| `webgpu-hybrid:fp32` | 14.56% | 77 (65 / 7 / 5) | 10.96% |
| `webgpu-hybrid:w4a8` | 15.88% | 84 (68 / 9 / 7) | 12.29% |
| `wasm:w4a8` | 16.45% | 87 (70 / 11 / 6) | 12.85% |

¹ De aanvullende score past op beide kanten ook een **beperkte, expliciete omzetting van afzonderlijke Nederlandse getalwoorden naar cijfers** toe (`negen→9`, `dertien→13`, `honderd→100`, enzovoort), zonder samengestelde of ongelijke termen verder te herschrijven. Deze experimentele normalisatie verwijdert **precies 19 fouten per model** en verandert de rangschikking niet. Het is **geen** nieuw door de app geëxporteerd benchmarkresultaat en **geen** validatie van wat werkelijk uitgesproken werd.

**Opmerking:** van de oorspronkelijke 529 referentiewoorden blijven ook na deze bewerking 529 tokens over. Het betreft dus niet een gunstiger score door woorden willekeurig weg te laten.

**Exacte normalisatiemapping, voor reproduceerbaarheid:** eerst lowercase en de door Parakeet gehanteerde interpunctie-/witruimtenormalisatie; daarna per volledig woord `één→1`, `twee→2`, `drie→3`, `vier→4`, `vijf→5`, `zes→6`, `acht→8`, `negen→9`, `tien→10`, `elf→11`, `dertien→13`, `zeventien→17`, `achttien→18`, `drieëntwintig→23`, `dertig→30`, `vijftig→50` en `honderd→100`. Het onbepaalde lidwoord `een` blijft ongewijzigd. Geen samenvoeging van woorddelen, eigennamen of Engelse D&D-termen.

## Inhoudelijke fouten: cruciaal voor sessienotities

In **alle zes** ruwe transcripties treden onder meer deze verschillen met de referentie op:

| Referentiewoord/-naam | Modeluitvoer (voorbeelden) | Risico |
|---|---|---|
| `Edda Voss` | `ad Alfos`, `en de Alfos` | NPC-identiteit gaat verloren |
| `Nerin Vale` | `Nerenveil`, `neer een veil` | Belangrijk questpersonage wordt niet goed herkend |
| `Veyra` | `Veira` | Onstabiele eigennamen en entiteitskoppeling |
| `modifier` | `motherfire` | Engels D&D-vakwoord wordt betekenisloos |
| `Insight check` | `inside check` | Skillnaam vervormd |
| `Stealth check` | `stijlcheck` | Skillnaam wordt een Nederlands gewoon woord |
| `gewond` | `gewoon` | **Inhoudelijke verandering:** de teruggevonden NPC lijkt niet langer gewond |
| `levend` | `leven` | Voorwaarde voor de beloning minder precies |
| `Grijzehaven` | `Grijze haven`; incidenteel `grijze haar` | Mogelijke entiteitssplitsing of plaatsverwarring |

Dit zijn **tekstuele afwijkingen ten opzichte van het script**. Zonder de daadwerkelijke audio kunnen we niet vaststellen of elke afwijking uitsluitend aan ASR, uitspraak of voorleesvariaties ligt.

Positief: veel andere D&D-termen en verhaalonderdelen blijven wel herkenbaar. Alle transcripties bewaren bijvoorbeeld `Detect Magic`, `disadvantage`, `advantage`, `goblins` en de expliciete correctie van **gouden medaillon** naar **zilveren sleutel**. De beslissing om de kist niet te openen en de aankoop van **één potion, niet twee**, blijven eveneens in essentie aanwezig.

## Wat zeggen de modelverschillen?

- **WebGPU-hybrid fp16** heeft met **13,80%** de laagste originele WER (73 fouten). **WASM int8** volgt op **14,37%** (76 fouten): slechts **drie** fouten verschil bij deze opname, onvoldoende voor een algemene kwaliteitsclaim.
- Bij beide **fp32**-backends zijn de volledige ruwe transcripties zelfs **byte-voor-byte identiek**, niet enkel de foutsommen; de gekozen uitvoeringsbackend veranderde de woorden hier niet.
- **WASM w4a8** maakt **14 fouten meer** dan fp16 (87 tegenover 73). Eén opname volstaat niet om dit verschil naar andere D&D-sessies te extrapoleren.
- Uit de eerdere afzonderlijke snelheidstest bleek **WebGPU fp16 ~10,29 s** tegenover **WebGPU w4a8 ~17,38 s** voor 209,43 s audio. Deze snelheden zijn **niet** in de huidige WER-sidecar opgeslagen. Een directe per-run trade-off tussen snelheid en fouten vereist een traceerbare gezamenlijke run.

## De supportlog is geen betrouwbare apparaatidentificatie

De supportexport is gemaakt op `2026-10-14T21:29:34.696Z` en rapporteert:

- browser user agent **Android / Pixel 10**;
- tegelijk de **Intel Gen-12LP WebGPU-adapter** en `ANGLE Intel Iris Xe / Direct3D11`, wat met een echte Pixel 10-browser niet logisch samenvalt;
- Chrome **154**, **16 logische CPU's**, door de browser gerapporteerd **16 GB RAM**, en `shader-f16`;
- momenteel geselecteerde backend **WASM int8**, met 4 threads, beam width 1, 60 s chunking en parallel encoding aan; `debugDecode: true`;
- `model.loaded: false` en `status: idle` op het **moment van de supportdump** — niet bewijs dat de eerdere benchmark niet draaide.

Dit is een **intern inconsistente user-agent-/hardwarecombinatie**. Mogelijke verklaringen zijn apparaat-emulatie of overschreven browseridentificatie, maar dat kan niet uit de export worden vastgesteld. Concludeer **niet** dat de benchmarks fysiek op een Pixel 10 draaiden. Controleer de echte hardware zo nodig afzonderlijk.

De supportlog bevat browserfingerprint-, netwerk- en schermmetadata en is daardoor **privacygevoeliger** dan de geanonimiseerde Parakeet-performancebenchmarkexport. Controleer dat voor je de publieke bestanden verder deelt.

## Aanbevolen vervolg

1. **Behoud fp16 en int8 als vergelijkingskandidaten** en test `phrase boosting` gecontroleerd op dezelfde opname, vooral voor de NPC-namen, `Insight`, `Stealth`, `modifier` en plaatsnamen. Test een volledige baseline **zonder** boosting versus een identieke configuratie **met** boosting.
2. Score niet alleen woordnauwkeurigheid, maar ook **verhaalgetrouwheid**, bijvoorbeeld: is Nerin gewond, kwam hij levend mee, werd de kist gesloten gelaten, wat is de beloning, en werd de zilveren sleutel gecorrigeerd?
3. Leg bij de volgende test een **audiohash**, exact model-/runtimeversienummer, afzonderlijke timings en een **geverifieerd letterlijk audio-transcript** vast. Dit maakt WER en performance-uitkomsten beter reproduceerbaar.

**Geen van de originele JSON-exporten is gewijzigd.** De enige aanvullende meting in dit document is de expliciet gelabelde, optionele getalnormalisatie.
