import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProvider } from './src/context/AppContext';
import Layout from './src/components/Layout';
import './index.css';
import './src/styles/design-system.css';
import './src/styles/colors.css';

function App() {
  return (
    <AppProvider>
      <Layout />
    </AppProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
