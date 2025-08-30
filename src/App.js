// src/App.js
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Home from './pages/home';
import Connexion from './pages/connexion';
import Inscription from './pages/inscription';
import User from './pages/user';

import './App.scss';

export default function App() {
  return React.createElement(
    Router,
    null,
    React.createElement(
      'div',
      { className: 'App' },
      React.createElement(
        Routes,
        null,
        React.createElement(Route, { path: '/', element: React.createElement(Home) }),
        React.createElement(Route, { path: '/connexion', element: React.createElement(Connexion) }),
        React.createElement(Route, { path: '/inscription', element: React.createElement(Inscription) }),
        React.createElement(Route, { path: '/user', element: React.createElement(User) }),
        React.createElement(Route, { path: '*', element: React.createElement(Navigate, { to: '/' }) })
      )
    )
  );
}
