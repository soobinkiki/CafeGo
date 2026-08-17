import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Detail from "./pages/Detail";
import LocationPrompt from "./components/LocationPrompt";

function Nav() {
  return (
    <nav className="navx">
      <div className="container d-flex align-items-center">
        <Link className="brand" to="/">
          Cafe<span>Go</span>
        </Link>
        {/* <Link className="btn dark ms-auto" to="/explore">
          Find cafes
        </Link> */}
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer>
      <div className="container py-5">
        <div className="brand">
          Cafe<span>Go</span>
        </div>
        <small>Discover cafes near you.</small>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <>
      <Nav />
      <LocationPrompt />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/cafes/:id" element={<Detail />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
