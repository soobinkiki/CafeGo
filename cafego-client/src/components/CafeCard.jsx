import { Link } from "react-router-dom";
import { photo } from "../services/api";

function PhotoAttribution({ data }) {
  const attribution = data?.authorAttributions?.[0];
  if (!attribution?.displayName) return null;

  return (
    <div className="photo-credit">
      {attribution.uri ? (
        <a href={attribution.uri} target="_blank" rel="noreferrer">
          Photo: {attribution.displayName}
        </a>
      ) : (
        <span>Photo: {attribution.displayName}</span>
      )}
    </div>
  );
}

export default function CafeCard({ c, distanceMiles, direction }) {
  const img = c.photos?.[0];

  return (
    <article className="cardx h-100">
      <div className="card-photo-wrap">
        {img ? (
          <>
            <img src={photo(img.name, 900, 650)} alt={c.displayName} />
            <PhotoAttribution data={img} />
          </>
        ) : (
          <div className="blank"><i className="bi bi-cup-hot" /></div>
        )}
      </div>

      <div className="p-4">
        <div className="card-title-row">
          <div>
            <h2 className="h5">{c.displayName}</h2>
            <div className="rating">
              {c.rating && (
                <>
                  ★ <b>{c.rating.toFixed(1)}</b>{" "}
                  <span>({c.userRatingCount || 0})</span>
                </>
              )}
            </div>
          </div>

          {c.openNow != null && (
            <span className={`status-pill ${c.openNow ? "status-open" : "status-closed"}`}>
              {c.openNow ? "Open" : "Closed"}
            </span>
          )}
        </div>

        <p className="address">{c.formattedAddress}</p>

        <div className="card-meta-row">
          {distanceMiles != null && direction && (
            <span className="distance-badge">
              <i className="bi bi-navigation-fill" />
              {distanceMiles.toFixed(distanceMiles < 10 ? 1 : 0)} mi · {direction}
            </span>
          )}

          {c.outdoorSeating === true && (
            <span className="mini-feature">
              <i className="bi bi-tree" /> Outdoor seating
            </span>
          )}
        </div>

        <div className="d-flex gap-2 mt-3">
          <Link className="btn soft flex-grow-1" to={`/cafes/${c.id}`}>
            View details
          </Link>

          {c.googleMapsUri && (
            <a
              className="mapbtn"
              href={c.googleMapsUri}
              target="_blank"
              rel="noreferrer"
              aria-label="Open in Google Maps"
            >
              ↗
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
