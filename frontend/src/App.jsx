import React from 'react';
import {BrowserRouter as Router ,Route,Routes} from 'react-router-dom';
import './App.css'
import GitHubChatbot from './components/GitHubChatbot';
function App() {

  return (
  <Router>
    <Routes>
      <Route path="/" element={<GitHubChatbot />}/>
    </Routes>
  </Router>
  );
}

export default App
