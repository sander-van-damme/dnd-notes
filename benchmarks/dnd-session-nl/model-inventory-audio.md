# Inventaris: lokale audio-AI voor Nederlandse en Engelse D&D-sessies

**Onderzocht: 15 oktober 2026.** Dit is een **modellijst en selectieonderzoek**, geen nieuwe benchmark. De bestaande Parakeet-test is afgerond en blijft de referentie: [resultaten en inzichten](results/parakeet-tdt-0.6b-v3-ultra-onnx/README.md). **Gebruik opnieuw dezelfde `dnd-demo.mp3`**, geen extra script of opname.

## Selectiecriteria

Het model moet **gesproken Nederlands én Engels als audiobron** kunnen verwerken, inclusief korte Engelse D&D-termen in Nederlandstalige zinnen. Tekstuele kennis van Nederlands zonder Nederlandse **spraakherkenning** is niet voldoende. Productdoelen zijn lokaal, offline en browser-first met een Pixel 6a als kritisch toestel en een **streefbudget van circa 4 GB totaal browsergeheugen**, inclusief inferentiebuffers (zie [technisch ontwerp](../../docs/TECHNICAL_DESIGN.md)). Een lokaal Python-model is interessant als benchmark, maar is niet automatisch uitvoerbaar op WebGPU of WASM. Grootte in parameters ≠ downloadgrootte ≠ werkgeheugen.

Er zijn twee verschillende modeltypen:

- **ASR (audio → transcript):** vergelijkbaar met Parakeet op WER en eigennamen; voor uiteindelijke sessienotities is dan nog tekstinterpretatie nodig.
- **Audio-LLM (audio → transcript en/of rechtstreeks feiten/notities):** interessant voor de uiteindelijke één-modelarchitectuur; WER én afzonderlijk feitgetrouwe notities meten.

**Bewijslabels:** **bevestigd** = de modelmaker/modelkaart ondersteunt Nederlandse én Engelse audio; **proefkandidaat** = audio en Nederlands als tekst worden ondersteund, maar kwaliteit van **Nederlandse gesproken audio** is niet afzonderlijk onderbouwd. **Browserroute** betekent dat er een ONNX/JavaScript-model of implementatie beschikbaar is; het bewijst **niet** dat een Pixel 6a het geladen krijgt.

## 1. Bevestigde NL+EN ASR-modellen

