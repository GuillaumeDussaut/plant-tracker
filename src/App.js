// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Home from './pages/home';
import Connexion from './pages/connexion';
import Inscription from './pages/inscription';

import './App.scss';

export default function App() {
  return React.createElement(
    BrowserRouter,
    null,
    React.createElement(
      'div',
      { className: 'App' },
      React.createElement(
        Routes,
        null,
        // Accueil : Home gère déjà "connecté vs non connecté"
        React.createElement(Route, {
          path: '/',
          element: React.createElement(Home),
        }),
        // Pages auth explicites
        React.createElement(Route, {
          path: '/connexion',
          element: React.createElement(Connexion),
        }),
        React.createElement(Route, {
          path: '/inscription',
          element: React.createElement(Inscription),
        }),
        // Fallback → redirige vers /
        React.createElement(Route, {
          path: '*',
          element: React.createElement(Navigate, { to: '/' }),
        })
      )
    )
  );
}

