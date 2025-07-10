import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; 
import App from './App'; // App.jsを読み込む

// public/index.html の <div id="root"></div> を見つける
const root = ReactDOM.createRoot(document.getElementById('root'));

// Appコンポーネントを描画する
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);