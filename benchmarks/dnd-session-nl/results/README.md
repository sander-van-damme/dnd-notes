# Modelresultaten — D&D-voorleesbenchmark

## Wat leren de eerste tests?

Met `parakeet-tdt-0.6b-v3-ultra-onnx` halen we op een opname van **209,43 seconden** voorlopig **12,29% WER** (65 fouten op 529 referentiewoorden) bij WebGPU fp16, phrase boosting en Beam Width 5. Zonder boosting was dat **13,80%** (73 fouten). Boost Strength **2** leverde geen enkele andere transcriptiewoordkeuze op dan strength **1**.

De grootste zorg is **niet alleen** WER: namen als *Nerin Vale* en *Edda Voss* blijven verkeerd herkend, en *gewond* verandert in *gewoon*. De [inhoudelijke analyse per configuratie](parakeet-tdt-0.6b-v3-ultra-onnx/README.md) legt uit welke verbeteringen werkelijk relevant zijn voor sessienotities, en welke alleen de schrijfwijze veranderen.

## Nieuwe resultaten bewaren

Bewaar nieuwe modelresultaten in een herkenbare map met de originele export en bij voorkeur een korte conclusie. **Er is geen verplicht template of vaste naamconventie.** Noteer waar mogelijk het model, de instellingen en het gebruikte audiobestand; ontbrekende gegevens zijn geen blokkade. Vergelijk transcriptie-WER met de [referentie](../reference.md), maar controleer daarnaast ook inhoudelijke verhaalfeiten. Een echt geverifieerd transcript van wat werd uitgesproken ontbreekt voorlopig.
