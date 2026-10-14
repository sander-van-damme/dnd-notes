# Parakeet TDT v3 Multilingual — WebGPU

**Status:** map voorbereid; er is nog **geen transcriptie of benchmarkresultaat** toegevoegd.

## Testomgeving

- Model zoals weergegeven door de testpagina: **Parakeet TDT v3 (Multilingual)**.
- Testpagina: <https://webgpu.studio/speech-to-text>
- Uitvoering volgens de interface: **WebGPU**.
- Exacte modelrevisie, quantisatie en overige parameters: **nog te documenteren**.

## Resultaten opslaan

Maak per echte testrun een submap (`run-01/`, `run-02/`, …) en bewaar daarin:

- `transcript.txt` — **onbewerkte modeluitvoer** (ook fouten laten staan);
- `metadata.md` — kopie van [`../_metadata-template.md`](../_metadata-template.md), met de gebruikte instellingen, microfoon/audiofile en timings.

De voorleestekst staat in [`../../reference.txt`](../../reference.txt). Gebruik voor vergelijkbare resultaten bij voorkeur **hetzelfde audiobestand** voor alle modellen, niet telkens een nieuwe live voorlezing.

### Opmerking over microfoontests

Een foutieve ChatGPT-spraakinvoer op de Windows-laptop terwijl deze WebGPU Studio-pagina ook microfoontoegang had, is **geen gemeten fout van Parakeet**. Meerdere gelijktijdige microfoongebruikers zijn een te onderzoeken omstandigheid; noteer bij toekomstige live tests welke apps/sites de microfoon gebruikten. Vergelijk een proef met alleen WebGPU Studio en een proef met beide apps open om te controleren of de fout reproduceerbaar is.
