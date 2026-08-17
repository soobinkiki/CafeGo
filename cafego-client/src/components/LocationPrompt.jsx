import { useEffect, useState } from "react";

export default function LocationPrompt() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const preference = localStorage.getItem("cafego_location_preference");

    if (!preference) {
      setShow(true);
    }

    if (preference === "enabled") {
      requestLocation(false);
    }
  }, []);

  function requestLocation(closeAfter = true) {
    if (!navigator.geolocation) {
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        sessionStorage.setItem(
          "cafego_user_location",
          JSON.stringify(location)
        );

        localStorage.setItem(
          "cafego_location_preference",
          "enabled"
        );

        setLoading(false);

        if (closeAfter) {
          setShow(false);
        }

        window.dispatchEvent(
          new CustomEvent("cafego-location-updated", {
            detail: location
          })
        );
      },
      () => {
        setLoading(false);
        setShow(false);

        localStorage.setItem(
          "cafego_location_preference",
          "declined"
        );
      },
      {
        enableHighAccuracy: false,
        timeout: 10000
      }
    );
  }

  function notNow() {
    localStorage.setItem(
      "cafego_location_preference",
      "declined"
    );

    setShow(false);
  }

  if (!show) {
    return null;
  }

  return (
    <div className="location-modal-backdrop">
      <div className="location-modal">
        <div className="location-modal-icon">
          <i className="bi bi-geo-alt-fill" />
        </div>

        <h2>Find cafes near you</h2>

        <p>
          Turn on location to see how far each cafe is from you,
          which direction it is, and find nearby cafes faster.
        </p>

        <button
          className="btn dark w-100"
          onClick={() => requestLocation(true)}
          disabled={loading}
        >
          {loading ? "Finding your location..." : "Use my location"}
        </button>

        <button
          className="location-not-now"
          onClick={notNow}
        >
          Not now
        </button>
      </div>
    </div>
  );
}