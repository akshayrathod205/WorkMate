import React from "react";
import { Link } from "react-router-dom";
import "./Navbar.css"; // Import the CSS file
import { useNavigate } from "react-router-dom";
import { logoutUser } from "../api";
import { clearSession } from "../auth";

const Navbar = () => {
  const navigate = useNavigate();
  const handleSignOut = async () => {
    try {
      await logoutUser();
    } catch (e) {
      // ignore — clear client state regardless
    }
    clearSession();
    window.location.href = "/login";
  };

  const userName = localStorage.getItem("name");
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="navbar-brand">
          WorkMate
        </Link>
      </div>
      <div className="navbar-right">
        <span className="navbar-user-name">{userName}</span>
        <button
          className="navbar-sign-out"
          onClick={() => navigate("/projects")}
        >
          Projects
        </button>
        <button className="navbar-sign-out" onClick={handleSignOut}>
          Sign Out
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
