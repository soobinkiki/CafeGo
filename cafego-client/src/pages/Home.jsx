import {
  useState
} from "react";

import {
  Link,
  useNavigate
} from "react-router-dom";

import Search from "../components/Search";


// ============================================================
// READ SAVED LOCATION
// ============================================================

function readStoredLocation() {
  try {
    const value =
      sessionStorage.getItem(
        "cafego_user_location"
      );

    if (!value) {
      return null;
    }

    const parsed =
      JSON.parse(value);

    if (
      Number.isFinite(
        parsed.latitude
      ) &&
      Number.isFinite(
        parsed.longitude
      )
    ) {
      return parsed;
    }
  }

  catch {
    // Ignore invalid saved location.
  }

  return null;
}


// ============================================================
// HOME
// ============================================================

export default function Home() {
  const navigate =
    useNavigate();


  const [
    showExploreLocationModal,
    setShowExploreLocationModal
  ] =
    useState(false);


  const [
    locationBusy,
    setLocationBusy
  ] =
    useState(false);


  // ============================================================
  // FEATURES
  // ============================================================

  const features = [
    {
      icon: "bi-clock",
      title: "Know before you go",
      text:
        "Check hours, open status, seating and useful cafe details before you visit."
    },
    {
      icon: "bi-cup-hot",
      title: "Find your kind of cafe",
      text:
        "Discover places for working, studying, meeting friends or taking a quiet break."
    },
    {
      icon: "bi-chat-square-text",
      title: "Learn from visitors",
      text:
        "See helpful review highlights without digging through every review."
    },
    {
      icon: "bi-geo-alt",
      title: "Explore with confidence",
      text:
        "Compare photos, ratings, distance, directions and nearby options in one place."
    }
  ];


  // ============================================================
  // DISCOVERY ITEMS
  // ============================================================

  const discoveryItems = [
    {
      icon: "bi-laptop",
      title: "Work & study",
      text:
        "Find cafes with useful details for longer stays."
    },
    {
      icon: "bi-moon-stars",
      title: "Open late",
      text:
        "Discover places that stay open when you need them."
    },
    {
      icon: "bi-tree",
      title: "Outdoor seating",
      text:
        "Look for cafes with outdoor seating available."
    },
    {
      icon: "bi-p-circle",
      title: "Parking",
      text:
        "See available parking information when it is listed."
    }
  ];


  // ============================================================
  // EXPLORE BUTTON
  // ============================================================

  function handleExploreClick() {
    const storedLocation =
      readStoredLocation();


    if (storedLocation) {
      navigate(
        `/explore?lat=${
          storedLocation.latitude
        }&lng=${
          storedLocation.longitude
        }&near=1`
      );

      return;
    }


    setShowExploreLocationModal(
      true
    );
  }


  // ============================================================
  // NOT NOW
  // ============================================================

  function declineExploreLocation() {
    setShowExploreLocationModal(
      false
    );


    setLocationBusy(
      false
    );


    /*
      Default discovery city:
      New York, NY
    */

    navigate(
      "/explore?q=New York%2C%20NY"
    );
  }


  // ============================================================
  // USE MY LOCATION
  // ============================================================

  function confirmExploreLocation() {
    setShowExploreLocationModal(
      false
    );


    if (
      !navigator.geolocation
    ) {
      navigate(
        "/explore?q=New York%2C%20NY"
      );

      return;
    }


    setLocationBusy(
      true
    );


    navigator.geolocation.getCurrentPosition(

      // ========================================================
      // SUCCESS
      // ========================================================

      (position) => {
        const location = {
          latitude:
            position.coords.latitude,

          longitude:
            position.coords.longitude
        };


        sessionStorage.setItem(
          "cafego_user_location",

          JSON.stringify(
            location
          )
        );


        setLocationBusy(
          false
        );


        navigate(
          `/explore?lat=${
            location.latitude
          }&lng=${
            location.longitude
          }&near=1`
        );
      },


      // ========================================================
      // ERROR
      // ========================================================

      () => {
        setLocationBusy(
          false
        );


        sessionStorage.removeItem(
          "cafego_user_location"
        );


        navigate(
          "/explore?q=New York%2C%20NY"
        );
      },


      {
        enableHighAccuracy:
          false,

        timeout:
          10000
      }
    );
  }


  // ============================================================
  // UI
  // ============================================================

  return (
    <>

      {/* ========================================================
          HERO
      ======================================================== */}

      <section className="hero">

        <div className="container center">


          <div className="eyebrow">
            LOCAL CAFE DISCOVERY
          </div>


          <h1>

            Your next cafe is

            <br />

            <em>
              closer than you think.
            </em>

          </h1>


          <p>

            Search an area or use your location to discover cafes with photos,
            ratings, hours, directions and useful details.

          </p>


          <Search />


          {/* ====================================================
              CITY LINKS
          ==================================================== */}

          <div className="chips">


            <Link to="/explore?q=Los%20Angeles%2C%20CA">
              Los Angeles
            </Link>


            <Link to="/explore?q=New%20York%2C%20NY">
              New York
            </Link>


            <Link to="/explore?q=Chicago%2C%20IL">
              Chicago
            </Link>


            <Link to="/explore?q=San%20Francisco%2C%20CA">
              San Francisco
            </Link>


            <Link to="/explore?q=Seattle%2C%20WA">
              Seattle
            </Link>


            <Link to="/explore?q=Miami%2C%20FL">
              Miami
            </Link>


            <Link to="/explore?q=Boston%2C%20MA">
              Boston
            </Link>


            <Link to="/explore?q=Washington%2C%20DC">
              Washington
            </Link>


            <Link to="/explore?q=Las%20Vegas%2C%20NV">
              Las Vegas
            </Link>


            <Link to="/explore?q=San%20Diego%2C%20CA">
              San Diego
            </Link>


          </div>

        </div>

      </section>


      {/* ========================================================
          WHY CAFEGO
      ======================================================== */}

      <section className="container feature home-why">


        <div className="home-section-heading">


          <div className="eyebrow">
            WHY CAFEGO
          </div>


          <h2>
            Find the cafe that fits your day.
          </h2>


          <p>

            CafeGo brings together the details that help you choose a place
            before you head out.

          </p>


        </div>


        <div className="row g-4 mt-2">


          {features.map(
            (feature) => (

              <div
                className="col-12 col-md-6 col-xl-3"
                key={
                  feature.title
                }
              >


                <div className="featurecard home-feature-card">


                  <div className="home-feature-icon">

                    <i
                      className={`bi ${feature.icon}`}
                    />

                  </div>


                  <h3>
                    {feature.title}
                  </h3>


                  <p>
                    {feature.text}
                  </p>


                </div>


              </div>

            )
          )}


        </div>

      </section>


      {/* ========================================================
          DISCOVERY BANNER
      ======================================================== */}

      <section className="container home-discovery">


        <div className="home-discovery-panel">


          <div className="home-discovery-copy">


            <div className="eyebrow">
              MORE THAN A CAFE LIST
            </div>


            <h2>
              Find a place for what you actually need.
            </h2>


            <p>

              A great cafe can mean something different depending on the day.
              CafeGo helps surface practical details so you can find the right
              place for your plans.

            </p>


            <button
              type="button"

              className="btn dark home-discovery-button"

              onClick={
                handleExploreClick
              }

              disabled={
                locationBusy
              }
            >

              {locationBusy
                ? "Finding cafes..."
                : "Explore cafes"}


              {!locationBusy && (

                <i className="bi bi-arrow-right" />

              )}

            </button>


          </div>


          <div className="home-discovery-grid">


            {discoveryItems.map(
              (item) => (

                <div
                  className="home-discovery-item"

                  key={
                    item.title
                  }
                >


                  <div className="home-discovery-item-icon">

                    <i
                      className={`bi ${item.icon}`}
                    />

                  </div>


                  <div>


                    <h3>
                      {item.title}
                    </h3>


                    <p>
                      {item.text}
                    </p>


                  </div>


                </div>

              )
            )}


          </div>


        </div>

      </section>


      {/* ========================================================
          DETAILS PREVIEW
      ======================================================== */}

      <section className="container home-details">


        <div className="row align-items-center g-5">


          <div className="col-lg-5">


            <div className="eyebrow">
              USEFUL DETAILS
            </div>


            <h2>
              The information you want before choosing a cafe.
            </h2>


            <p className="home-details-copy">

              From parking and outdoor seating to review highlights and
              work-friendly details, CafeGo keeps useful information together
              in one simple view.

            </p>


            <button
              type="button"

              className="home-text-link home-text-link-button"

              onClick={
                handleExploreClick
              }

              disabled={
                locationBusy
              }
            >

              Start exploring

              <i className="bi bi-arrow-up-right" />

            </button>


          </div>


          <div className="col-lg-7">


            <div className="home-detail-preview">


              <div className="home-detail-preview-top">


                <div>


                  <span className="home-preview-label">
                    CAFE DETAILS
                  </span>


                  <h3>
                    Everything in one place
                  </h3>


                </div>


                <span className="home-preview-status">
                  Open now
                </span>


              </div>


              <div className="home-preview-grid">


                <div className="home-preview-row">

                  <i className="bi bi-clock" />

                  <div>

                    <strong>
                      Hours
                    </strong>

                    <span>
                      See today's schedule
                    </span>

                  </div>

                </div>


                <div className="home-preview-row">

                  <i className="bi bi-tree" />

                  <div>

                    <strong>
                      Outdoor seating
                    </strong>

                    <span>
                      Know before you arrive
                    </span>

                  </div>

                </div>


                <div className="home-preview-row">

                  <i className="bi bi-p-circle" />

                  <div>

                    <strong>
                      Parking
                    </strong>

                    <span>
                      Structured and visitor information
                    </span>

                  </div>

                </div>


                <div className="home-preview-row">

                  <i className="bi bi-laptop" />

                  <div>

                    <strong>
                      Work & study
                    </strong>

                    <span>
                      Useful signals from visitor reviews
                    </span>

                  </div>

                </div>


                <div className="home-preview-row">

                  <i className="bi bi-chat-square-text" />

                  <div>

                    <strong>
                      What visitors say
                    </strong>

                    <span>
                      Helpful highlights at a glance
                    </span>

                  </div>

                </div>


                <div className="home-preview-row">

                  <i className="bi bi-geo-alt" />

                  <div>

                    <strong>
                      Distance & directions
                    </strong>

                    <span>
                      Find places closer to you
                    </span>

                  </div>

                </div>


              </div>


            </div>


          </div>


        </div>

      </section>


      {/* ========================================================
          FINAL CTA
      ======================================================== */}

      <section className="container home-cta">


        <div className="home-cta-inner">


          <div>


            <div className="eyebrow">
              FIND YOUR NEXT CAFE
            </div>


            <h2>
              Ready to find a place that works for you?
            </h2>


            <p>

              Search a city, neighborhood or ZIP code and start exploring.

            </p>


          </div>


          <button
            type="button"

            className="btn dark home-cta-button"

            onClick={
              handleExploreClick
            }

            disabled={
              locationBusy
            }
          >

            {locationBusy
              ? "Finding cafes..."
              : "Explore cafes"}


            {!locationBusy && (

              <i className="bi bi-arrow-right" />

            )}

          </button>


        </div>

      </section>


      {/* ========================================================
          EXPLORE LOCATION MODAL
      ======================================================== */}

      {showExploreLocationModal && (

        <div
          className="location-modal-backdrop"

          onClick={
            declineExploreLocation
          }
        >


          <div
            className="location-modal"

            role="dialog"

            aria-modal="true"

            aria-labelledby="home-explore-location-title"

            onClick={
              (event) =>
                event.stopPropagation()
            }
          >


            <div className="location-modal-icon">

              <i className="bi bi-geo-alt-fill" />

            </div>


            <h2 id="home-explore-location-title">
              Find cafes near you?
            </h2>


            <p>

              Use your current location to discover cafes closest to you.
              You can also continue without using your location.

            </p>


            <button
              type="button"

              className="btn dark w-100"

              onClick={
                confirmExploreLocation
              }
            >

              Use my location

            </button>


            <button
              type="button"

              className="location-not-now"

              onClick={
                declineExploreLocation
              }
            >

              Not now

            </button>


          </div>


        </div>

      )}


    </>
  );
}