# Parakeet Web — WER-resultaten uit Chrome Console (14 oktober 2026)

**Status: historische, handmatig overgenomen consoletabel.** Inmiddels is ook de [originele WER-JSON met alle zes ruwe transcripties](custom-mp3-wer-run-02/parakeet-web-custom-mp3-wer.json) beschikbaar. De [volledige analyse](custom-mp3-wer-run-02/README.md) bevestigt de fouttotalen en onderzoekt inhoudelijke fouten en getalnormalisatie. Dit bestand blijft bewaard om de eerdere rapportage te documenteren.

- Herkomst: door gebruiker geplakte uitvoer van `__dndBenchShowWer()` na het testen met de [console-helper](../custom-audio-expected-console.js).
- Gerapporteerde referentielengte: **529 woorden** voor alle configuraties, overeenkomstig de normalisatie in de helper.
- Methode: `WER = (S + D + I) / 529`; alle rijtotalen en aantallen herkende woorden zijn rekenkundig gecontroleerd.
- Referentietekst volgens helper: [Nederlandstalig D&D-script](../../dnd-session-nl/reference.md). Het is niet onafhankelijk vastgesteld dat het audiobestand letterlijk overeenkomt met deze tekst.
- Benchmarkmodel en systeemcontext zijn vermoedelijk dezelfde als bij de [eerdere eigen-MP3-snelheidstest](custom-mp3-long-profile-run-01/README.md), maar zijn **niet opnieuw meegeleverd** met deze console-tabel. Trek daarom nog geen conclusies over directe speed-versus-WER-rangschikking zonder de aparte exports naast elkaar te leggen.

## Letterlijk overgenomen cijfers (gesorteerd op WER)

| Model/configuratie | WER | Vervangingen (S) | Weglatingen (D) | Toevoegingen (I) | Totale fouten | Referentiewoorden | Herkende woorden |
|---|---:|---:|---:|---:|---:|---:|---:|
| `webgpu-hybrid:fp16` | 13.80% | 59 | 10 | 4 | 73 | 529 | 523 |
| `wasm:int8` | 14.37% | 63 | 8 | 5 | 76 | 529 | 526 |
| `wasm:fp32` | 14.56% | 65 | 7 | 5 | 77 | 529 | 527 |
| `webgpu-hybrid:fp32` | 14.56% | 65 | 7 | 5 | 77 | 529 | 527 |
| `webgpu-hybrid:w4a8` | 15.88% | 68 | 9 | 7 | 84 | 529 | 527 |
| `wasm:w4a8` | 16.45% | 70 | 11 | 6 | 87 | 529 | 524 |

## Interpretatie

- Laagste WER in deze enkele opname: **WebGPU-hybrid fp16: 13,80%**, 73 woordbewerkingen (59 substituties, 10 deleties, 4 inserties).
- **WASM int8** volgt met **14,37%** (76 bewerkingen): slechts **3** extra woordfouten, of **0,57 procentpunt** WER. Op één bestand kan dat verschil makkelijk van specifieke woorden afhangen.
- **WASM fp32 en WebGPU-hybrid fp32** hebben exact dezelfde fouttotalen (65/7/5). De inmiddels aangeleverde ruwe JSON bewijst dat hun transcripties hier ook **byte-voor-byte identiek** zijn.
- **WASM w4a8** scoort hier het minst goed: **16,45%** (87 bewerkingen). Verschil met fp16: **14 bewerkingen / 2,65 procentpunt**.
- Substituties domineren bij alle zes configuraties. De inmiddels beschikbare [raw-transcriptanalyse](custom-mp3-wer-run-02/README.md) toont herhaalde fouten bij eigennamen, D&D-termen en de betekenisvolle verwisseling van **gewond → gewoon**.
- Dit is een WER op basis van de automatische normalisatie; ze meet niet rechtstreeks de bruikbaarheid van de uiteindelijke sessienotities.

## Vervolg

1. De geëxporteerde [WER-sidecar en ruwe transcripties](custom-mp3-wer-run-02/parakeet-web-custom-mp3-wer.json) zijn inmiddels beschikbaar; zie de [analyse](custom-mp3-wer-run-02/README.md).
2. Bevestig dat alle modellen dezelfde audio en dezelfde letterlijk gesproken referentietekst hebben gekregen.
3. Analyseer fouten per categorie (eigennamen, D&D-termen, getallen, correcties, gewone Nederlandse woorden), en vergelijk de nauwkeurigheid daarna met de verwerkingstijden.
4. Test eventueel **phrase boosting aan/uit** op exact hetzelfde bestand, met expliciet vastgelegde woordenlijst en parameters.

Voorlopige voorkeur: **WebGPU fp16** verdient vervolgonderzoek wegens de laagste gemeten WER hier en de hoge snelheid in het *vorige* experiment, maar dit is nog geen doorslaggevende modelselectie.
