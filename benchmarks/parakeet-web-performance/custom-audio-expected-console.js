// Parakeet Web v11.4.0: TEMPORARY DevTools console experiment, not app code.
// Intercepts the hardcoded JFK audio fetch and the JFK expected string used
// by transcriptSimilarity(). Does not compute WER or correct report.clip.source.
// Run directly in the DevTools Console on https://parakeetweb.olicorne.org/.
// Refresh the page to remove the patches (and re-run this snippet next time).
(async () => {
  const REFERENCE_URL =
    "https://raw.githubusercontent.com/sander-van-damme/dnd-notulist/main/benchmarks/dnd-session-nl/reference.md";
  const JFK_EXPECTED =
    "And so, my fellow Americans, ask not what your country can do for you, ask what you can do for your country.";

  // Load the intended D&D script. For a precise score, replace this with a
  // verified verbatim transcript if what was actually spoken deviates.
  const referenceResponse = await fetch(REFERENCE_URL, { cache: "no-store" });
  if (!referenceResponse.ok) throw new Error("Cannot load expected text: HTTP " + referenceResponse.status);
  const expected = (await referenceResponse.text()).replace(/\s+/g, " ").trim();
  if (expected.length < 100) throw new Error("Unexpectedly short D&D expected text");

  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = ".mp3,audio/mpeg";
  const audioFile = await new Promise((resolve) => {
    picker.addEventListener("change", () => resolve(picker.files?.[0] ?? null), { once: true });
    picker.addEventListener("cancel", () => resolve(null), { once: true });
    picker.click();
  });
  if (!audioFile) {
    console.info("Benchmark patch cancelled; no changes made.");
    return;
  }

  // The earlier audio-only snippet stored its native fetch in this property.
  window.__dndBenchOriginalFetch ??=
    window.__originalBenchmarkFetch ?? window.fetch.bind(window);
  window.__dndBenchOriginalLower ??= String.prototype.toLowerCase;
  const baseFetch = window.__dndBenchOriginalFetch;
  const baseLower = window.__dndBenchOriginalLower;
  const expectedLower = baseLower.call(expected);

  window.fetch = (resource, options) => {
    const url = resource instanceof Request ? resource.url : String(resource);
    if (new URL(url, document.baseURI).pathname.endsWith("/benchmark/jfk.mp3")) {
      console.info("Using custom benchmark MP3:", audioFile.name);
      return Promise.resolve(new Response(audioFile, {
        status: 200,
        headers: { "Content-Type": "audio/mpeg" },
      }));
    }
    return baseFetch(resource, options);
  };

  // The current Parakeet Web scoring code calls String(text).toLowerCase()
  // before the LCS comparison. Override ONLY the exact JFK expected sentence.
  // This modifies a built-in method temporarily; disable after the experiment.
  String.prototype.toLowerCase = function (...args) {
    if (String(this) === JFK_EXPECTED) return expectedLower;
    return baseLower.apply(this, args);
  };

  window.__dndBenchRestore = () => {
    window.fetch = baseFetch;
    String.prototype.toLowerCase = baseLower;
    console.info("Benchmark overrides removed.");
  };

  console.info(
    "Custom audio + expected text ready:",
    audioFile.name,
    "| expected text characters:",
    expected.length,
    "| benchmark source field will STILL say JFK.",
    "Turn LONG AUDIO PROFILE OFF for files over 90 s. Run benchmark."
  );
})().catch((err) => console.error("Could not install benchmark overrides", err));
