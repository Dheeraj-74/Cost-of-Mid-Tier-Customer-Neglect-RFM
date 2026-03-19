import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Segments from './pages/Segments';
import Risk from './pages/Risk';
import Trends from './pages/Trends';
import Retention from './pages/Retention';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="segments" element={<Segments />} />
          <Route path="risk" element={<Risk />} />
          <Route path="trends" element={<Trends />} />
          <Route path="retention" element={<Retention />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
