# Modelresultaten

Maak **per model én configuratie** een eigen map; houd herhaalde runs uit elkaar. Bijvoorbeeld:

```text
results/
  whisper-small-2026-10-14-run-01/
    transcript.txt
    metadata.md
    notes.md                  # alleen indien getest
  gemma-4-e2b-run-01/
    transcript.txt            # indien beschikbaar
    metadata.md
    notes.md                  # indien getest
```

- `transcript.txt`: letterlijk de **ruwe** ASR-uitvoer; niets handmatig herstellen. Niet van toepassing bij modellen die alleen sessienotities leveren.
- `notes.md`: onbewerkte door het model geproduceerde sessienotities, indien van toepassing.
- `metadata.md`: maak een kopie van [`_metadata-template.md`](_metadata-template.md) en vul minstens model/revisie, runtime, hardware, bronbestand of live input, parameters en uitvoeringstijd in.

Voer voor een vergelijking bij voorkeur **dezelfde opname** in bij alle modellen. Bewaar een eventuele opname met eigen toestemming op een geschikte plaats; ze is niet nodig om deze tekstbestanden te versiebeheren.

**Let op:** een resultaatsubmap per **run** maakt het mogelijk dezelfde modelversie meerdere keren te testen zonder voorgaande resultaten te overschrijven.
