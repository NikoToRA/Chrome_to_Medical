// EMR domain mappings used by PlatformDetector and Adapters
// Add or adjust domains as needed. Keep minimal and vendor-owned.
(function(){
  const map = {
    // Confirmed
    clinics: ["clinics-karte.com", "medley.jp", "karte.medley.life"],
    m3_digikar: ["digikar.co.jp", "karte.m3.com"],
    mobacal: ["mobacal.net"],

    // Placeholders (TODO: confirm official login/app domains)
    medicom_hope: [
      // e.g., "hope-cloud.example.jp"
    ],
    brainbox: [
      // e.g., "brainbox.example.jp"
    ],
    maps: [
      // e.g., "maps.example.jp"
    ]
  };

  if (typeof window !== 'undefined') {
    window.EMR_DOMAINS = map;
  }
})();
