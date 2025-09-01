// src/App.js
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import HeaderBandeau from './components/bandeauHeader';
import Home from './pages/home';
import Connexion from './pages/connexion';
import Inscription from './pages/inscription';
import User from './pages/user';
import MainFooter from './components/mainFooter';

import './App.scss';

export default function App() {
  return (
    <Router>
      <div className="App">
        <HeaderBandeau />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/inscription" element={<Inscription />} />
          <Route path="/user" element={<User />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>

        <MainFooter />
      </div>
    </Router>
  );
}
