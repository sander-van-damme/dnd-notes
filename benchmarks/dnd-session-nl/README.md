# D&D-voorleesbenchmark (Nederlands met Engelse D&D-termen)

Een fictieve D&D-sessie om spraakherkenningsmodellen en later de kwaliteit van sessienotities te vergelijken.

- [**reference.md**](reference.md): het script om één keer voor te lezen/op te nemen.
- [**results/**](results/): resultaten van de verschillende modellen en tools.

## Gebruik

Neem het script bij voorkeur **één keer** op en geef hetzelfde audiobestand aan verschillende modellen. Bewaar wat je aan uitvoer en instellingen hebt onder `results/` — zonder verplicht bestandsformat, mappenschema of metadataformulier.

Vermeld als het kan welk model en welke configuratie je testte, welke audio werd gebruikt en of de transcriptie onbewerkt is. Een volledig run-verslag is niet verplicht.

De referentietekst is wat je **bedoelde voor te lezen**. Voor een definitieve WER moet de referentie overeenkomen met de **werkelijk uitgesproken** woorden. Vergelijk transcriptienauwkeurigheid (WER) los van inhoudelijke sessienotities (correcte feiten, gemiste gebeurtenissen en verzinsels).

## Huidige bevindingen

Bij [Parakeet TDT 0.6B v3 Ultra](results/parakeet-tdt-0.6b-v3-ultra-onnx/README.md) daalde de WER op deze ene opname van **13,80%** zonder boosting naar **12,29%** met phrase boosting en Beam Width 5. Niet alle NPC-namen worden correct herkend, en `gewond` wordt zelfs `gewoon`. Daarom wordt hier niet alleen op woordfouten geoptimaliseerd: het correct bewaren van **verhaalfeiten** is minstens zo belangrijk.
