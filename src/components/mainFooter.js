// src/components/MainFooter.js
import React from "react";
import { Link } from "react-router-dom";
import { FaGithub, FaTwitter, FaInstagram } from "react-icons/fa";

export default function MainFooter() {
  return (
    <footer className="main_footer">
      <div className="footer_content">
        <p className="footer_brand">© {new Date().getFullYear()} Growlog</p>

        <div className="social_media">
          <a
            href="https://github.com/ton-projet"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Github"
          >
            <FaGithub size={20} />
          </a>
          <a
            href="https://twitter.com/ton-profil"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Twitter"
          >
            <FaTwitter size={20} />
          </a>
          <a
            href="https://instagram.com/ton-profil"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
          >
            <FaInstagram size={20} />
          </a>
        </div>

        <div className="footer_links">
          <Link to="/mentions-legales">Mentions légales</Link>
          <Link to="/cgu">CGU</Link>
        </div>
      </div>
    </footer>
  );
}