| Model / variant | Parameters | Waarom relevant | Browser / lokaal | Prioriteit |
|---|---:|---|---|---|
| [Whisper tiny / base / small (multilingual)](https://github.com/openai/whisper) | 39M / 74M / 244M | Klassieke robuuste Nederlandse en Engelse STT; `small` eerste eerlijke alternatieve baseline, `base` voor mobiel | [Whisper-small ONNX](https://huggingface.co/onnx-community/whisper-small) + [Whisper WebGPU-demo](https://huggingface.co/spaces/Xenova/whisper-webgpu); hoge browserhaalbaarheid | **1** |
| [Whisper medium / large-v3 / large-v3-turbo](https://github.com/openai/whisper) | 769M / 1.55B / ~809M | Sterkere Whisper-kwaliteitstest; `turbo` snellere grote variant; wel veel zwaarder | [Turbo ONNX](https://huggingface.co/onnx-community/whisper-large-v3-turbo); eventueel quantized CPU/browser, mobiel riskant | **2–3** |
| [Qwen3-ASR-0.6B](https://github.com/QwenLM/Qwen3-ASR) | 0.6B | 30 spraaktalen + 22 Chinese dialecten, expliciet **nl/en**, taalherkenning en streaming; directe concurrent in dezelfde klasse als Parakeet | [Experimentele WebGPU-ONNX-conversie](https://huggingface.co/jiangzhuo9357/Qwen3-ASR-0.6B-ONNX); geen gegarandeerde Pixel-compatibiliteit | **1** |
| [Qwen3-ASR-1.7B](https://huggingface.co/Qwen/Qwen3-ASR-1.7B) | 1.7B | Kwaliteitsreferentie met dezelfde taalondersteuning | Python/Transformers; browserroute minder bewezen, zwaarder | **2** |
| [NVIDIA Nemotron 3.5 ASR Streaming 0.6B](https://huggingface.co/nvidia/nemotron-3.5-asr-streaming-0.6b) | 0.6B | **nl-NL/en-US/en-GB transcription-ready**; echt incrementeel streamen, interessant voor live notities | [INT4 ONNX](https://huggingface.co/onnx-community/nemotron-3.5-asr-streaming-0.6b-onnx-int4), [zelfstandige browserimplementatie](https://github.com/People-11/Nemotron_Web). Integratie nog experimenteel | **1** |
| [Cohere Transcribe 03-2026](https://huggingface.co/CohereLabs/cohere-transcribe-03-2026) | 2B | Gericht op accurate transcriptie, 14 talen incl nl/en, Apache 2.0 | [Transformers.js ONNX](https://huggingface.co/onnx-community/cohere-transcribe-03-2026-ONNX) en [WebGPU-demo](https://huggingface.co/spaces/CohereLabs/Cohere-Transcribe-WebGPU); relatief zwaar | **2** |
| [Canary 1B v2](https://huggingface.co/nvidia/canary-1b-v2) | ~1B | 25 Europese talen incl nl/en, transcriptie en vertaling | NVIDIA NeMo en lokale ports; **geen eenvoudig bewezen browserpad** | **2–3** |
| [Meta Omnilingual ASR CTC 300M v2](https://github.com/facebookresearch/omnilingual-asr) | 325M | Zeer veel talen; `nld_Latn` en `eng_Latn` in Meta's taal-ID's; compacte ASR | PyTorch/fairseq2, **geen geverifieerde browserimplementatie**; FP32 ~1.3 GiB, officiële ~2GiB GPU-inferentie | **2–3** |
| [Meta Omnilingual ASR CTC 1B v2](https://github.com/facebookresearch/omnilingual-asr) | ~975M | Grotere variant van dezelfde ASR-familie | FP32 ~3.7 GiB download, officiële ~3GiB GPU-inferentie; browser onzeker | **3** |
| [Meta MMS-1B-all](https://huggingface.co/facebook/mms-1b-all) | ~1B | >1000 talen, ook Nederlandse ASR-adapter; vooral breed taaldekkingsexperiment | Per-taaladapter en Transformers/PyTorch, voor code-switching niet eerste keuze; niet-commerciële licentie | **3** |
| [Meta SeamlessM4T v2 large](https://huggingface.co/facebook/seamless-m4t-v2-large) | ~2.3B | Nederlands/Engels als audio-ingang, ASR én spraakvertaling | Desktoponderzoek; zware runtime, **CC-BY-NC-4.0** (niet-commercieel) | **3** |
| [Voxtral Mini 4B Realtime 2602](https://huggingface.co/mistralai/Voxtral-Mini-4B-Realtime-2602) | ~4B | Streaming ASR met **13 talen incl nl/en**; relevante latency-aanpak | [ONNX-port](https://huggingface.co/onnx-community/Voxtral-Mini-4B-Realtime-2602-ONNX) bestaat, geen kant-en-klare bewezen Pixel-browserimplementatie, 4B zwaar | **2–3** |

Whisper: **gebruik de multilingual modelnamen zonder `.en`** (die laatste zijn alleen Engels). Voor Nederlandse audio `task=transcribe`, niet `translate`. Whisper verwerkt doorgaans fragmenten rond de 30 seconden en vereist chunking voor de D&D-opname. [Whisper origineel](https://github.com/openai/whisper). Modelgroottes zijn nominale parameters en geen gegarandeerd browser-RAM.

Voor Cohere is **code-switching een expliciete zwakte**: het model werkt het liefst in één vooraf gekozen taal en doet geen expliciete automatische taaldetectie. Met Nederlandstalige D&D-zinnen en Engelse spreuknamen is dat extra relevant. [Cohere documentatie](https://docs.cohere.com/docs/transcribe) / [technische modelkaart](https://huggingface.co/CohereLabs/cohere-transcribe-03-2026).

Bij Meta Omnilingual is de CTC-300M-variant werkelijk circa 325M, maar de zogenoemde **LLM-300M** bevat volgens Meta **circa 1.63B parameters totaal**. Vermijd die naam als maat voor de totale belasting. [Officiële Meta-tabel](https://github.com/facebookresearch/omnilingual-asr).

## 2. Audio-LLM's: audio → tekst én rechtstreeks notities

| Model | Parameters | Nederlandstalige audio | Relevantie / browserroute |
|---|---:|---|---|
| [Voxtral Mini 3B 2507](https://huggingface.co/mistralai/Voxtral-Mini-3B-2507) | 3B + audiofrontend | **Bevestigd nl/en** (8 talen) | Zeer interessant: ASR, audio-Q&A, samenvatten en function calling vanuit audio in **één model**. [ONNX voor Transformers.js](https://huggingface.co/onnx-community/Voxtral-Mini-3B-2507-ONNX). Wel zwaar; Pixel onbekend. **Prioriteit 1 voor audio→notities.** |
| [Gemma 4 E2B IT](https://ai.google.dev/gemma/docs/core/model_card_4) | E2B effectief; meer fysieke gewichten | **Proefkandidaat:** meertalig audio-ASR, Nederlands als audiotaal niet afzonderlijk gevalideerd | Verwerkt audio én genereert tekst, dus kans op direct sessiefeiten/notities. [Transformers.js/WebGPU ONNX](https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX). **Maximaal 30 seconden audio per call. Prioriteit 1 voor directe notities.** |
| [Gemma 3n E2B IT](https://ai.google.dev/gemma/docs/gemma-3n/model_card) | E2B effectief; meer fysieke gewichten | **Proefkandidaat:** multimodale audio en meertalige tekst, expliciete NL-ASR-kwaliteit niet aangetoond | Mobiel georiënteerd; [ONNX in Transformers.js](https://huggingface.co/onnx-community/gemma-3n-E2B-it-ONNX). Interessant om met Gemma 4 te vergelijken. |
| [Gemma 4 E4B / 12B](https://ai.google.dev/gemma/docs/core/model_card_4) | groter | Als E2B: meertalig audio, NL-specifiek nog toetsen | Architectonisch geldig maar minder passend bij circa 4 GB browserbudget; lage prioriteit voor eerste experiment. |
| [Qwen2.5-Omni-3B / 7B](https://github.com/QwenLM/Qwen2.5-Omni) | 3B / 7B | **Onzeker:** audio-input bestaat, maar Nederlandse **spraakherkenning** niet expliciet onderbouwd in de geraadpleegde ASR-evaluaties | Audio-LLM met meerdere modaliteiten; hoog geheugenverbruik en geen bewezen kleine browserimplementatie. Proefkandidaat, **niet** bevestigd strikt NL-ASR-model. |

**Opmerking:** audio direct laten samenvatten betekent **geen WER-berekening op de notities**. Doe daarvoor een aparte expliciete transcriptieprompt met hetzelfde model. Voor notities beoordeel je concrete feiten (NPC, status, beloning, besluiten, correcties). De technische voorkeursarchitectuur in [het project](../../docs/TECHNICAL_DESIGN.md) is één lokaal audio-LLM als die voldoende goed en zuinig blijkt; dedicated ASR blijft nuttig als nauwkeurigheidsreferentie.

## 3. Genoemde modellen die niet aan de strikte eis voldoen

| Naam | Uitkomst | Reden en bewijs |
|---|---|---|
| [Qwen 2.5 0.5B Instruct](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct) | **Afvallen** | Model kan Nederlands en Engels als **tekst**, maar heeft geen native audio-ingang. **Qwen3-ASR-0.6B** is het relevante Qwen-model. |
| [Ministral 3 3B](https://docs.mistral.ai/models/ministral-3-3b-25-12) | **Afvallen** | Tekst+beeld, geen native audio. **Voxtral** is de passende Mistral-familie. |
| [Moonshine Voice](https://moonshine-voice.readthedocs.io/en/latest/models/available-models/) | **Nog afvallen voor NL-STT** | Erg lichte en snelle **Engelstalige** streamingmodellen, maar in de actuele Moonshine-**STT**-catalogus geen Nederlands. Nederlands bij Moonshine **TTS** is iets anders dan Nederlands **ASR**. Wel interessante familie om te volgen. |
| [Meta Llama 4 Scout / Maverick](https://dev.meta.ai/llama/docs/model-cards-and-prompt-formats/llama4) | **Afvallen** | Native modelinput tekst+beeld, **geen audio**; ook NL niet onder 12 officieel ondersteunde talen. Een afzonderlijke audio-encoder zou een ander model/systeem zijn. |
| [Meta Muse Wonder / Wonder Full](https://about.fb.com/news/2026/10/introducing-muse-wonder-models/) | **Afvallen voor lokale benchmark** | Op 12 oktober 2026 aangekondigde **gehoste** modellen via Meta Model API / Muse Code, geen geverifieerde vrij downloadbare gewichten of lokaal Nederlandse audio-ASR-checkpoint. |
| [Microsoft Phi-4 multimodal](https://huggingface.co/microsoft/Phi-4-multimodal-instruct) | **Afvallen onder strikte taaleis** | Wel audio-ingang en Nederlandse **tekst**, maar Microsoft noemt voor **audio** alleen en/zh/de/fr/it/ja/es/pt; **nl ontbreekt**. |
| [IBM Granite Speech 4.1 2B](https://huggingface.co/ibm-granite/granite-speech-4.1-2b) | **Afvallen** | Nederlandse audio niet officieel vermeld als ondersteund. |

**Belangrijk onderscheid:** de uitspraak ‘model is meertalig’ zegt niets zonder duidelijk te maken of het over **audio**, **tekst**, **OCR/beelden**, vertaling of output gaat.

## Praktische prioritering met dezelfde opname

**Snelste nieuwe vergelijkbare baseline:** `Whisper small (multilingual)` in [WebGPU-demo](https://huggingface.co/spaces/Xenova/whisper-webgpu). Zelfde `dnd-demo.mp3`, `nl` en `transcribe`, automatische chunking. Als de demo remote inference inzet, ga voor de ONNX/Transformers.js-route; voor offline/privacy telt alleen lokale uitvoering.

**Twee modernere compacte uitdagers:** daarna `Qwen3-ASR-0.6B` en `Nemotron-3.5-ASR-Streaming-0.6B`, met hun beschikbare experimentele browserimplementaties. Dit zijn de interessantste modellen van **vergelijkbare modelklasse** als Parakeet en echte nl/en-audio.

**Productarchitectuur parallel toetsen:** `Gemma 4 E2B` en `Voxtral Mini 3B`: probeer (a) letterlijk Nederlands transcriberen, (b) feiten over `Nerin Vale`, `Edda Voss`, `Veyra`, `gewond`, sleutels/beloningen ophalen **rechtstreeks uit audio**. Bij Gemma: verplicht fragmenteren tot maximaal 30 s; Voxtral kan langer audio verwerken, maar RAM is een risico.

**Overige kanshebbers:** Cohere Transcribe als precisie-kandidaat met aandacht voor code-switching; Whisper large-v3-turbo als desktopkwaliteitsreferentie; Canary en Meta Omnilingual als browsersituatie verbetert.

Bij elke WER-test exact dezelfde tekstnormalisatie als de Parakeet-baseline gebruiken en apart vermelden wat de aanvullende **Nederlandse getalnormalisatie** doet. De huidige beste Parakeet-score is **12,29% originele WER / 8,70% aanvullend genormaliseerd**, op 529 scriptwoorden. Die score is voorlopig omdat de daadwerkelijk uitgesproken woorden niet afzonderlijk werden nagekeken. **Benchmarkcijfers op FLEURS/Open ASR Leaderboard mogen niet rechtstreeks vergeleken worden met de D&D-WER**.

**Nog open vóór een productieadvies:** actuele modeldownload per gekozen quantisatie, webadapter/runtime, daadwerkelijk totaal geheugen bij het laden, eerste laadduur, transcriptietijd voor 209,43 s, taalfouten bij code-switching, namen en feitgetrouwheid, licentievoorwaarden. ONNX-gewichten alleen garanderen geen werkende WebGPU-adapter op de Pixel 6a.
