(function (global) {
  "use strict";

  const GEO = () => global.COUNTRY_GEO || {};
  const TOPO_URL = "vendor/countries-110m.json";

  let worldFeatures = null;
  let loadPromise = null;

  function loadWorld() {
    if (worldFeatures) return Promise.resolve(worldFeatures);
    if (loadPromise) return loadPromise;
    loadPromise = fetch(TOPO_URL)
      .then((r) => {
        if (!r.ok) throw new Error("map fetch failed");
        return r.json();
      })
      .then((topo) => {
        worldFeatures = topojson.feature(topo, topo.objects.countries);
        return worldFeatures;
      })
      .catch((err) => {
        loadPromise = null;
        throw err;
      });
    return loadPromise;
  }

  function flagUrl(code, width) {
    const w = width || 160;
    const id = (code || "").toLowerCase();
    if (id === "xk") return `https://flagcdn.com/w${w}/xk.png`;
    return `https://flagcdn.com/w${w}/${id}.png`;
  }

  function createMap(container) {
    const map = L.map(container, {
      zoomControl: true,
      attributionControl: true,
      worldCopyJump: true,
      minZoom: 1,
      maxZoom: 8,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 8,
    }).addTo(map);

    const countriesLayer = L.geoJSON(null, {
      style: {
        color: "#9ab5ab",
        weight: 0.6,
        fillColor: "#d7e6de",
        fillOpacity: 0.85,
      },
    }).addTo(map);

    const highlightLayer = L.geoJSON(null, {
      style: {
        color: "#1a5f4a",
        weight: 2,
        fillColor: "#e8a54b",
        fillOpacity: 0.75,
      },
    }).addTo(map);

    let pin = null;

    map.setView([20, 10], 1.5);

    return {
      map,
      countriesLayer,
      highlightLayer,
      setPin(lat, lng) {
        if (pin) {
          map.removeLayer(pin);
          pin = null;
        }
        pin = L.circleMarker([lat, lng], {
          radius: 8,
          color: "#1a5f4a",
          weight: 2,
          fillColor: "#e8a54b",
          fillOpacity: 1,
        }).addTo(map);
      },
      clearPin() {
        if (pin) {
          map.removeLayer(pin);
          pin = null;
        }
      },
      invalidate() {
        setTimeout(() => map.invalidateSize(), 50);
      },
    };
  }

  function featureForCountry(countryId) {
    const geo = GEO()[countryId];
    if (!geo || geo.numeric == null || !worldFeatures) return null;
    const raw = String(geo.numeric);
    const padded = raw.padStart(3, "0");
    return (
      worldFeatures.features.find(
        (f) => String(f.id) === raw || String(f.id) === padded
      ) || null
    );
  }

  async function showCountry(mapApi, countryId, statusEl, loadingText, errorText) {
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = loadingText || "…";
    }

    try {
      await loadWorld();
      if (mapApi.countriesLayer.getLayers().length === 0) {
        mapApi.countriesLayer.addData(worldFeatures);
      }

      mapApi.highlightLayer.clearLayers();
      mapApi.clearPin();

      const geo = GEO()[countryId] || { lat: 20, lng: 0, zoom: 2 };
      const feature = featureForCountry(countryId);

      if (feature) {
        mapApi.highlightLayer.addData(feature);
        const bounds = mapApi.highlightLayer.getBounds();
        if (bounds.isValid()) {
          mapApi.map.fitBounds(bounds.pad(0.35), { animate: true, maxZoom: geo.zoom || 6 });
        } else {
          mapApi.map.setView([geo.lat, geo.lng], geo.zoom || 4);
        }
        // Small places (HK, MO, etc.) also get a pin for clarity
        if (countryId === "hk" || countryId === "mo" || countryId === "sg" || countryId === "va") {
          mapApi.setPin(geo.lat, geo.lng);
        }
      } else {
        mapApi.setPin(geo.lat, geo.lng);
        mapApi.map.setView([geo.lat, geo.lng], geo.zoom || 4);
      }

      mapApi.invalidate();
      if (statusEl) statusEl.hidden = true;
    } catch (e) {
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = errorText || "Error";
      }
    }
  }

  global.CountryMap = {
    flagUrl,
    createMap,
    showCountry,
    loadWorld,
  };
})(window);
