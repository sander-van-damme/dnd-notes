# Parakeet Web — hardwarebenchmark 14 oktober 2026

**Bron:** [Parakeet Web](https://parakeetweb.olicorne.org/) · [broncode en benchmarkmethodiek](https://github.com/thiswillbeyourgithub/parakeet_web/blob/main/README.md) · [ruw rapport](report.json).

**Belangrijke afbakening:** dit is de **ingebouwde snelheidsbenchmark** van Parakeet Web, met een Engelstalig fragment uit de inaugurele rede van John F. Kennedy. Dit is **niet** de voorgelezen Nederlandstalige D&D-test en evenmin een meting van de Word Error Rate op D&D-termen. De [D&D-benchmark](../../dnd-session-nl/README.md) en haar [run 1](../../dnd-session-nl/results/parakeet-tdt-v3-multilingual-webgpu/run-01/transcript.md) blijven afzonderlijk; run 1 is niet ingevuld door deze benchmark.

## Herkomst

- Rapportformaat: `parakeetweb-benchmark-report/1`
- Rapport-ID: `d9fb186a-04b8-42b7-8ff0-f5f2366fdf35`
- Gegenereerd: `2026-10-14T19:00:00.000Z`
- App: Parakeet Web `11.4.0` (app-commit: `unknown`)
- Model: [`Olicorne/parakeet-tdt-0.6b-v3-ultra-onnx`](https://huggingface.co/Olicorne/parakeet-tdt-0.6b-v3-ultra-onnx) (variant **ultra**, niet zonder meer gelijk aan elke andere Parakeet TDT v3-build)
- Modelbroninstelling in export: `both`
- Browser: Chrome/Chromium 154, Windows 64-bit, x86
- Hardware gemeld door browser: 16 logische threads en 16 GB apparaat-RAM; Intel Iris Xe Graphics / Intel Gen-12LP GPU
- ONNX Runtime Web: 1.30.0
- Benchmark: **11 seconden** en **90 seconden** audio, **1 meting per combinatie**, warmup actief, zonder vooraf geladen modelcache in de gerapporteerde loads
- Alle 12 testrijen in het rapport eindigden met `status: ok`.

## Performance (uit ruwe JSON)

De waarden onder *Laden* omvatten de gemeten laadtijd van de modellen; de audiotijden zijn **wall-clock transcribetijden** (zonder die laadtijd). Alle tijden zijn seconden; korter is beter.

| Backend | Precisie | Laden | Download | 11 s audio | 90 s audio |
|---|---|---:|---:|---:|---:|
| WASM (CPU) | `w4a8` | 21,33 s | 383,5 MB | 2,13 s | 21,73 s |
| WASM (CPU) | `int8` | 32,83 s | 649,5 MB | 2,01 s | 26,95 s |
| WASM (CPU) | `fp32` | 118,21 s | 2.436 MB | 1,70 s | 21,51 s |
| WebGPU-hybrid | `w4a8` | 23,75 s | 383,5 MB | 0,45 s | 9,82 s |
| WebGPU-hybrid | `fp16` | 62,27 s | 1.218,3 MB | 0,54 s | 3,23 s |
| WebGPU-hybrid | `fp32` | 59,56 s | 935,4 MB | 1,99 s | 22,49 s |

### Wat valt op?

- Voor de **11-secondenclip** is **WebGPU-hybrid w4a8** het snelst met **0,445 s**, maar het resultaat heeft slechts één herhaling.
- Voor de **90-secondenclip** is **WebGPU-hybrid fp16** het snelst met **3,229 s** (ongeveer **27,9× real time**). Laden kostte daar **62,273 s** en de export rapporteert **1218,3 MB** gedownload.
- **WebGPU-hybrid w4a8** verwerkt dezelfde 90 s in **9,823 s**, met een kortere laadtijd (**23,749 s**) en kleinere download (**383,5 MB**). Dat maakt het een mogelijk interessante optie voor korte of eenmalige sessies.
- Deze cijfers zijn **indicatief** (slechts één run per combinatie); rapporteer bij herhaling medianen en maak onderscheid tussen cold start, cached load en transcriptietijd.
- De `similarity`-waarde van **1** voor korte clips is de overeenkomst met de bekende **Engelse testzin** zoals Parakeet Web die berekent, geen D&D-WER. Voor de lange clips is de score in het rapport `null`. Dit rapport bevat geen ruwe transcripties.
- Sommige interne `metrics.*`-timings lijken niet optelbaar tot de gerapporteerde totale walltime; gebruik voor snelheidsvergelijkingen primair `wallMs`, `rtf` en `loadMs` en behoud alle ruwe details voor later onderzoek.

## Expliciete benchmarkinstellingen (uit export)

| Instelling | Waarde |
|---|---|
| CPU-threads | 4 |
| Parallel encoding | aan |
| Lange audio opdelen (chunking) | aan |
| Chunkduur | 60 s |
| Beam width | 1 |
| Phrase boosting | uit |
| Boost strength | niet van toepassing |
| Testbackends | WASM en WebGPU-hybrid (beide daadwerkelijk gemeten) |
| Kwantisatievarianten | `w4a8`, `int8`, `fp32`, `fp16` (naargelang backend) |

## Overige zichtbare UI-instellingen (screenshots, niet alle in export)

De screenshots tonen de instellingen van het moment van vastleggen. Ze bewijzen niet dat elke optie invloed had op de ingebouwde benchmark.

- UI-taal: **GB/Engels** geselecteerd (geen bewijs van een expliciete herkenningstaal).
- **Model: ultra**.
- **Backend-selectie in de UI: WASM (CPU)**. **Let op:** de benchmark heeft óók WebGPU-hybrid gemeten.
- **Number of speakers: Auto**.
- **Default transcript display: Raw**.
- **Auto-copy transcribed text to clipboard: aan**.
- **Write spelled-out numbers as digits: aan**; let bij een latere WER-test op consistentie in cijfernormalisatie.
- **Correct misheard drug names and medical terms: uit**.
- **Save transcript history locally: uit**.
- **Enable keyboard shortcuts: uit**.
- **Phrase boosting: Disabled (no boosting)**, met ingevulde maar inactieve standaardsterkte **1**.
- **Chunk long audio: aan**, duur **60 s**.

## Relevantie voor D&D Notulist

**Phrase boosting** is een interessante afzonderlijke hypothese voor een vervolgevaluatie: kan de herkenning van D&D-termen, spreuken en eigennamen verbeteren? Test later dezelfde Nederlandse audio met en zonder een vooraf bepaalde domeinwoordenlijst, maar noteer dit als **twee afzonderlijke configuraties**. Domeinspecifieke versterking mag niet worden verward met de algemene ASR-kwaliteit; vermijd het invoeren van een compleet correct transcript als woordenlijst.

Geen applicatiecode of D&D-runtranscript is door deze rapportintegratie veranderd.
