# Modelresultaten

Maak **per model én configuratie** een eigen map en daaronder een aparte map voor elke run; houd herhaalde runs uit elkaar. Bijvoorbeeld:

```text
results/
  parakeet-tdt-v3-multilingual-webgpu/
    README.md
    run-01/
      transcript.md           # onbewerkte uitvoer (nu nog leeg)
      metadata.md             # na test aanmaken en invullen
  whisper-small/
    run-01/
      transcript.txt
      metadata.md
      notes.md                # alleen indien getest
```

- `transcript.txt` of `transcript.md`: letterlijk de **ruwe** ASR-uitvoer; niets handmatig herstellen. Gebruik een consistent bestandsformaat per model. Niet van toepassing bij modellen die alleen sessienotities leveren.
- `notes.md`: onbewerkte door het model geproduceerde sessienotities, indien van toepassing.
- `metadata.md`: maak een kopie van [`_metadata-template.md`](_metadata-template.md) en vul minstens model/revisie, runtime, hardware, bronbestand of live input, parameters en uitvoeringstijd in.

Voer voor een vergelijking bij voorkeur **dezelfde opname** in bij alle modellen. Bewaar een eventuele opname met eigen toestemming op een geschikte plaats; ze is niet nodig om deze tekstbestanden te versiebeheren.

**Let op:** een resultaatsubmap per **run** maakt het mogelijk dezelfde modelversie meerdere keren te testen zonder voorgaande resultaten te overschrijven.

## Parakeet Web Ultra (meerdere backends en precisies)

De [WER-export met zes ruwe modeltranscripties](../../parakeet-web-performance/2026-10-14/custom-mp3-wer-run-02/README.md) staat bij de bijbehorende performance- en omgevingsrapporten. Dit is **niet** dezelfde testconfiguratie als de nog lege `parakeet-tdt-v3-multilingual-webgpu/run-01/transcript.md`; de resultaten van de verschillende Parakeet-webapps en runs mogen niet door elkaar worden gehaald.
